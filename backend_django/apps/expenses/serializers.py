from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    recordedBy = serializers.CharField(source='recorded_by.name', read_only=True)
    recordedById = serializers.CharField(source='recorded_by_id', required=False, allow_null=True)
    paymentMethod = serializers.CharField(source='payment_method', required=False)
    receiptUrl = serializers.CharField(source='receipt_url', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Expense
        fields = ['id', 'amount', 'category', 'description', 'date', 'recordedBy', 'recordedById', 'paymentMethod', 'receiptUrl']
