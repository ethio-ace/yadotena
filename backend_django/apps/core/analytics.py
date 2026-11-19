"""Owner/manager analytics (port of the Go API's /analytics/* endpoints).

Definitions (same as Go):
- A "sale" is any order that is not CANCELLED or DRAFT; revenue is the sum
  of those orders' totals, by the day the order was placed (local time).
- Collected = PAID payments; outstanding = unpaid, still-open orders.
Periods: today, yesterday, this_week, last_week, this_month, last_month,
this_year, custom (start/end, optional comp_start/comp_end).
"""
from datetime import date, timedelta

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import ExtractHour, TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.service_requests.models import ServiceRequest
from .models import ActivityLog
from .permissions import IsManager

EXCLUDED_STATUSES = ['CANCELLED', 'DRAFT']
LIVE_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED']
LINE_TOTAL = ExpressionWrapper(F('price') * F('quantity'), output_field=DecimalField(max_digits=12, decimal_places=2))


# --- periods -----------------------------------------------------------------

def _month_start(d):
    return d.replace(day=1)


def resolve_period(params, today=None):
    """Return (start, end, comp_start, comp_end) as dates; comparison may be None."""
    today = today or timezone.localdate()
    period = params.get('period') or 'today'
    if period == 'yesterday':
        start = end = today - timedelta(days=1)
        return start, end, start - timedelta(days=1), start - timedelta(days=1)
    if period in ('this_week', 'last_week'):
        week_start = today - timedelta(days=today.weekday())  # Monday
        if period == 'this_week':
            start, end = week_start, today
        else:
            start, end = week_start - timedelta(days=7), week_start - timedelta(days=1)
        return start, end, start - timedelta(days=7), start - timedelta(days=1)
    if period in ('this_month', 'last_month'):
        month_start = _month_start(today)
        if period == 'this_month':
            start, end = month_start, today
        else:
            end = month_start - timedelta(days=1)
            start = _month_start(end)
        comp_end = start - timedelta(days=1)
        return start, end, _month_start(comp_end), comp_end
    if period == 'this_year':
        start = date(today.year, 1, 1)
        return start, today, date(today.year - 1, 1, 1), start - timedelta(days=1)
    if period == 'custom':
        start = parse_date(params.get('start') or '') or today - timedelta(days=30)
        end = parse_date(params.get('end') or '') or today
        if start > end:
            start, end = end, start
        comp_start = parse_date(params.get('comp_start') or '')
        comp_end = parse_date(params.get('comp_end') or '')
        if not (comp_start and comp_end):
            # Default comparison: the same number of days just before.
            length = (end - start).days + 1
            comp_end = start - timedelta(days=1)
            comp_start = comp_end - timedelta(days=length - 1)
        return start, end, comp_start, comp_end
    return today, today, today - timedelta(days=1), today - timedelta(days=1)


# --- query helpers -------------------------------------------------------------

def sales_orders(start, end):
    return Order.objects.exclude(status__in=EXCLUDED_STATUSES).filter(created_at__date__range=(start, end))


def sales_items(start, end):
    return OrderItem.objects.exclude(order__status__in=EXCLUDED_STATUSES).filter(order__created_at__date__range=(start, end))


def _num(value):
    return float(value or 0)


def metric(current, previous):
    current, previous = _num(current), _num(previous)
    delta = current - previous
    return {
        'current': round(current, 2), 'previous': round(previous, 2), 'delta': round(delta, 2),
        'pctChange': round(delta / previous * 100, 2) if previous else 0,
    }


def _revenue_and_count(start, end):
    agg = sales_orders(start, end).aggregate(revenue=Sum('total'), orders=Count('id'))
    return _num(agg['revenue']), agg['orders'] or 0


def _ticket_metrics(start, end, comp_start, comp_end):
    revenue, orders = _revenue_and_count(start, end)
    prev_revenue, prev_orders = _revenue_and_count(comp_start, comp_end)
    return {
        'revenue': metric(revenue, prev_revenue),
        'orders': metric(orders, prev_orders),
        'avgTicket': metric(revenue / orders if orders else 0, prev_revenue / prev_orders if prev_orders else 0),
    }


def revenue_trend(start, end, comp_start, comp_end):
    """Hourly for a single day, else daily. Comparison is aligned by position
    (hour h vs hour h, day i of the period vs day i of the comparison)."""
    if start == end:
        def by_hour(day):
            rows = (sales_orders(day, day).annotate(h=ExtractHour('created_at'))
                    .values('h').annotate(v=Sum('total')))
            return {r['h']: _num(r['v']) for r in rows}
        cur, comp = by_hour(start), by_hour(comp_start)
        return [{'label': f'{h:02d}:00', 'value': cur.get(h, 0.0), 'compare': comp.get(h, 0.0)} for h in range(24)]

    def by_day(s, e):
        rows = (sales_orders(s, e).annotate(d=TruncDate('created_at'))
                .values('d').annotate(v=Sum('total')))
        return {r['d']: _num(r['v']) for r in rows}
    cur, comp = by_day(start, end), by_day(comp_start, comp_end)
    points = []
    for i in range((end - start).days + 1):
        day = start + timedelta(days=i)
        compare_day = comp_start + timedelta(days=i)
        points.append({'label': day.isoformat(), 'value': cur.get(day, 0.0),
                       'compare': comp.get(compare_day, 0.0) if compare_day <= comp_end else 0.0})
    return points


