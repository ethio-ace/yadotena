from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from apps.core.ably_utils import publish_event
from apps.core.models import RestaurantSetting
from apps.core.permissions import is_manager_user
from apps.menu.models import MenuItem, MenuItemAddon
from apps.tables.models import Table
from .models import ItemStatus, Order, OrderItem, OrderStatus, OrderType, PaymentStatus

# A table's "open" ticket: anything not commercially closed. A SERVED but
# unpaid ticket still belongs to the table, so new rounds join it.
OPEN_ORDER_STATUSES = {
    OrderStatus.DRAFT,
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.SERVED,
}
TERMINAL_ORDER_STATUSES = {OrderStatus.COMPLETED, OrderStatus.CANCELLED}


class Conflict(APIException):
    status_code = 409
    default_detail = 'The order is not in a state that allows this change.'
    default_code = 'conflict'


# Kitchen actions on items: action -> (allowed current statuses, new status).
KITCHEN_ACTIONS = {
    'START': ({ItemStatus.PENDING}, ItemStatus.PREPARING),
    'READY': ({ItemStatus.PREPARING}, ItemStatus.READY),
    'SERVE': ({ItemStatus.READY}, ItemStatus.SERVED),
    'CANCEL': ({ItemStatus.PENDING, ItemStatus.PREPARING}, ItemStatus.CANCELLED),
    # Manager-only: take a cooked or served line off the bill (wrong dish,
    # complaint, comp). Needs a reason; shows in the day-close void list.
    'VOID': ({ItemStatus.PENDING, ItemStatus.PREPARING, ItemStatus.READY, ItemStatus.SERVED}, ItemStatus.CANCELLED),
    # Waiter review of a guest-placed round.
    'APPROVE': ({ItemStatus.DRAFT}, ItemStatus.PENDING),
    'REJECT': ({ItemStatus.DRAFT}, ItemStatus.CANCELLED),
}
# Whole-order kitchen intents map onto the same item transitions.
STATUS_TO_KITCHEN_ACTION = {
    OrderStatus.PREPARING: 'START',
    OrderStatus.READY: 'READY',
    OrderStatus.SERVED: 'SERVE',
}

MIN_REASON_LENGTH = 3
# Item states that mean the kitchen has started (or finished) real work.
STARTED_ITEM_STATUSES = {ItemStatus.PREPARING, ItemStatus.READY, ItemStatus.SERVED}
# Per-line cap: stops a fat-fingered "500" (or a hostile guest) from
# flooding the kitchen. Larger catering orders get split into lines.
MAX_ITEM_QUANTITY = 99


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def get_restaurant_settings():
    return RestaurantSetting.get_settings()


def get_open_order_for_table(table: Table):
    if not table:
        return None
    return (
        Order.objects.filter(table=table, status__in=OPEN_ORDER_STATUSES)
        .order_by('-created_at')
        .first()
    )


def _clean_reason(reason) -> str:
    return str(reason or '').strip()[:255]


def _require_reason(reason) -> str:
    reason = _clean_reason(reason)
    if len(reason) < MIN_REASON_LENGTH:
        raise ValidationError({'reason': 'Give a short reason (it goes in the day-close report).'})
    return reason


def consume_stock(items) -> None:
    """Take recipe stock for lines the kitchen has started (once per line).

    Stock may go negative: counts drift, and the kitchen must never be blocked
    from cooking by a stale number. Lines voided later keep their stock taken
    (the food was made: that is waste, not stock coming back).
    """
    from apps.products.models import MenuIngredient, Product

    pending = [i for i in items if not i.stock_deducted and i.status in STARTED_ITEM_STATUSES]
    if not pending:
        return
    recipes = {}
    for ing in MenuIngredient.objects.filter(menu_item_id__in={i.menu_item_id for i in pending if i.menu_item_id}):
        recipes.setdefault(ing.menu_item_id, []).append(ing)
    usage = {}
    for item in pending:
        for ing in recipes.get(item.menu_item_id, []):
            usage[ing.product_id] = usage.get(ing.product_id, Decimal('0')) + ing.quantity * item.quantity
        item.stock_deducted = True
        item.save(update_fields=['stock_deducted'])
    for product in Product.objects.select_for_update().filter(id__in=usage):
        product.stock_quantity = (product.stock_quantity - usage[product.id]).quantize(Decimal('0.01'))
        product.save(update_fields=['stock_quantity', 'updated_at'])


