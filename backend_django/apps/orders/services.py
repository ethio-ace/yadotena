from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.core.ably_utils import publish_event
from apps.core.models import RestaurantSetting
from apps.menu.models import MenuItem, MenuItemAddon
from apps.tables.models import Table
from .models import Order, OrderItem, OrderStatus, OrderType, PaymentStatus

OPEN_ORDER_STATUSES = {
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
}

ALLOWED_STATUS_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.COMPLETED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
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


def validate_status_transition(current_status: str, new_status: str):
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition order from {current_status} to {new_status}."
        )


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
            addons_qs = MenuItemAddon.objects.filter(menu_item=menu_item, id__in=addon_ids)
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

    for item in order.items.all():
        subtotal += _money(item.price) * item.quantity

    tax = Decimal('0.00')
    service_charge = Decimal('0.00')
    delivery_fee = Decimal('0.00')

    if subtotal > 0:
        tax = _money(subtotal * settings.vat_percent / Decimal('100'))

    if order.type == OrderType.DINE_IN and subtotal > 0:
        service_charge = _money(subtotal * settings.service_charge_percent / Decimal('100'))

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


def _create_order_items(order: Order, validated_items: list, round_number: int = 1):
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
def create_order(validated_data: dict, items_data: list, *, idempotency_key: str | None = None):
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
            return add_items_to_order(open_order, items_data)

    payment_status = validated_data.pop('payment_status', PaymentStatus.PENDING)
    order = Order.objects.create(
        table=table,
        payment_status=payment_status,
        idempotency_key=idempotency_key or None,
        **validated_data,
    )

    _create_order_items(order, validated_items, round_number=1)
    recalculate_order_totals(order)
    _sync_table_for_order(order, creating=True)
    
    publish_event('yadotena-realtime', 'order.created', {'id': order.id, 'status': order.status, 'table_id': str(table.id) if table else None})
    
    return order


@transaction.atomic
def add_items_to_order(order: Order, items_data: list):
    if order.status in {OrderStatus.COMPLETED, OrderStatus.CANCELLED}:
        raise ValidationError('Cannot add items to a closed order.')

    validated_items = validate_items_payload(items_data)
    round_number = _next_round_number(order)

    if order.status in {OrderStatus.PREPARING, OrderStatus.READY}:
        order.status = OrderStatus.PENDING
        order.save(update_fields=['status', 'updated_at'])

    _create_order_items(order, validated_items, round_number=round_number)
    recalculate_order_totals(order)
    _sync_table_for_order(order)
    
    publish_event('yadotena-realtime', 'order.updated', {'id': order.id, 'status': order.status, 'table_id': str(order.table.id) if order.table else None})
    
    return order


@transaction.atomic
def update_order_status(order: Order, new_status: str):
    validate_status_transition(order.status, new_status)
    order.status = new_status
    order.save(update_fields=['status', 'updated_at'])
    _sync_table_for_order(order)
    
    publish_event('yadotena-realtime', 'order.updated', {'id': order.id, 'status': order.status, 'table_id': str(order.table.id) if order.table else None})
    
    return order
