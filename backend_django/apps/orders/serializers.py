from rest_framework import serializers
from .models import Order, OrderItem
from . import services
from apps.core.permissions import is_staff_user


class OrderItemSerializer(serializers.ModelSerializer):
    menuItemId = serializers.CharField(source='menu_item_id', required=False, allow_null=True, allow_blank=True)
    specialInstructions = serializers.CharField(source='special_instructions', required=False, allow_blank=True, allow_null=True)
    selectedAddons = serializers.ListField(source='selected_addons', required=False, default=list)
    roundNumber = serializers.IntegerField(source='round_number', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'menuItemId', 'name', 'price', 'quantity',
            'specialInstructions', 'selectedAddons', 'roundNumber',
        ]


class OrderItemInputSerializer(serializers.Serializer):
    menuItemId = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    specialInstructions = serializers.CharField(required=False, allow_blank=True, default='')
    selectedAddons = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    itemsInput = OrderItemInputSerializer(many=True, write_only=True, required=False)
    paymentStatus = serializers.CharField(source='payment_status', required=False)
    tableId = serializers.CharField(source='table_id', required=False, allow_null=True, allow_blank=True)
    tableName = serializers.CharField(source='table.name', read_only=True)
    customerName = serializers.CharField(source='customer_name', required=False, allow_null=True, allow_blank=True)
    customerPhone = serializers.CharField(source='customer_phone', required=False, allow_null=True, allow_blank=True)
    deliveryAddress = serializers.CharField(source='delivery_address', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    serviceCharge = serializers.DecimalField(source='service_charge', max_digits=10, decimal_places=2, read_only=True)
    deliveryFee = serializers.DecimalField(source='delivery_fee', max_digits=10, decimal_places=2, read_only=True)
    idempotencyKey = serializers.CharField(source='idempotency_key', required=False, allow_null=True, allow_blank=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'type', 'status', 'paymentStatus', 'items', 'itemsInput',
            'subtotal', 'tax', 'serviceCharge', 'deliveryFee', 'total',
            'createdAt', 'updatedAt', 'tableId', 'tableName',
            'customerName', 'customerPhone', 'deliveryAddress', 'idempotencyKey',
        ]
        read_only_fields = ['id', 'status', 'subtotal', 'tax', 'service_charge', 'delivery_fee', 'total']

    PRIVATE_FIELDS = ('customerPhone', 'deliveryAddress')

    def _request_is_staff(self):
        request = self.context.get('request')
        return bool(request) and is_staff_user(request.user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Anonymous order lookups (customer tracking page) must not leak contact details.
        if not self._request_is_staff():
            for field in self.PRIVATE_FIELDS:
                data.pop(field, None)
        return data

    def create(self, validated_data):
        if not self._request_is_staff():
            # Customers cannot mark their own order as paid.
            validated_data.pop('payment_status', None)
        items_data = validated_data.pop('itemsInput', None) or self.initial_data.get('items', [])
        idempotency_key = validated_data.pop('idempotency_key', None)
        if not idempotency_key:
            idempotency_key = None
        validated_data.pop('table_id', None)
        table_id = self.initial_data.get('tableId') or self.initial_data.get('table_id')

        payload = {
            **validated_data,
            'table_id': table_id,
        }
        return services.create_order(payload, items_data, idempotency_key=idempotency_key)

    def update(self, instance, validated_data):
        validated_data.pop('itemsInput', None)
        validated_data.pop('idempotency_key', None)
        validated_data.pop('table_id', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