def _apply_item_transition(items_qs, action: str, *, user=None, reason: str = '') -> int:
    """Advance eligible items for ``action``; returns how many changed."""
    allowed_from, new_status = KITCHEN_ACTIONS[action]
    now = timezone.now()
    changed = []
    for item in items_qs.filter(status__in=allowed_from):
        item.status = new_status
        fields = ['status']
        if new_status == ItemStatus.PREPARING and item.started_at is None:
            item.started_at = now
            fields.append('started_at')
        if new_status == ItemStatus.READY:
            item.completed_at = now
            fields.append('completed_at')
        if new_status == ItemStatus.CANCELLED:
            item.cancel_reason = reason or {'REJECT': 'Guest order rejected'}.get(action, '')
            item.cancelled_by = user if getattr(user, 'is_authenticated', False) else None
            item.cancelled_at = now
            fields += ['cancel_reason', 'cancelled_by', 'cancelled_at']
        item.save(update_fields=fields)
        changed.append(item)
    consume_stock(changed)
    return len(changed)


def recompute_order_status(order: Order) -> Order:
    """Derive the order's kitchen status from its items.

    Priority READY > PREPARING > PENDING > SERVED, so a ticket shows the most
    actionable state (food waiting at the pass beats food on the stove).
    Terminal states are never derived here.
    """
    if order.status in TERMINAL_ORDER_STATUSES:
        return order
    statuses = set(order.items.values_list('status', flat=True))
    for candidate in (ItemStatus.READY, ItemStatus.PREPARING, ItemStatus.PENDING, ItemStatus.DRAFT, ItemStatus.SERVED):
        if candidate in statuses:
            new_status = candidate
            break
    else:
        new_status = OrderStatus.PENDING
    if order.status != new_status:
        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])
    return order


def _publish_order_updated(order: Order):
    publish_event('yadotena-realtime', 'order.updated', {
        'id': order.id, 'status': order.status,
        'table_id': str(order.table.id) if order.table else None,
    })


def validate_items_payload(items_data: list):
    if not items_data:
        raise ValidationError('At least one menu item is required.')

    unavailable = []
    validated = []

    for raw in items_data:
        menu_item_id = raw.get('menuItemId') or raw.get('menu_item_id')
        if not menu_item_id:
            raise ValidationError('Each item must include menuItemId.')

        try:
            quantity = int(raw.get('quantity') or 1)
        except (TypeError, ValueError):
            raise ValidationError('Item quantity must be a whole number.')
        if quantity < 1:
            raise ValidationError('Item quantity must be at least 1.')
        if quantity > MAX_ITEM_QUANTITY:
            raise ValidationError(f'Item quantity can be at most {MAX_ITEM_QUANTITY}.')

        menu_item = MenuItem.objects.filter(id=menu_item_id).select_related('category').first()
        if not menu_item:
            raise ValidationError(f'Menu item {menu_item_id} was not found.')

        if not menu_item.available:
            unavailable.append(menu_item.name)

        addon_ids = raw.get('selectedAddons') or raw.get('selected_addons') or []
        addons = []
        addon_total = Decimal('0.00')
        if addon_ids:
            addons_qs = MenuItemAddon.applicable_to(menu_item).filter(id__in=addon_ids)
            addons = list(addons_qs)
            addon_total = sum((addon.price for addon in addons), Decimal('0.00'))

        validated.append({
            'menu_item': menu_item,
            'quantity': quantity,
            'special_instructions': raw.get('specialInstructions') or raw.get('special_instructions') or '',
            'selected_addons': [
                {'id': addon.id, 'name': addon.name, 'price': float(addon.price)}
                for addon in addons
            ],
            'unit_price': _money(menu_item.price + addon_total),
        })

    if unavailable:
        raise ValidationError({
            'unavailable_items': unavailable,
            'detail': f"The following items are unavailable: {', '.join(unavailable)}",
        })

    return validated


