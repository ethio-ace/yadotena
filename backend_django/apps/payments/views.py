from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Payment
from .serializers import PaymentSerializer
from apps.core.permissions import ActionPermissionMixin, IsStaff, IsManager

class PaymentViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('order')
    serializer_class = PaymentSerializer
    action_permissions = {'create': [IsStaff]}
    default_permissions = [IsManager]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['method', 'status', 'order']
    ordering_fields = ['created_at', 'amount']
