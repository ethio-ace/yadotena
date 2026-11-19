from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Customer
from .serializers import CustomerSerializer
from apps.core.permissions import ActionPermissionMixin, IsStaff, IsManager

class CustomerViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    action_permissions = {'list': [IsStaff], 'retrieve': [IsStaff]}
    default_permissions = [IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'phone', 'email']
    ordering_fields = ['total_spent', 'total_orders', 'last_order_date', 'name']
