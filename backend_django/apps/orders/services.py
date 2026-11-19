from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError
from apps.core.ably_utils import publish_event
from apps.core.models import RestaurantSetting
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

DELIVERY_FEE = Decimal('100.00')


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


def _apply_item_transition(items_qs, action: str) -> int:
    """Advance eligible items for ``action``; returns how many changed."""
    allowed_from, new_status = KITCHEN_ACTIONS[action]
    now = timezone.now()
    changed = 0
    for item in items_qs.filter(status__in=allowed_from):
        item.status = new_status
        fields = ['status']
        if new_status == ItemStatus.PREPARING and item.started_at is None:
            item.started_at = now
            fields.append('started_at')
        if new_status == ItemStatus.READY:
            item.completed_at = now
            fields.append('completed_at')
        item.save(update_fields=fields)
        changed += 1
    return changed


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

        quantity = int(raw.get('quantity') or 1)
        if quantity < 1:
            raise ValidationError('Item quantity must be at least 1.')

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

    if order.type == OrderType.DELIVERY:
        delivery_fee = DELIVERY_FEE

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
    elif order.status in {OrderStatus.COMPLETED, OrderStatus.CANCELLED}:
        table.status = 'AVAILABLE'
        table.current_order_id = None
    table.save(update_fields=['status', 'current_order_id', 'updated_at'])


@transaction.atomic
def create_order(validated_data: dict, items_data: list, *, idempotency_key: Optional[str] = None,
                 guest: bool = False):
    """Create an order, or append to the table's open ticket for dine-in.

    ``guest`` orders come from the public menu: their items start as DRAFT
    (hidden from the kitchen) until a waiter approves the round.
    """
    item_status = ItemStatus.DRAFT if guest else ItemStatus.PENDING
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

    payment_status = validated_data.pop('payment_status', PaymentStatus.PENDING)
    if guest:
        validated_data['status'] = OrderStatus.DRAFT
    order = Order.objects.create(
        table=table,
        payment_status=payment_status,
        idempotency_key=idempotency_key or None,
        **validated_data,
    )

    _create_order_items(order, validated_items, round_number=1, item_status=item_status)
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
    recompute_order_status(order)
    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def kitchen_action(order: Order, action: str, *, round_number: int = 0, item_ids=None) -> Order:
    """Advance one round (or specific items) through the kitchen lifecycle
    without touching other rounds: START, READY, SERVE, CANCEL."""
    action = (action or '').upper()
    if action not in KITCHEN_ACTIONS:
        raise ValidationError('action must be one of START, READY, SERVE, CANCEL')

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

    if not _apply_item_transition(items, action):
        raise Conflict(f'No items in this round are eligible for {action}')

    if action == 'REJECT':
        recalculate_order_totals(order)
        if not order.items.exclude(status=ItemStatus.CANCELLED).exists():
            # The whole ticket was a rejected guest order: close it so the
            # table frees up instead of holding an empty order.
            order.status = OrderStatus.CANCELLED
            order.save(update_fields=['status', 'updated_at'])
    recompute_order_status(order)
    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order


@transaction.atomic
def update_order_status(order: Order, new_status: str):
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
        if new_status == OrderStatus.SERVED and order.payment_status == PaymentStatus.PAID:
            if not order.items.exclude(status__in=[ItemStatus.SERVED, ItemStatus.CANCELLED]).exists():
                order.status = OrderStatus.COMPLETED
                order.save(update_fields=['status', 'updated_at'])
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
        order.items.filter(status__in=[ItemStatus.DRAFT, ItemStatus.PENDING, ItemStatus.PREPARING, ItemStatus.READY]).update(status=ItemStatus.CANCELLED)
        order.status = OrderStatus.CANCELLED
        order.save(update_fields=['status', 'updated_at'])
    else:
        raise ValidationError('invalid status')

    _sync_table_for_order(order)
    _publish_order_updated(order)
    return order
