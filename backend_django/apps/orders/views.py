from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from rest_framework.exceptions import MethodNotAllowed
from apps.tables.models import Table
from .models import Order
from .serializers import OrderSerializer, OrderItemInputSerializer
from . import services
from apps.core.activity import log_activity
from apps.core.permissions import ActionPermissionMixin, AllowAny, IsStaff, IsManager, is_staff_user
from apps.core.throttles import PublicActionThrottle

ORDER_QS = (Order.objects.prefetch_related('items', 'payments__recorded_by')
            .select_related('table', 'created_by', 'cancelled_by'))


class OrderViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = ORDER_QS
    serializer_class = OrderSerializer
    # Guests may place a dine-in order from the public menu; it arrives as
    # DRAFT and a waiter approves it before the kitchen sees it (see
    # serializer.create / services.create_order). Extending an order by id
    # stays staff-only: a guest's second round goes through create, which
    # merges into the table's open ticket as a new DRAFT round.
    action_permissions = {
        'create': [AllowAny],
        'retrieve': [AllowAny],
        'lookup': [AllowAny],
        'add_items': [IsStaff],
        'list': [IsStaff],
        'update': [IsStaff],
        'partial_update': [IsStaff],
        'update_status': [IsStaff],
        'kitchen': [IsStaff],
        'cancel': [IsStaff],      # floor staff: untouched tickets only (service checks)
        'move': [IsStaff],
        'refund': [IsManager],
        'destroy': [IsManager],
    }
    default_permissions = [IsStaff]
    throttle_classes = [PublicActionThrottle]
    public_throttle_scope = 'public_orders'
    public_throttle_actions = {'create', 'lookup'}
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
            match = (Q(id__icontains=term) | Q(customer_name__icontains=term)
                     | Q(customer_phone__icontains=term) | Q(table__name__icontains=term))
            number = term.strip().lstrip('#')
            if number.isdigit():
                # "#27" = today's ticket 27.
                match |= Q(business_date=timezone.localdate(), daily_number=int(number))
            qs = qs.filter(match)
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
        # Staff only: a guest must never be able to mark their own order paid.
        if is_staff_user(self.request.user) and str(self.request.data.get('paymentStatus', '')).upper() == 'PAID':
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
        order = services.update_order_status(order, new_status, user=request.user,
                                             reason=request.data.get('reason', ''))
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
        reason = request.data.get('reason', '')
        order = services.kitchen_action(order, request.data.get('action'),
                                        round_number=round_number, item_ids=item_ids,
                                        user=request.user, reason=reason)
        action_name = str(request.data.get('action')).upper()
        note = f' — {reason}' if reason else ''
        log_activity(request, 'KITCHEN_ACTION', 'ORDER', order.pk,
                     f'Kitchen {action_name} on Order #{order.pk} (round {round_number or "all"}){note}',
                     next={'action': action_name, 'round': round_number, 'status': order.status,
                           'itemIds': item_ids, 'reason': reason})
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

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel the whole ticket: {reason}. Started/paid tickets need a manager."""
        order = self.get_object()
        previous = order.status
        reason = request.data.get('reason', '')
        order = services.cancel_order(order, user=request.user, reason=reason)
        log_activity(request, 'CANCEL_ORDER', 'ORDER', order.pk,
                     f'Cancelled Order #{order.pk} — {order.cancel_reason}',
                     prev={'status': previous}, next={'status': order.status, 'reason': order.cancel_reason})
        return Response(self._serialize(order))

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        """Move a dine-in ticket to another table: {tableId}. Merges if that table is busy."""
        order = self.get_object()
        table_id = request.data.get('tableId') or request.data.get('table_id')
        target_table = Table.objects.filter(id=table_id).first() if table_id else None
        if target_table is None:
            raise DRFValidationError({'tableId': 'Choose the table to move to.'})
        source = order.table.name if order.table else 'no table'
        result = services.move_order(order, target_table, user=request.user)
        merged = result.pk != order.pk
        log_activity(request, 'MOVE_ORDER', 'ORDER', order.pk,
                     f'Moved Order #{order.pk} from {source} to {target_table.name}'
                     + (f' (merged into #{result.pk})' if merged else ''),
                     next={'tableId': target_table.pk, 'mergedInto': result.pk if merged else None})
        return Response(self._serialize(result))

    @action(detail=True, methods=['post'], url_path='refund')
    def refund(self, request, pk=None):
        """Manager refund: {amount, reason, method?}. Recorded as its own payment row."""
        order = self.get_object()
        reason = services._require_reason(request.data.get('reason'))
        amount = request.data.get('amount')
        try:
            amount = services._money(amount)
        except Exception:
            raise DRFValidationError({'amount': 'A valid amount is required.'})
        from django.db import transaction
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            refund = services.record_refund(locked, amount, user=request.user, reason=reason,
                                            method=request.data.get('method') or None)
        log_activity(request, 'REFUND_PAYMENT', 'ORDER', order.pk,
                     f'Refunded ETB {refund.amount:.2f} ({refund.method}) on Order #{order.pk} — {reason}',
                     next={'amount': refund.amount, 'method': refund.method, 'reason': reason})
        return Response(self._serialize(order))

    def destroy(self, request, *args, **kwargs):
        # Deleting a ticket erases sales history; cancel it with a reason instead.
        raise MethodNotAllowed('DELETE', detail='Orders cannot be deleted. Cancel the order with a reason instead.')

    def _serialize(self, order):
        return self.get_serializer(ORDER_QS.get(pk=order.pk)).data
