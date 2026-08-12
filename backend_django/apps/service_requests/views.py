from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from apps.core.ably_utils import publish_event
from .models import ServiceRequest
from .serializers import ServiceRequestSerializer

class ServiceRequestViewSet(viewsets.ModelViewSet):
    queryset = ServiceRequest.objects.all().select_related('table')
    serializer_class = ServiceRequestSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'type', 'table']
    ordering_fields = ['created_at', 'status']

    def perform_create(self, serializer):
        req = serializer.save()
        publish_event('yadotena-realtime', 'service_request.created', {'id': req.id, 'table_id': str(req.table.id) if req.table else None})

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        req = self.get_object()
        req.status = 'RESOLVED'
        req.resolved_at = timezone.now()
        req.save()

        # Update table status back to OCCUPIED if it was WAITING_FOR_SERVICE or WAITING_FOR_PAYMENT
        if req.table and req.table.status in ['WAITING_FOR_SERVICE', 'WAITING_FOR_PAYMENT']:
            # Check if there are other pending requests for this table
            has_other_pending = ServiceRequest.objects.filter(table=req.table, status='PENDING').exclude(id=req.id).exists()
            if not has_other_pending:
                req.table.status = 'OCCUPIED'
                req.table.save()

        publish_event('yadotena-realtime', 'service_request.resolved', {'id': req.id, 'table_id': str(req.table.id) if req.table else None})

        return Response(ServiceRequestSerializer(req).data, status=status.HTTP_200_OK)