def recalculate_order_totals(order: Order):
    settings = get_restaurant_settings()
    subtotal = Decimal('0.00')

    # Cancelled lines (kitchen-cancelled or a rejected guest round) are not billed.
    for item in order.items.exclude(status=ItemStatus.CANCELLED):
        subtotal += _money(item.price) * item.quantity

    tax = Decimal('0.00')
    service_charge = Decimal('0.00')
    delivery_fee = Decimal('0.00')

    if subtotal > 0:
        tax = _money(subtotal * Decimal(str(settings.vat_percent)) / Decimal('100'))

    if order.type == OrderType.DINE_IN and subtotal > 0:
        service_charge = _money(subtotal * Decimal(str(settings.service_charge_percent)) / Decimal('100'))

    if order.type == OrderType.DELIVERY and subtotal > 0:
        delivery_fee = _money(settings.delivery_fee)

    order.subtotal = subtotal
    order.tax = tax
    order.service_charge = service_charge
    order.delivery_fee = delivery_fee
    order.total = _money(subtotal + tax + service_charge + delivery_fee)
    order.save(
        update_fields=[
            'subtotal', 'tax', 'service_charge', 'delivery_fee', 'total', 'updated_at'
        ]
    )
    return order


def amount_paid(order: Order) -> Decimal:
    """Money the ticket currently holds: PAID records minus REFUNDED records.

    A refund is its own Payment row (status REFUNDED, positive amount), so
    the original payment stays in the books and the refund is visible."""
    total = Decimal('0.00')
    for p in order.payments.all():
        if p.status == PaymentStatus.PAID:
            total += p.amount
        elif p.status == PaymentStatus.REFUNDED:
            total -= p.amount
    return total


def balance_due(order: Order) -> Decimal:
    return max(_money(order.total) - amount_paid(order), Decimal('0.00'))


def sync_payment_status(order: Order) -> Order:
    """Derive payment_status from the money actually on the ticket."""
    paid = amount_paid(order)
    has_refund = order.payments.filter(status=PaymentStatus.REFUNDED).exists()
    if order.total > 0 and paid >= order.total:
        new_status = PaymentStatus.PAID
    elif has_refund and paid <= 0:
        new_status = PaymentStatus.REFUNDED
    else:
        new_status = PaymentStatus.PENDING
    if order.payment_status != new_status:
        order.payment_status = new_status
        order.save(update_fields=['payment_status', 'updated_at'])
    return order


def record_refund(order: Order, amount, *, user, reason: str, method: Optional[str] = None):
    """Give money back on a ticket. Never more than the ticket holds."""
    from apps.payments.models import Payment

    amount = _money(amount)
    held = amount_paid(order)
    if amount <= 0:
        raise ValidationError({'amount': 'Refund amount must be more than 0.'})
    if amount > held:
        raise ValidationError({'amount': f'Only {held} ETB was paid on this ticket.'})
    last_paid = order.payments.filter(status=PaymentStatus.PAID).order_by('-created_at').first()
    refund = Payment.objects.create(
        order=order,
        method=method or (last_paid.method if last_paid else 'CASH'),
        payment_method=last_paid.payment_method if last_paid and not method else None,
        amount=amount,
        status=PaymentStatus.REFUNDED,
        notes=reason,
        recorded_by=user if getattr(user, 'is_authenticated', False) else None,
    )
    sync_payment_status(order)
    return refund


def _refund_overpayment(order: Order, *, user, reason: str):
    """After lines come off a paid bill, hand back whatever is now overpaid."""
    excess = amount_paid(order) - _money(order.total)
    if excess > 0:
        record_refund(order, excess, user=user, reason=reason or 'Items removed from a paid bill')
    else:
        sync_payment_status(order)


def _settle_lifecycle(order: Order) -> Order:
    """Close a ticket once nothing is left to do on it.

    - Every line cancelled (kitchen cancel or rejected guest order) -> CANCELLED.
    - Paid and every live line served -> COMPLETED.
    Either way the table frees up instead of holding a dead ticket.
    """
    if order.status in TERMINAL_ORDER_STATUSES:
        return order
    live = order.items.exclude(status=ItemStatus.CANCELLED)
    if not live.exists():
        order.status = OrderStatus.CANCELLED
    elif order.payment_status == PaymentStatus.PAID and not live.exclude(status=ItemStatus.SERVED).exists():
        order.status = OrderStatus.COMPLETED
    else:
        return order
    order.save(update_fields=['status', 'updated_at'])
    return order


def _next_round_number(order: Order) -> int:
    current_max = order.items.order_by('-round_number').values_list('round_number', flat=True).first()
    return (current_max or 0) + 1


