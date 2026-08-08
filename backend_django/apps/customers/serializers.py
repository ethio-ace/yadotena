from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    totalOrders = serializers.IntegerField(source='total_orders', default=0)
    totalSpent = serializers.DecimalField(source='total_spent', max_digits=12, decimal_places=2, default=0.00)
    lastOrderDate = serializers.DateTimeField(source='last_order_date', required=False, allow_null=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'totalOrders', 'totalSpent', 'lastOrderDate']
