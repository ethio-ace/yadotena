from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import viewsets
from apps.authentication.models import User
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from .permissions import user_role
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from .models import RestaurantSetting
from .serializers import RestaurantSettingSerializer
from .activity import log_activity
from .permissions import AllowAny, IsManager, IsOwner
from apps.orders.models import Order, OrderItem
from apps.expenses.models import Expense

class RestaurantSettingView(APIView):
    def get_permissions(self):
        # Customers need public settings (name, tax, currency) to render menus.
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsOwner()]

    def get(self, request):
        setting = RestaurantSetting.get_settings()
        return Response(RestaurantSettingSerializer(setting).data)

    def put(self, request):
        setting = RestaurantSetting.get_settings()
        prev = RestaurantSettingSerializer(setting).data
        serializer = RestaurantSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_activity(request, 'UPDATE_SETTINGS', 'SETTINGS', setting.pk, 'Updated restaurant settings',
                     prev=prev, next=serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ReportsSummaryView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        # Gross revenue
        total_revenue = Order.objects.filter(status__in=['SERVED', 'COMPLETED']).aggregate(
            total=Sum('total')
        )['total'] or 0.00

        # Expenses
        total_expenses = Expense.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0.00

        # Net Profit
        net_profit = float(total_revenue) - float(total_expenses)

        # Total Orders
        orders_count = Order.objects.count()
        completed_orders = Order.objects.filter(status__in=['SERVED', 'COMPLETED']).count()

        # Avg ticket
        avg_ticket = float(total_revenue / completed_orders) if completed_orders > 0 else 0.00

        # Top dishes
        top_items = (
            OrderItem.objects.values('name')
            .annotate(qty=Sum('quantity'), revenue=Sum('price'))
            .order_by('-qty')[:5]
        )

        return Response({
            'grossRevenue': float(total_revenue),
            'totalExpenses': float(total_expenses),
            'netProfit': net_profit,
            'ordersCount': orders_count,
            'completedOrders': completed_orders,
            'averageTicket': round(avg_ticket, 2),
            'topDishes': list(top_items),
        }, status=status.HTTP_200_OK)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit trail for managers. Managers never see the owner's own activity."""
    serializer_class = ActivityLogSerializer
    permission_classes = [IsManager]
    MAX_LIMIT = 500

    def get_queryset(self):
        qs = ActivityLog.objects.all()
        if user_role(self.request.user) != 'OWNER':
            owner_ids = [str(pk) for pk in User.objects.filter(role='OWNER').values_list('pk', flat=True)]
            qs = qs.exclude(user_role='OWNER').exclude(user_id__in=owner_ids)
        if self.action != 'list':
            return qs
        p = self.request.query_params
        if p.get('role') and p['role'].upper() != 'ALL':
            qs = qs.filter(user_role=p['role'].upper())
        if p.get('entityType') and p['entityType'].upper() != 'ALL':
            qs = qs.filter(entity_type=p['entityType'].upper())
        if p.get('action') and p['action'].upper() != 'ALL':
            qs = qs.filter(action=p['action'])
        start, end = _parse_bound(p.get('startDate')), _parse_bound(p.get('endDate'), end=True)
        if start:
            qs = qs.filter(created_at__gte=start)
        if end:
            qs = qs.filter(created_at__lte=end)
        if p.get('search'):
            term = p['search']
            qs = qs.filter(Q(user_name__icontains=term) | Q(description__icontains=term)
                           | Q(entity_id__icontains=term) | Q(ip_address__icontains=term))
        try:
            limit = max(1, min(int(p.get('limit', 150)), self.MAX_LIMIT))
        except ValueError:
            limit = 150
        return qs[:limit]


def _parse_bound(value, end=False):
    """Accept RFC 3339 timestamps or plain dates (a date end bound covers the whole day)."""
    if not value:
        return None
    parsed = parse_datetime(value.replace(' ', '+'))
    if parsed is not None:
        return parsed if parsed.tzinfo else timezone.make_aware(parsed)
    day = parse_date(value)
    if day is None:
        return None
    moment = timezone.make_aware(datetime.combine(day, time.min))
    return moment + timedelta(days=1) if end else moment
