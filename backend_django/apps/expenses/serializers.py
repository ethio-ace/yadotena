from django.utils.dateparse import parse_datetime
from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    recordedBy = serializers.CharField(source='recorded_by.name', read_only=True, default=None)
    recordedById = serializers.CharField(source='recorded_by_id', read_only=True)
    paymentMethod = serializers.CharField(source='payment_method', required=False, max_length=50)
    receiptUrl = serializers.CharField(source='receipt_url', required=False, allow_blank=True, allow_null=True)
    reference = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'amount', 'category', 'description', 'date', 'recordedBy', 'recordedById',
                  'paymentMethod', 'receiptUrl', 'reference', 'createdAt']
        extra_kwargs = {'amount': {'min_value': 0}, 'date': {'required': False}}

    def to_internal_value(self, data):
        data = dict(data)
        if 'payment_method' in data and 'paymentMethod' not in data:
            data['paymentMethod'] = data.pop('payment_method')
        if data.get('reference') is None:
            data.pop('reference', None)
        # The form sends a full ISO timestamp; keep the local calendar day.
        raw_date = data.get('date')
        if isinstance(raw_date, str) and 'T' in raw_date:
            parsed = parse_datetime(raw_date.replace('Z', '+00:00'))
            if parsed is not None:
                from django.utils import timezone
                data['date'] = timezone.localtime(parsed).date().isoformat() if parsed.tzinfo else parsed.date().isoformat()
        return super().to_internal_value(data)
