from rest_framework import serializers
from apps.tables.models import Table
from .models import ServiceRequest

class ServiceRequestSerializer(serializers.ModelSerializer):
    tableId = serializers.CharField(source='table_id', required=True)
    tableName = serializers.CharField(source='table.name', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    resolvedAt = serializers.DateTimeField(source='resolved_at', read_only=True)

    class Meta:
        model = ServiceRequest
        fields = ['id', 'tableId', 'tableName', 'type', 'status', 'notes', 'createdAt', 'resolvedAt']

    def create(self, validated_data):
        table_id = validated_data.pop('table_id')
        table = Table.objects.filter(id=table_id).first()
        if not table:
            raise serializers.ValidationError({'tableId': 'Table not found.'})

        req_type = validated_data.get('type', 'WAITER')
        # Update table status
        if req_type == 'BILL':
            table.status = 'WAITING_FOR_PAYMENT'
        else:
            table.status = 'WAITING_FOR_SERVICE'
        table.save()

        notes = validated_data.pop('notes', '')
        if not notes:
            notes = "Requested table bill" if req_type == 'BILL' else "Called for waiter assistance"

        return ServiceRequest.objects.create(table=table, notes=notes, **validated_data)