def _create_order_items(order: Order, validated_items: list, round_number: int = 1,
                        item_status: str = ItemStatus.PENDING):
    for item_data in validated_items:
        OrderItem.objects.create(
            order=order,
            menu_item=item_data['menu_item'],
            name=item_data['menu_item'].name,
            price=item_data['unit_price'],
            quantity=item_data['quantity'],
            special_instructions=item_data['special_instructions'],
            selected_addons=item_data['selected_addons'],
            round_number=round_number,
            status=item_status,
        )


def _assign_ticket_number(order: Order) -> None:
    """Give the ticket the next short number for today's cafe day."""
    today = timezone.localdate()
    for _ in range(5):
        last = Order.objects.filter(business_date=today).aggregate(m=Max('daily_number'))['m'] or 0
        try:
            with transaction.atomic():
                Order.objects.filter(pk=order.pk).update(business_date=today, daily_number=last + 1)
        except IntegrityError:
            continue  # another terminal took that number a moment ago
        order.business_date, order.daily_number = today, last + 1
        return


def _sync_table_for_order(order: Order, *, creating: bool = False):
    if not order.table:
        return

    table = order.table
    if creating:
        table.status = 'PREPARING'
        table.current_order_id = order.id
        table.save(update_fields=['status', 'current_order_id', 'updated_at'])
        return

    if order.status == OrderStatus.PREPARING:
        table.status = 'PREPARING'
    elif order.status == OrderStatus.READY:
        table.status = 'WAITING_FOR_SERVICE'
    elif order.status in TERMINAL_ORDER_STATUSES:
        table.status = 'AVAILABLE'
        table.current_order_id = None
        table.sessions.filter(status='ACTIVE').update(status='CLOSED', closed_at=timezone.now())
    table.save(update_fields=['status', 'current_order_id', 'updated_at'])
    if order.status in TERMINAL_ORDER_STATUSES:
        publish_event('yadotena-realtime', 'table.updated', {'id': str(table.id), 'status': table.status})


@transaction.atomic
def create_order(validated_data: dict, items_data: list, *, idempotency_key: Optional[str] = None,
                 guest: bool = False, skip_kitchen: bool = False, user=None):
    """Create an order, or append to the table's open ticket for dine-in.

    ``guest`` orders come from the public menu: their items start as DRAFT
    (hidden from the kitchen) until a waiter approves the round.
    ``skip_kitchen`` (staff only) is a counter/shop sale: the goods are
    handed over on the spot, so items start SERVED and the ticket closes as
    soon as it is paid.
    """
    if guest:
        item_status = ItemStatus.DRAFT
    elif skip_kitchen:
        item_status = ItemStatus.SERVED
    else:
        item_status = ItemStatus.PENDING
    if idempotency_key:
        existing = Order.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

    validated_items = validate_items_payload(items_data)
    table_id = validated_data.pop('table_id', None)
    table = Table.objects.filter(id=table_id).first() if table_id else None
    order_type = validated_data.get('type', OrderType.DINE_IN)

    if order_type == OrderType.DINE_IN and table:
        open_order = get_open_order_for_table(table)
        if open_order:
            return add_items_to_order(open_order, items_data, item_status=item_status)

    # Money is only ever marked paid by recording a payment.
    validated_data.pop('payment_status', None)
    validated_data.pop('status', None)
    validated_data['status'] = {
        ItemStatus.DRAFT: OrderStatus.DRAFT,
        ItemStatus.SERVED: OrderStatus.SERVED,
    }.get(item_status, OrderStatus.PENDING)
    order = Order.objects.create(
        table=table,
        payment_status=PaymentStatus.PENDING,
        idempotency_key=idempotency_key or None,
        created_by=user if (not guest and getattr(user, 'is_authenticated', False)) else None,
        **validated_data,
    )
    _assign_ticket_number(order)

    _create_order_items(order, validated_items, round_number=1, item_status=item_status)
    if item_status == ItemStatus.SERVED:
        consume_stock(list(order.items.all()))
    recalculate_order_totals(order)
    _sync_table_for_order(order, creating=True)
    
    publish_event('yadotena-realtime', 'order.created', {'id': order.id, 'status': order.status, 'table_id': str(table.id) if table else None})
    
    return order


