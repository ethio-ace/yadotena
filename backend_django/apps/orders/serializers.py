from rest_framework import serializers
from apps.tables.models import Table
from apps.menu.models import MenuItem
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    menuItemId = serializers.CharField(source='menu_item_id', required=False, allow_null=True, allow_blank=True)
    specialInstructions = serializers.CharField(source='special_instructions', required=False, allow_blank=True, allow_null=True)
    selectedAddons = serializers.ListField(source='selected_addons', required=False, default=list)

    class Meta:
        model = OrderItem
        fields = ['id', 'menuItemId', 'name', 'price', 'quantity', 'specialInstructions', 'selectedAddons']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, required=False)
    paymentStatus = serializers.CharField(source='payment_status', required=False)
    tableId = serializers.CharField(source='table_id', required=False, allow_null=True, allow_blank=True)
    tableName = serializers.CharField(source='table.name', read_only=True)
    customerName = serializers.CharField(source='customer_name', required=False, allow_null=True, allow_blank=True)
    customerPhone = serializers.CharField(source='customer_phone', required=False, allow_null=True, allow_blank=True)
    deliveryAddress = serializers.CharField(source='delivery_address', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'type', 'status', 'paymentStatus', 'items', 'total',
            'createdAt', 'updatedAt', 'tableId', 'tableName',
            'customerName', 'customerPhone', 'deliveryAddress'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        table_id = validated_data.pop('table_id', None)
        
        table = None
        if table_id:
            table = Table.objects.filter(id=table_id).first()
            if table:
                table.status = 'PREPARING'
                table.save()

        order = Order.objects.create(table=table, **validated_data)
        
        total_calculated = 0
        for item_data in items_data:
            m_id = item_data.get('menu_item_id')
            menu_item = MenuItem.objects.filter(id=m_id).first() if m_id else None
            price = item_data.get('price', 0)
            qty = item_data.get('quantity', 1)
            total_calculated += (price * qty)

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                name=item_data.get('name', getattr(menu_item, 'name', 'Item')),
                price=price,
                quantity=qty,
                special_instructions=item_data.get('special_instructions', ''),
                selected_addons=item_data.get('selected_addons', [])
            )

        if not order.total or order.total == 0:
            order.total = total_calculated
            order.save()

        if table:
            table.current_order_id = order.id
            table.save()

        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        table_id = validated_data.pop('table_id', None)

        if table_id is not None:
            instance.table = Table.objects.filter(id=table_id).first()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update table status based on order status change
        if instance.table:
            if instance.status == 'COMPLETED' or instance.status == 'SERVED':
                instance.table.status = 'OCCUPIED'
                instance.table.save()
            elif instance.status == 'PREPARING':
                instance.table.status = 'PREPARING'
                instance.table.save()

        return instance
