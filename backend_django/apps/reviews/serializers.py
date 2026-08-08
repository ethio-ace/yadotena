from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='order_id', required=False, allow_null=True)
    customerName = serializers.CharField(source='customer_name', default='Guest')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'orderId', 'customerName', 'rating', 'comment', 'createdAt']
