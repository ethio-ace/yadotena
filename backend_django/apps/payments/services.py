from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.core.ably_utils import publish_event
from apps.orders.models import ItemStatus, Order, OrderStatus, PaymentStatus
from apps.orders.services import _money, _sync_table_for_order
from .models import Payment, PaymentMethod

# Unpaid tickets that are finished on the floor close as soon as they are paid.
AUTO_COMPLETE_ON_PAYMENT = {OrderStatus.SERVED, OrderStatus.DRAFT}


def resolve_method(value):
    """Match a payment method by id or code (case-insensitive)."""
    if not value:
        return None
    return PaymentMethod.objects.filter(Q(id=value) | Q(code__iexact=value)).first()


@transaction.atomic
def record_payment(*, order_id, method='CASH', amount=None, status=PaymentStatus.PAID,
                   transaction_ref=None, receipt_url=None, notes='', recorded_by=None):
    """Settle an order. Returns ``(payment, created)``.

    - The order row is locked so two terminals cannot settle it twice.
    - The amount is server-authoritative: never less than the order total.
    - Settling an already-paid order returns the existing payment.
    """
    status = (status or PaymentStatus.PAID).upper()
    if status not in PaymentStatus.values:
        raise ValidationError({'status': f'Must be one of {", ".join(PaymentStatus.values)}.'})

    order = Order.objects.select_for_update().select_related('table').filter(id=order_id).first()
    if order is None:
        raise NotFound('Order not found for payment settlement')

    if order.payment_status == PaymentStatus.PAID:
        existing = order.payments.filter(status=PaymentStatus.PAID).order_by('-created_at').first()
        if existing:
            return existing, False

    try:
        amount = _money(amount) if amount not in (None, '') else Decimal('0')
    except Exception:
        raise ValidationError({'amount': 'A valid amount is required.'})
    amount = max(amount, _money(order.total))
    if amount <= 0:
        raise ValidationError({'amount': 'Order has no payable total.'})

    method_obj = resolve_method(method)
    if method and method_obj is None:
        raise ValidationError({'method': f'Unknown payment method "{method}".'})
    if method_obj is not None and not method_obj.is_active:
        raise ValidationError({'method': f'{method_obj.name} is not accepting payments.'})

    payment = Payment.objects.create(
        order=order,
        method=method_obj.code if method_obj else 'CASH',
        payment_method=method_obj,
        amount=amount,
        status=status,
        transaction_ref=transaction_ref or None,
        receipt_url=receipt_url or None,
        notes=notes or '',
        recorded_by=recorded_by if getattr(recorded_by, 'is_authenticated', False) else None,
    )

    order.payment_status = status
    fields = ['payment_status', 'updated_at']
    # Close on payment only when nothing is left to do: a guest round still
    # awaiting approval (DRAFT items) or food still in the kitchen keeps the
    # ticket open on the table.
    open_work = order.items.filter(status__in=[ItemStatus.DRAFT, ItemStatus.PENDING,
                                               ItemStatus.PREPARING, ItemStatus.READY]).exists()
    if status == PaymentStatus.PAID and order.status in AUTO_COMPLETE_ON_PAYMENT and not open_work:
        order.status = OrderStatus.COMPLETED
        fields.append('status')
    order.save(update_fields=fields)

    if order.status == OrderStatus.COMPLETED and order.table_id:
        _sync_table_for_order(order)
        order.table.sessions.filter(status='ACTIVE').update(status='CLOSED', closed_at=timezone.now())
        publish_event('yadotena-realtime', 'table.updated', {'id': str(order.table_id), 'status': order.table.status})

    publish_event('yadotena-realtime', 'order.updated', {
        'id': order.id, 'status': order.status, 'paymentStatus': order.payment_status,
        'table_id': str(order.table_id) if order.table_id else None,
    })
    return payment, True
