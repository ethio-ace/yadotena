"""End-of-day close (Z-report) for one cafe day.

``GET  /reports/day-close?date=YYYY-MM-DD`` — the live report.
``POST /reports/day-close`` ``{date, countedCash, notes}`` — save the cash count
(re-closing a day updates it). Manager/owner only.

Money is counted from payment records by the time the money moved (cash
basis), so it matches the drawer: a refund is subtracted on the day it was
given back, a ticket opened yesterday and paid today counts today.
"""
from datetime import datetime, time, timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.expenses.models import Expense
from apps.orders.models import ItemStatus, Order, OrderItem, OrderStatus
from apps.orders.services import TERMINAL_ORDER_STATUSES, balance_due
from apps.payments.models import Payment, PaymentMethodType
from apps.products.models import Product
from .activity import log_activity
from .models import DayClose
from .permissions import IsManager

ZERO = Decimal('0.00')


def _day_bounds(day):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), tz)
    return start, start + timedelta(days=1)


def _name(user):
    return (user.name or user.email) if user else 'Unknown'


def _is_cash(payment):
    if payment.payment_method_id:
        return payment.payment_method.type == PaymentMethodType.CASH
    return (payment.method or '').upper() == 'CASH'


def _f(value):
    return float(value or 0)


def _ticket(order):
    return f'#{order.daily_number}' if order.daily_number else order.id[-6:]


def build_day_report(day):
    start, end = _day_bounds(day)

    payments = list(
        Payment.objects.filter(created_at__gte=start, created_at__lt=end)
        .select_related('payment_method', 'recorded_by', 'order', 'order__table')
        .order_by('created_at')
    )
    by_method, by_staff = {}, {}
    collected = refunded = cash_in = cash_refunds = ZERO
    refunds = []
    for p in payments:
        sign = 1 if p.status == 'PAID' else -1 if p.status == 'REFUNDED' else 0
        if not sign:
            continue
        label = p.payment_method.name if p.payment_method_id else (p.method or 'CASH')
        m = by_method.setdefault(label, {'method': label, 'collected': ZERO, 'refunded': ZERO, 'count': 0,
                                         'isCash': _is_cash(p)})
        s = by_staff.setdefault(p.recorded_by_id or 'none', {
            'userId': p.recorded_by_id, 'name': _name(p.recorded_by), 'collected': ZERO,
            'refunded': ZERO, 'cash': ZERO, 'count': 0})
        if sign > 0:
            collected += p.amount
            m['collected'] += p.amount
            m['count'] += 1
            s['collected'] += p.amount
            s['count'] += 1
            if _is_cash(p):
                cash_in += p.amount
                s['cash'] += p.amount
        else:
            refunded += p.amount
            m['refunded'] += p.amount
            s['refunded'] += p.amount
            if _is_cash(p):
                cash_refunds += p.amount
                s['cash'] -= p.amount
            refunds.append({
                'orderId': p.order_id, 'ticket': _ticket(p.order), 'amount': _f(p.amount),
                'method': label, 'reason': p.notes, 'by': _name(p.recorded_by),
                'at': p.created_at,
            })

    expenses = Expense.objects.filter(date=day)
    # Paid from the drawer: "Cash", "Register Cash Drawer", …
    cash_expenses = sum((e.amount for e in expenses if 'cash' in (e.payment_method or '').lower()), ZERO)
    expected_cash = cash_in - cash_refunds - cash_expenses

    # Tickets of the day (by cafe day; legacy orders without one by created_at).
    day_orders = Order.objects.filter(
        Q(business_date=day) | Q(business_date__isnull=True, created_at__gte=start, created_at__lt=end)
    ).select_related('created_by')
    sold = [o for o in day_orders if o.status != OrderStatus.CANCELLED]
    by_waiter = {}
    for o in sold:
        w = by_waiter.setdefault(o.created_by_id or 'guest', {
            'userId': o.created_by_id, 'name': _name(o.created_by) if o.created_by else 'Not assigned',
            'orders': 0, 'sales': ZERO})
        w['orders'] += 1
        w['sales'] += o.total

    cancelled_tickets = [
        {'orderId': o.id, 'ticket': _ticket(o), 'reason': o.cancel_reason, 'by': _name(o.cancelled_by),
         'at': o.cancelled_at}
        for o in Order.objects.filter(status=OrderStatus.CANCELLED, merged_into__isnull=True,
                                      cancelled_at__gte=start, cancelled_at__lt=end).select_related('cancelled_by')
    ]

    voids = []
    void_value = ZERO
    for item in (OrderItem.objects.filter(status=ItemStatus.CANCELLED, cancelled_at__gte=start, cancelled_at__lt=end)
                 .exclude(order__merged_into__isnull=False)
                 .select_related('order', 'cancelled_by').order_by('cancelled_at')):
        value = item.price * item.quantity
        void_value += value
        voids.append({
            'orderId': item.order_id, 'ticket': _ticket(item.order), 'name': item.name,
            'quantity': item.quantity, 'value': _f(value), 'reason': item.cancel_reason,
            'by': _name(item.cancelled_by) if item.cancelled_by else 'Guest/system',
            'wasCooked': item.started_at is not None, 'at': item.cancelled_at,
        })

    open_tickets = []
    for o in (Order.objects.exclude(status__in=TERMINAL_ORDER_STATUSES)
              .select_related('table').prefetch_related('payments').order_by('created_at')):
        open_tickets.append({
            'orderId': o.id, 'ticket': _ticket(o), 'table': o.table.name if o.table else o.type.title(),
            'status': o.status, 'total': _f(o.total), 'balanceDue': _f(balance_due(o)),
            'createdAt': o.created_at,
        })

    out_of_stock = [
        {'id': p.id, 'name': p.name, 'stock': _f(p.stock_quantity), 'unit': p.unit}
        for p in Product.objects.filter(is_active=True, used_in__isnull=False, stock_quantity__lte=0).distinct()
    ]

    def money_rows(rows, *keys):
        return [{**r, **{k: _f(r[k]) for k in keys}} for r in rows]

    return {
        'date': day.isoformat(),
        'totals': {
            'collected': _f(collected), 'refunded': _f(refunded), 'net': _f(collected - refunded),
            'tickets': len(sold), 'sales': _f(sum((o.total for o in sold), ZERO)),
            'voidValue': _f(void_value),
        },
        'cash': {
            'in': _f(cash_in), 'refunds': _f(cash_refunds), 'expenses': _f(cash_expenses),
            'expected': _f(expected_cash),
        },
        'byMethod': sorted(
            [{**m, 'net': _f(m['collected'] - m['refunded'])} for m in money_rows(by_method.values(), 'collected', 'refunded')],
            key=lambda r: -r['net']),
        'byStaff': sorted(
            [{**s, 'net': _f(s['collected'] - s['refunded'])} for s in money_rows(by_staff.values(), 'collected', 'refunded', 'cash')],
            key=lambda r: -r['net']),
        'byWaiter': sorted(money_rows(by_waiter.values(), 'sales'), key=lambda r: -r['sales']),
        'refunds': refunds,
        'voids': voids,
        'cancelledTickets': cancelled_tickets,
        'openTickets': open_tickets,
        'outOfStock': out_of_stock,
    }


