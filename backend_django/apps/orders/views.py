from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Order
from .serializers import OrderSerializer, OrderItemInputSerializer
from . import services
from apps.core.activity import log_activity
from apps.core.permissions import ActionPermissionMixin, AllowAny, IsStaff, IsManager
from apps.core.throttles import PublicActionThrottle

ORDER_QS = Order.objects.prefetch_related('items', 'payments').select_related('table')


class OrderViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = ORDER_QS
    serializer_class = OrderSerializer
    # The public site is view-only (owner's decision): customers can only
    # view/track an order by its id. Orders are placed by staff.
    action_permissions = {
        'create': [IsStaff],
        'retrieve': [AllowAny],
        'lookup': [AllowAny],
        'add_items': [IsStaff],
        'list': [IsStaff],
        'update': [IsStaff],
        'partial_update': [IsStaff],
        'update_status': [IsStaff],
        'kitchen': [IsStaff],
        'destroy': [IsManager],
    }
    default_permissions = [IsStaff]
    throttle_classes = [PublicActionThrottle]
    public_throttle_scope = 'public_orders'
    public_throttle_actions = {'lookup'}
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['table']
    ordering_fields = ['created_at', 'total', 'status']

    def get_queryset(self):
        qs = ORDER_QS.all()
        if self.action != 'list':
            return qs
        params = self.request.query_params
        # Filters as the frontend sends them (Go API names, any case).
        if params.get('type'):
            qs = qs.filter(type=params['type'].upper())
        if params.get('status'):
            qs = qs.filter(status=params['status'].upper())
        payment_status = params.get('paymentStatus') or params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status.upper())
        if params.get('search'):
            term = params['search']
            qs = qs.filter(Q(id__icontains=term) | Q(customer_name__icontains=term)
                           | Q(customer_phone__icontains=term) | Q(table__name__icontains=term))
        since = params.get('since')
        if since:
            parsed = parse_datetime(since.replace(' ', '+'))
            if parsed is None:
                raise DRFValidationError({'since': 'Use an ISO 8601 timestamp.'})
            # Incremental polling: anything touched since the last fetch.
            qs = qs.filter(updated_at__gte=parsed)
        return qs

    def perform_create(self, serializer):
        order = serializer.save()
        if str(self.request.data.get('paymentStatus', '')).upper() == 'PAID':
            # POS "already paid" toggle: record a real payment so revenue,
            # collected totals and the audit trail stay consistent.
            from apps.payments.services import record_payment
            record_payment(order_id=order.pk, method=self.request.data.get('paymentMethod') or 'CASH',
                           recorded_by=self.request.user)
            order.refresh_from_db()
        who = order.customer_name or (order.table.name if order.table else 'walk-in')
        log_activity(self.request, 'CREATE_ORDER', 'ORDER', order.pk,
                     f'Order #{order.pk} placed ({order.type}, {who}, ETB {order.total:.2f})',
                     next={'status': order.status, 'total': order.total, 'type': order.type})

    def partial_update(self, request, *args, **kwargs):
        # PATCH /orders/{id} {"status": ...} is a status change (Go parity).
        if 'status' in request.data:
            return self.update_status(request, *args, **kwargs)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='lookup')
    def lookup(self, request):
        """Find an order by full id or its last 6 characters (receipt number)."""
        number = (request.query_params.get('number') or '').strip().upper()
        if not number:
            raise DRFValidationError({'number': 'number is required'})
        qs = ORDER_QS.order_by('-created_at')
        order = qs.filter(id__iexact=number).first()
        if order is None and len(number) >= 6:
            order = qs.filter(id__iendswith=number[-6:]).first()
        if order is None:
            return Response({'detail': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            raise DRFValidationError({'status': 'Status is required'})
        previous = order.status
        order = services.update_order_status(order, new_status)
        log_activity(request, 'UPDATE_ORDER_STATUS', 'ORDER', order.pk,
                     f'Updated Order #{order.pk} status from {previous} to {order.status}',
                     prev={'status': previous}, next={'status': order.status})
        return Response(self._serialize(order))

    @action(detail=True, methods=['post'], url_path='kitchen')
    def kitchen(self, request, pk=None):
        """Kitchen display write path: {action, roundNumber?, itemIds?}."""
        order = self.get_object()
        try:
            round_number = int(request.data.get('roundNumber') or 0)
        except (TypeError, ValueError):
            raise DRFValidationError({'roundNumber': 'Must be an integer.'})
        item_ids = request.data.get('itemIds') or []
        if not isinstance(item_ids, list):
            raise DRFValidationError({'itemIds': 'Must be a list.'})
        order = services.kitchen_action(order, request.data.get('action'),
                                        round_number=round_number, item_ids=item_ids)
        action_name = str(request.data.get('action')).upper()
        log_activity(request, 'KITCHEN_ACTION', 'ORDER', order.pk,
                     f'Kitchen {action_name} on Order #{order.pk} (round {round_number or "all"})',
                     next={'action': action_name, 'round': round_number, 'status': order.status})
        return Response(self._serialize(order))

    @action(detail=True, methods=['post'], url_path='add-items')
    def add_items(self, request, pk=None):
        order = self.get_object()
        input_serializer = OrderItemInputSerializer(data=request.data.get('items', []), many=True)
        input_serializer.is_valid(raise_exception=True)
        order = services.add_items_to_order(order, input_serializer.validated_data)
        log_activity(request, 'APPEND_ORDER_ITEMS', 'ORDER', order.pk,
                     f'Added {len(input_serializer.validated_data)} item(s) to Order #{order.pk}',
                     next={'total': order.total})
        return Response(self._serialize(order))

    def _serialize(self, order):
        return self.get_serializer(ORDER_QS.get(pk=order.pk)).data
