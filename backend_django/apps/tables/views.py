import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from apps.core.ably_utils import publish_event
from .models import Table, DiningSession
from .serializers import TableSerializer, DiningSessionSerializer
from apps.orders.services import get_open_order_for_table


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all().order_by('name')
    serializer_class = TableSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        table = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)

        table.status = new_status
        if 'currentOrderId' in request.data:
            table.current_order_id = request.data['currentOrderId']
        table.save()
        publish_event('yadotena-realtime', 'table.updated', {'id': str(table.id), 'status': table.status})
        return Response(TableSerializer(table).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        table = self.get_object()
        active_session = table.sessions.filter(status='ACTIVE').first()
        created = False

        if not active_session:
            table.sessions.filter(status='ACTIVE').update(status='CLOSED', closed_at=timezone.now())
            session_code = f"YD-{uuid.uuid4().hex[:6].upper()}"
            active_session = DiningSession.objects.create(table=table, session_code=session_code)
            created = True
            if table.status == 'AVAILABLE':
                table.status = 'OCCUPIED'
                table.save(update_fields=['status', 'updated_at'])
                publish_event('yadotena-realtime', 'table.updated', {'id': str(table.id), 'status': table.status})

        open_order = get_open_order_for_table(table)
        session_data = DiningSessionSerializer(active_session).data
        session_data['tableId'] = table.id
        session_data['openOrderId'] = open_order.id if open_order else None

        return Response(
            session_data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DiningSessionViewSet(viewsets.ModelViewSet):
    queryset = DiningSession.objects.all().select_related('table')
    serializer_class = DiningSessionSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'], url_path='active')
    def active_sessions(self, request):
        table_id = request.query_params.get('table')
        if not table_id:
            return Response({'error': 'table query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        table = Table.objects.filter(id=table_id).first()
        if not table:
            return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

        active_session = table.sessions.filter(status='ACTIVE').first()
        if not active_session:
            return Response({'active': False, 'tableId': table.id, 'openOrderId': None})

        open_order = get_open_order_for_table(table)
        data = DiningSessionSerializer(active_session).data
        data['active'] = True
        data['tableId'] = table.id
        data['openOrderId'] = open_order.id if open_order else None
        return Response(data)
