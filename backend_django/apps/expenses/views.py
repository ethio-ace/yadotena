from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Expense
from .serializers import ExpenseSerializer
from apps.core.activity import AuditedViewSetMixin
from apps.core.permissions import IsManager

class ExpenseViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = 'EXPENSE'
    queryset = Expense.objects.all().select_related('recorded_by')
    serializer_class = ExpenseSerializer
    permission_classes = [IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'date']
    search_fields = ['description', 'category']
    ordering_fields = ['date', 'amount']
