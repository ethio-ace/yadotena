from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Order
from .serializers import OrderSerializer, OrderItemInputSerializer
from . import services


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

        try:
            order = services.update_order_status(order, new_status)
        except DRFValidationError as exc:
            return Response({'error': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='add-items')
    def add_items(self, request, pk=None):
        order = self.get_object()
        items_data = request.data.get('items', [])
        input_serializer = OrderItemInputSerializer(data=items_data, many=True)
        input_serializer.is_valid(raise_exception=True)

        try:
            order = services.add_items_to_order(order, input_serializer.validated_data)
        except DRFValidationError as exc:
            return Response({'error': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
