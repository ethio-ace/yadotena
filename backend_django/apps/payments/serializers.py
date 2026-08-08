from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='order.id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'order', 'orderId', 'method', 'amount', 'status', 'transaction_ref', 'createdAt']