def top_sellers(start, end, limit=5):
    rows = (sales_items(start, end).values('name', 'menu_item__category__name')
            .annotate(units=Sum('quantity'), revenue=Sum(LINE_TOTAL)).order_by('-revenue')[:limit])
    return [{'name': r['name'], 'category': r['menu_item__category__name'] or 'General',
             'units': r['units'] or 0, 'revenue': _num(r['revenue'])} for r in rows]


def hourly_sales(start, end):
    rows = (sales_orders(start, end).annotate(h=ExtractHour('created_at'))
            .values('h').annotate(revenue=Sum('total'), orders=Count('id')))
    by_hour = {r['h']: r for r in rows}
    return [{'hour': h, 'revenue': _num(by_hour.get(h, {}).get('revenue')),
             'orders': by_hour.get(h, {}).get('orders', 0)} for h in range(24)]


def category_sales(start, end):
    rows = list(sales_items(start, end).values('menu_item__category__name')
                .annotate(units=Sum('quantity'), revenue=Sum(LINE_TOTAL)).order_by('-revenue'))
    total = sum(_num(r['revenue']) for r in rows)
    return [{'category': r['menu_item__category__name'] or 'Other', 'units': r['units'] or 0,
             'revenue': _num(r['revenue']), 'share': round(_num(r['revenue']) / total * 100, 2) if total else 0}
            for r in rows]


def recent_activity(limit=10):
    return [{'time': log.created_at.isoformat(), 'action': log.action, 'staff': log.user_name,
             'entity': log.entity_id, 'entityType': log.entity_type}
            for log in ActivityLog.objects.order_by('-created_at')[:limit]]


# --- endpoints -------------------------------------------------------------------

class _AnalyticsView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        return Response(self.build(*resolve_period(request.query_params)))


class OverviewAnalyticsView(_AnalyticsView):
    def build(self, start, end, comp_start, comp_end):
        data = _ticket_metrics(start, end, comp_start, comp_end)
        unpaid = sales_orders(start, end).exclude(payment_status='PAID').aggregate(v=Sum('total'))['v']
        live = Order.objects.filter(status__in=LIVE_STATUSES)
        data.update({
            'unpaidAmount': _num(unpaid),
            'activeTables': live.exclude(table__isnull=True).values('table').distinct().count(),
            'preparingOrders': Order.objects.filter(status='PREPARING').count(),
            'readyOrders': Order.objects.filter(status='READY').count(),
            'unpaidOrders': live.exclude(payment_status='PAID').count(),
            'pendingRequests': ServiceRequest.objects.filter(status='PENDING').count(),
            'revenueTrend': revenue_trend(start, end, comp_start, comp_end),
            'topSellers': top_sellers(start, end),
            'recentActivity': recent_activity(),
        })
        return data


class SalesAnalyticsView(_AnalyticsView):
    def build(self, start, end, comp_start, comp_end):
        data = _ticket_metrics(start, end, comp_start, comp_end)
        data.update({
            'itemsSold': metric(sales_items(start, end).aggregate(v=Sum('quantity'))['v'],
                                sales_items(comp_start, comp_end).aggregate(v=Sum('quantity'))['v']),
            'revenueTrend': revenue_trend(start, end, comp_start, comp_end),
            'hourlySales': hourly_sales(start, end),
            'categorySales': category_sales(start, end),
        })
        return data


class MenuAnalyticsView(_AnalyticsView):
    def build(self, start, end, comp_start, comp_end):
        items = sales_items(start, end)
        menu_revenue = _num(sales_orders(start, end).aggregate(v=Sum('total'))['v'])
        rows = (items.values('menu_item_id', 'name', 'menu_item__category__name')
                .annotate(units=Sum('quantity'), revenue=Sum(LINE_TOTAL), avg_price=Sum(LINE_TOTAL) / Sum('quantity'))
                .order_by('-revenue')[:100])
        result = [{
            'id': r['menu_item_id'] or '', 'name': r['name'],
            'category': r['menu_item__category__name'] or 'General', 'type': 'prepared',
            'unitsSold': r['units'] or 0, 'revenue': _num(r['revenue']),
            'avgPrice': round(_num(r['avg_price']), 2),
            'share': round(_num(r['revenue']) / menu_revenue * 100, 2) if menu_revenue else 0,
        } for r in rows]
        return {
            'totalItemsSold': items.aggregate(v=Sum('quantity'))['v'] or 0,
            'menuRevenue': menu_revenue,
            'bestSeller': result[0]['name'] if result else '',
            'items': result,
        }


class PaymentAnalyticsView(_AnalyticsView):
    def build(self, start, end, comp_start, comp_end):
        paid = Payment.objects.filter(status='PAID', created_at__date__range=(start, end))
        agg = paid.aggregate(total=Sum('amount'), count=Count('id'))
        collected, count = _num(agg['total']), agg['count'] or 0
        outstanding = (Order.objects.filter(status__in=LIVE_STATUSES, created_at__date__range=(start, end))
                       .exclude(payment_status='PAID').aggregate(v=Sum('total'))['v'])
        methods = paid.values('method').annotate(transactions=Count('id'), amount=Sum('amount')).order_by('-amount')
        return {
            'collected': collected,
            'outstanding': _num(outstanding),
            'paymentCount': count,
            'avgPayment': round(collected / count, 2) if count else 0,
            'methods': [{'method': m['method'] or 'Unknown', 'transactions': m['transactions'],
                         'amount': _num(m['amount']),
                         'share': round(_num(m['amount']) / collected * 100, 2) if collected else 0}
                        for m in methods],
        }
