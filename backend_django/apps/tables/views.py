import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Table, DiningSession
from .serializers import TableSerializer, DiningSessionSerializer

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
        return Response(TableSerializer(table).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        table = self.get_object()
        # Close any existing active sessions
        table.sessions.filter(status='ACTIVE').update(status='CLOSED', closed_at=timezone.now())
        
        session_code = f"YD-{uuid.uuid4().hex[:6].upper()}"
        session = DiningSession.objects.create(table=table, session_code=session_code)
        table.status = 'OCCUPIED'
        table.save()

        return Response(DiningSessionSerializer(session).data, status=status.HTTP_201_CREATED)

class DiningSessionViewSet(viewsets.ModelViewSet):
    queryset = DiningSession.objects.all().select_related('table')
    serializer_class = DiningSessionSerializer
    permission_classes = [permissions.AllowAny]
