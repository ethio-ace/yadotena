from rest_framework import status, viewsets
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.core.activity import AuditedViewSetMixin, log_activity
from apps.core.permissions import ActionPermissionMixin, AllowAny, IsStaff, IsManager, is_manager_user
from .models import Payment, PaymentMethod
from .serializers import PaymentCreateSerializer, PaymentMethodSerializer, PaymentSerializer
from . import services


class PaymentViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('order', 'payment_method', 'recorded_by')
    serializer_class = PaymentSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    # Floor staff settle bills; payment history is back-office.
    action_permissions = {'create': [IsStaff]}
    default_permissions = [IsManager]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['method', 'status', 'order']
    ordering_fields = ['created_at', 'amount']

    def create(self, request, *args, **kwargs):
        data = PaymentCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        payment, created = services.record_payment(
            order_id=d['orderId'],
            method=d.get('method') or 'CASH',
            amount=d.get('amount'),
            transaction_ref=d.get('transactionRef') or d.get('reference'),
            receipt_url=d.get('receiptUrl'),
            notes=d.get('notes') or '',
            recorded_by=request.user,
        )
        if created:
            log_activity(request, 'SETTLE_PAYMENT', 'PAYMENT', payment.pk,
                         f'Settled ETB {payment.amount:.2f} via {payment.method} for Order #{payment.order_id}',
                         next=PaymentSerializer(payment).data)
        return Response(PaymentSerializer(payment).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PaymentMethodViewSet(AuditedViewSetMixin, ActionPermissionMixin, viewsets.ModelViewSet):
    audit_entity = 'PAYMENT_METHOD'
    serializer_class = PaymentMethodSerializer
    # Customers see active methods (account numbers to transfer to).
    action_permissions = {'list': [AllowAny], 'retrieve': [AllowAny]}
    default_permissions = [IsManager]

    def get_queryset(self):
        qs = PaymentMethod.objects.all()
        # Managers see disabled methods when editing, or when listing with ?all=true.
        if is_manager_user(self.request.user) and (self.action != 'list' or self.request.query_params.get('all') == 'true'):
            return qs
        return qs.filter(is_active=True)
