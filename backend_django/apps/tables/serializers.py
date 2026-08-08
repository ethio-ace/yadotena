import uuid
import re
from rest_framework import serializers
from .models import Table, DiningSession, generate_qr_token

class TableSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False, allow_blank=True)
    currentOrderId = serializers.CharField(source='current_order_id', required=False, allow_null=True, allow_blank=True)
    qrToken = serializers.CharField(source='qr_token', read_only=True)

    class Meta:
        model = Table
        fields = ['id', 'name', 'capacity', 'status', 'qrToken', 'currentOrderId']

    def create(self, validated_data):
        table_id = validated_data.get('id')
        if not table_id:
            # Look for max number in existing 't<N>' ids
            existing_ids = Table.objects.values_list('id', flat=True)
            numbers = []
            for tid in existing_ids:
                match = re.match(r'^t(\d+)$', str(tid))
                if match:
                    numbers.append(int(match.group(1)))
            next_num = max(numbers, default=0) + 1
            table_id = f"t{next_num}"
            validated_data['id'] = table_id

        if 'qr_token' not in validated_data:
            validated_data['qr_token'] = generate_qr_token()

        return super().create(validated_data)

class DiningSessionSerializer(serializers.ModelSerializer):
    tableName = serializers.CharField(source='table.name', read_only=True)
    sessionCode = serializers.CharField(source='session_code', read_only=True)
    startedAt = serializers.DateTimeField(source='started_at', read_only=True)
    closedAt = serializers.DateTimeField(source='closed_at', read_only=True)

    class Meta:
        model = DiningSession
        fields = ['id', 'table', 'tableName', 'sessionCode', 'status', 'startedAt', 'closedAt']
