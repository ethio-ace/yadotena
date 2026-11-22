from datetime import datetime, time, timedelta

from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import User
from apps.expenses.models import Expense
from apps.orders.models import Order, OrderItem
from .activity import log_activity
from .media import absolute_url, save_image
from .models import ActivityLog, RestaurantSetting
from .permissions import AllowAny, IsManager, IsOwner, user_role
from .serializers import ActivityLogSerializer, RestaurantSettingSerializer

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

    # Settings updates are always partial, so PATCH means the same thing.
    patch = put

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


class MediaUploadView(APIView):
    """POST multipart ``file`` (or ``image``) -> {url, publicUrl}. Managers only."""
    permission_classes = [IsManager]

    def post(self, request):
        upload = request.FILES.get('file') or request.FILES.get('image')
        if upload is None:
            raise ValidationError({'file': 'Attach an image as "file".'})
        url = absolute_url(request, save_image(upload, folder='uploads'))
        log_activity(request, 'UPLOAD_MEDIA', 'MEDIA', url.rsplit('/', 1)[-1], f'Uploaded image {upload.name}')
        return Response({'url': url, 'publicUrl': url}, status=status.HTTP_201_CREATED)


class MediaPresignView(APIView):
    """Direct-to-bucket uploads are not used; clients fall back to /media/upload."""
    permission_classes = [IsManager]

    def post(self, request):
        return Response({'detail': 'Presigned uploads are not supported; use /media/upload.'},
                        status=status.HTTP_501_NOT_IMPLEMENTED)
