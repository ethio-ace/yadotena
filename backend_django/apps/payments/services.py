
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import NotFound, ValidationError

from apps.core.ably_utils import publish_event
from apps.orders.models import ItemStatus, Order, OrderStatus, PaymentStatus
from apps.orders.services import _money, _sync_table_for_order, balance_due, sync_payment_status
from .models import Payment, PaymentMethod

# Unpaid tickets that are finished on the floor close as soon as they are paid.
AUTO_COMPLETE_ON_PAYMENT = {OrderStatus.SERVED, OrderStatus.DRAFT}


def resolve_method(value):
    """Match a payment method by id or code (case-insensitive)."""
    if not value:
        return None
    return PaymentMethod.objects.filter(Q(id=value) | Q(code__iexact=value)).first()


@transaction.atomic
def record_payment(*, order_id, method='CASH', amount=None,
                   transaction_ref=None, receipt_url=None, notes='', recorded_by=None):
    """Settle an order. Returns ``(payment, created)``.

    Always records money *in* (PAID). Refunds go through
    ``orders.services.record_refund`` (manager only, with a reason).

    - The order row is locked so two terminals cannot settle it twice.
    - The amount is server-authoritative: exactly the balance still due
      (the whole total, or only the new rounds on a ticket paid earlier).
    - Settling an already-paid order returns the existing payment.
    """
    status = PaymentStatus.PAID

    order = Order.objects.select_for_update().select_related('table').filter(id=order_id).first()
    if order is None:
        raise NotFound('Order not found for payment settlement')

    if order.payment_status == PaymentStatus.PAID:
        existing = order.payments.filter(status=PaymentStatus.PAID).order_by('-created_at').first()
        if existing:
            return existing, False

    if amount not in (None, ''):
        try:
            _money(amount)
        except Exception:
            raise ValidationError({'amount': 'A valid amount is required.'})
    amount = balance_due(order)
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

    sync_payment_status(order)
    fields = ['updated_at']
    # Close on payment only when nothing is left to do: a guest round still
    # awaiting approval (DRAFT items) or food still in the kitchen keeps the
    # ticket open on the table.
    open_work = order.items.filter(status__in=[ItemStatus.DRAFT, ItemStatus.PENDING,
                                               ItemStatus.PREPARING, ItemStatus.READY]).exists()
    if status == PaymentStatus.PAID and order.status in AUTO_COMPLETE_ON_PAYMENT and not open_work:
        order.status = OrderStatus.COMPLETED
        fields.append('status')
    order.save(update_fields=fields)

    if order.status == OrderStatus.COMPLETED:
        _sync_table_for_order(order)  # frees the table and closes its dining session

    publish_event('yadotena-realtime', 'order.updated', {
        'id': order.id, 'status': order.status, 'paymentStatus': order.payment_status,
        'table_id': str(order.table_id) if order.table_id else None,
    })
    return payment, True