@transaction.atomic
def add_items_to_order(order: Order, items_data: list, *, item_status: str = ItemStatus.PENDING):
    if order.status in {OrderStatus.COMPLETED, OrderStatus.CANCELLED}:
        raise ValidationError('Cannot add items to a closed order.')

    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status in TERMINAL_ORDER_STATUSES:
        raise ValidationError('Cannot add items to a closed order.')

    validated_items = validate_items_payload(items_data)
    round_number = _next_round_number(order)

    _create_order_items(order, validated_items, round_number=round_number, item_status=item_status)
    recalculate_order_totals(order)
    # The table paid earlier and kept ordering: the new round is owed.
    if order.payment_status == PaymentStatus.PAID:
        sync_payment_status(order)
    recompute_order_status(order)
    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def kitchen_action(order: Order, action: str, *, round_number: int = 0, item_ids=None,
                   user=None, reason: str = '') -> Order:
    """Advance one round (or specific items) through the kitchen lifecycle
    without touching other rounds: START, READY, SERVE, CANCEL, VOID,
    APPROVE, REJECT."""
    action = (action or '').upper()
    if action not in KITCHEN_ACTIONS:
        raise ValidationError('action must be one of ' + ', '.join(KITCHEN_ACTIONS))
    if action == 'VOID':
        if not is_manager_user(user):
            raise PermissionDenied('Only a manager can void cooked or served items.')
        reason = _require_reason(reason)
    else:
        reason = _clean_reason(reason)

    order = Order.objects.select_for_update().get(pk=order.pk)
    # COMPLETED is deliberately allowed: a paid ticket can still carry a fresh
    # round to cook. The per-item status guard is the real check.
    if order.status == OrderStatus.CANCELLED:
        raise Conflict('Cannot update kitchen state on a cancelled order')

    items = order.items.all()
    if round_number:
        items = items.filter(round_number=round_number)
    if item_ids:
        items = items.filter(id__in=item_ids)

    if not _apply_item_transition(items, action, user=user, reason=reason):
        raise Conflict(f'No items in this round are eligible for {action}')

    if action == 'APPROVE' and order.created_by_id is None and getattr(user, 'is_authenticated', False):
        # A guest ticket belongs to the waiter who approved it.
        order.created_by = user
        order.save(update_fields=['created_by', 'updated_at'])
    if action in ('REJECT', 'CANCEL', 'VOID'):
        # Cancelled lines are not billed; money over the new total goes back.
        recalculate_order_totals(order)
        _refund_overpayment(order, user=user, reason=reason)
    recompute_order_status(order)
    _settle_lifecycle(order)
    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def update_order_status(order: Order, new_status: str, *, user=None, reason: str = ''):
    """Whole-order status change.

    Kitchen states (PREPARING/READY/SERVED) become item transitions and the
    order status is re-derived, so this can never re-open a started round.
    COMPLETED needs settled payment and no food still cooking.
    """
    new_status = (new_status or '').upper()
    order = Order.objects.select_for_update().get(pk=order.pk)

    if order.status in TERMINAL_ORDER_STATUSES:
        if order.status == new_status:
            return order
        raise Conflict(f'Order is {order.status} and can no longer change status')

    if new_status in STATUS_TO_KITCHEN_ACTION:
        _apply_item_transition(order.items.all(), STATUS_TO_KITCHEN_ACTION[new_status])
        recompute_order_status(order)
        # A settled ticket that just served its last work closes itself, so
        # it does not linger as SERVED+PAID and block the table.
        _settle_lifecycle(order)
    elif new_status == OrderStatus.COMPLETED:
        if order.payment_status != PaymentStatus.PAID:
            raise Conflict('Cannot complete an order when payment is UNPAID. Settle payment first.')
        if order.items.filter(status=ItemStatus.DRAFT).exists():
            raise Conflict('Approve or reject the guest\'s items before closing the order')
        if order.items.filter(status__in=[ItemStatus.PENDING, ItemStatus.PREPARING]).exists():
            raise Conflict('Cannot complete the order while kitchen work is still in progress')
        order.items.filter(status=ItemStatus.READY).update(status=ItemStatus.SERVED)
        order.status = OrderStatus.COMPLETED
        order.save(update_fields=['status', 'updated_at'])
    elif new_status == OrderStatus.CANCELLED:
        return cancel_order(order, user=user, reason=reason)
    else:
        raise ValidationError('invalid status')

    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def cancel_order(order: Order, *, user, reason: str) -> Order:
    """Cancel a whole ticket, with a reason.

    Floor staff may cancel only a ticket the kitchen has not started and that
    holds no money (a mistake caught in time). Anything cooked, served or paid
    needs a manager — that is the "serve, pocket the cash, cancel" gap. Money
    on the ticket is refunded and recorded against the manager.
    """
    reason = _require_reason(reason)
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status == OrderStatus.CANCELLED:
        return order
    if order.status == OrderStatus.COMPLETED and not is_manager_user(user):
        raise PermissionDenied('Only a manager can cancel a closed ticket.')
    started = order.items.filter(status__in=STARTED_ITEM_STATUSES).exists()
    holds_money = amount_paid(order) > 0
    if (started or holds_money) and not is_manager_user(user):
        raise PermissionDenied('This ticket has cooked/served food or a payment. Ask a manager to cancel it.')

    _apply_item_transition(order.items.exclude(status=ItemStatus.CANCELLED), 'VOID', user=user, reason=reason)
    order.items.filter(status=ItemStatus.DRAFT).update(
        status=ItemStatus.CANCELLED, cancel_reason=reason, cancelled_at=timezone.now(),
        cancelled_by=user if getattr(user, 'is_authenticated', False) else None)
    recalculate_order_totals(order)
    held = amount_paid(order)
    if held > 0:
        record_refund(order, held, user=user, reason=f'Ticket cancelled: {reason}')
    order.status = OrderStatus.CANCELLED
    order.cancel_reason = reason
    order.cancelled_by = user if getattr(user, 'is_authenticated', False) else None
    order.cancelled_at = timezone.now()
    order.save(update_fields=['status', 'cancel_reason', 'cancelled_by', 'cancelled_at', 'updated_at'])
    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def move_order(order: Order, target_table: Table, *, user=None) -> Order:
    """Move a dine-in ticket to another table.

    Free target: the ticket just changes table. Busy target: the ticket is
    merged into the target's open ticket (its rounds follow on after the
    target's, payments move with it) and this ticket closes as merged.
    Returns the ticket that now holds the food.
    """
    order = Order.objects.select_for_update().select_related('table').get(pk=order.pk)
    if order.status in TERMINAL_ORDER_STATUSES:
        raise Conflict('Only an open ticket can be moved.')
    if order.type != OrderType.DINE_IN:
        raise ValidationError('Only dine-in tickets sit at a table.')
    source_table = order.table
    if source_table and source_table.pk == target_table.pk:
        raise ValidationError({'tableId': 'The ticket is already at that table.'})

    target = get_open_order_for_table(target_table)
    if target is None:
        order.table = target_table
        order.save(update_fields=['table', 'updated_at'])
        _sync_table_for_order(order, creating=True)
        if source_table:
            _free_table(source_table)
        _publish_order_updated(order)
        return order

    target = Order.objects.select_for_update().get(pk=target.pk)
    offset = (target.items.aggregate(m=Max('round_number'))['m'] or 0)
    for item in order.items.all():
        item.order = target
        item.round_number = item.round_number + offset
        item.save(update_fields=['order', 'round_number'])
    order.payments.update(order=target)
    recalculate_order_totals(target)
    sync_payment_status(target)
    recompute_order_status(target)

    recalculate_order_totals(order)
    order.status = OrderStatus.CANCELLED
    order.merged_into = target
    order.cancel_reason = f'Moved to {target_table.name}'
    order.cancelled_by = user if getattr(user, 'is_authenticated', False) else None
    order.cancelled_at = timezone.now()
    order.save(update_fields=['status', 'merged_into', 'cancel_reason', 'cancelled_by', 'cancelled_at', 'updated_at'])
    if source_table:
        _free_table(source_table)
    _sync_table_for_order(target)
    _publish_order_updated(order)
    _publish_order_updated(target)
    return target


def _free_table(table: Table) -> None:
    """Free a table that no longer has an open ticket."""
    if get_open_order_for_table(table):
        return
    table.status = 'AVAILABLE'
    table.current_order_id = None
    table.save(update_fields=['status', 'current_order_id', 'updated_at'])
    table.sessions.filter(status='ACTIVE').update(status='CLOSED', closed_at=timezone.now())
    publish_event('yadotena-realtime', 'table.updated', {'id': str(table.id), 'status': table.status})
