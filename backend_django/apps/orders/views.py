from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Order, OrderItem
from .serializers import OrderSerializer

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().prefetch_related('items').select_related('table')
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'status', 'payment_status', 'table']
    search_fields = ['id', 'customer_name', 'customer_phone', 'table__name']
    ordering_fields = ['created_at', 'total', 'status']

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = new_status
        order.save()

        if order.table:
            if new_status in ['SERVED', 'COMPLETED']:
                order.table.status = 'OCCUPIED'
                order.table.save()
            elif new_status == 'PREPARING':
                order.table.status = 'PREPARING'
                order.table.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