def _close_data(close):
    if close is None:
        return None
    return {
        'countedCash': _f(close.counted_cash), 'expectedCash': _f(close.expected_cash),
        'difference': _f(close.difference), 'notes': close.notes,
        'closedBy': _name(close.closed_by), 'closedAt': close.closed_at,
    }


def _parse_day(value):
    if not value:
        return timezone.localdate()
    day = parse_date(str(value))
    if day is None:
        raise ValidationError({'date': 'Use YYYY-MM-DD.'})
    return day


class DayCloseView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        day = _parse_day(request.query_params.get('date'))
        report = build_day_report(day)
        report['closed'] = _close_data(DayClose.objects.filter(business_date=day).select_related('closed_by').first())
        return Response(report)

    def post(self, request):
        day = _parse_day(request.data.get('date'))
        if day > timezone.localdate():
            raise ValidationError({'date': 'A future day cannot be closed.'})
        try:
            counted = Decimal(str(request.data.get('countedCash'))).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({'countedCash': 'Enter the cash counted in the drawer.'})
        if counted < 0:
            raise ValidationError({'countedCash': 'Cash counted cannot be negative.'})
        report = build_day_report(day)
        expected = Decimal(str(report['cash']['expected'])).quantize(Decimal('0.01'))
        close, _ = DayClose.objects.update_or_create(
            business_date=day,
            defaults={
                'expected_cash': expected, 'counted_cash': counted, 'difference': counted - expected,
                'notes': str(request.data.get('notes') or '')[:2000], 'summary': report,
                'closed_by': request.user,
            },
        )
        log_activity(request, 'CLOSE_DAY', 'DAY_CLOSE', day.isoformat(),
                     f'Closed {day.isoformat()}: counted ETB {counted:.2f}, expected ETB {expected:.2f} '
                     f'(difference {close.difference:+.2f})',
                     next=_close_data(close))
        report['closed'] = _close_data(close)
        return Response(report)
