import re

from rest_framework import serializers
from .models import Order, OrderItem, PaymentPreference
from . import services
from apps.core.permissions import is_staff_user


def normalize_phone(raw):
    """Ethiopian mobile numbers to 09…/07… form; other numbers kept as digits.
    Returns None for anything that can't be a phone number."""
    text = str(raw or '').strip()
    digits = re.sub(r'\D', '', text)
    if digits.startswith('251') and len(digits) == 12:
        return '0' + digits[3:]
    if len(digits) == 9 and digits[0] in '79':
        return '0' + digits
    if len(digits) == 10 and digits.startswith('0'):
        return digits
    if 7 <= len(digits) <= 15:
        return ('+' if text.startswith('+') else '') + digits
    return None


class OrderItemSerializer(serializers.ModelSerializer):
    menuItemId = serializers.CharField(source='menu_item_id', required=False, allow_null=True, allow_blank=True)
    specialInstructions = serializers.CharField(source='special_instructions', required=False, allow_blank=True, allow_null=True)
    selectedAddons = serializers.ListField(source='selected_addons', required=False, default=list)
    roundNumber = serializers.IntegerField(source='round_number', read_only=True)
    startedAt = serializers.DateTimeField(source='started_at', read_only=True)
    completedAt = serializers.DateTimeField(source='completed_at', read_only=True)
    cancelReason = serializers.CharField(source='cancel_reason', read_only=True)
    cancelledAt = serializers.DateTimeField(source='cancelled_at', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'menuItemId', 'name', 'price', 'quantity',
            'specialInstructions', 'selectedAddons', 'roundNumber',
            'status', 'startedAt', 'completedAt', 'cancelReason', 'cancelledAt',
        ]
        read_only_fields = ['status']


class OrderItemInputSerializer(serializers.Serializer):
    menuItemId = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    specialInstructions = serializers.CharField(required=False, allow_blank=True, default='')
    selectedAddons = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()
    amountPaid = serializers.SerializerMethodField()
    balanceDue = serializers.SerializerMethodField()
    itemsInput = OrderItemInputSerializer(many=True, write_only=True, required=False)
    # Read-only: only recording a payment (or a manager refund) changes it.
    paymentStatus = serializers.CharField(source='payment_status', read_only=True)
    dailyNumber = serializers.IntegerField(source='daily_number', read_only=True)
    businessDate = serializers.DateField(source='business_date', read_only=True)
    createdById = serializers.CharField(source='created_by_id', read_only=True, allow_null=True)
    createdByName = serializers.SerializerMethodField()
    cancelReason = serializers.CharField(source='cancel_reason', read_only=True)
    cancelledByName = serializers.SerializerMethodField()
    cancelledAt = serializers.DateTimeField(source='cancelled_at', read_only=True)
    mergedInto = serializers.CharField(source='merged_into_id', read_only=True, allow_null=True)
    tableId = serializers.CharField(source='table_id', required=False, allow_null=True, allow_blank=True)
    tableName = serializers.CharField(source='table.name', read_only=True)
    customerName = serializers.CharField(source='customer_name', required=False, allow_null=True, allow_blank=True)
    customerPhone = serializers.CharField(source='customer_phone', required=False, allow_null=True, allow_blank=True)
    deliveryAddress = serializers.CharField(source='delivery_address', required=False, allow_null=True, allow_blank=True)
    paymentPreference = serializers.ChoiceField(source='payment_preference', choices=PaymentPreference.choices,
                                                required=False, allow_blank=True)
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
            'id', 'type', 'status', 'paymentStatus', 'items', 'payments', 'itemsInput',
            'subtotal', 'tax', 'serviceCharge', 'deliveryFee', 'total', 'amountPaid', 'balanceDue',
            'createdAt', 'updatedAt', 'tableId', 'tableName',
            'customerName', 'customerPhone', 'deliveryAddress', 'paymentPreference', 'notes', 'idempotencyKey',
            'dailyNumber', 'businessDate', 'createdById', 'createdByName',
            'cancelReason', 'cancelledByName', 'cancelledAt', 'mergedInto',
        ]
        read_only_fields = ['id', 'status', 'subtotal', 'tax', 'service_charge', 'delivery_fee', 'total']

    # Contact details and staff accountability data are staff-only.
    PRIVATE_FIELDS = ('customerPhone', 'deliveryAddress', 'createdById', 'createdByName',
                      'cancelledByName', 'cancelReason')

    @staticmethod
    def _user_name(user):
        return (user.name or user.email) if user else None

    def get_createdByName(self, order):
        return self._user_name(order.created_by)

    def get_cancelledByName(self, order):
        return self._user_name(order.cancelled_by)

    def get_payments(self, order):
        from apps.payments.serializers import PaymentSerializer
        return PaymentSerializer(order.payments.all(), many=True).data

    def get_amountPaid(self, order):
        return float(services.amount_paid(order))

    def get_balanceDue(self, order):
        # What the table still owes; >0 on a PAID-then-extended ticket too.
        return float(services.balance_due(order))

    def _request_is_staff(self):
        request = self.context.get('request')
        return bool(request) and is_staff_user(request.user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Anonymous order lookups (customer tracking page) must not leak contact details.
        if not self._request_is_staff():
            for field in self.PRIVATE_FIELDS:
                data.pop(field, None)
            for payment in data.get('payments') or []:
                for field in ('recordedById', 'recordedByName', 'notes'):
                    payment.pop(field, None)
            for item in data.get('items') or []:
                item.pop('cancelReason', None)
        return data

    def create(self, validated_data):
        # Payment state only changes through /payments (server-checked amount,
        # payment record). A "paid" POS order is settled by the view.
        validated_data.pop('payment_status', None)
        items_data = validated_data.pop('itemsInput', None) or self.initial_data.get('items', [])
        idempotency_key = validated_data.pop('idempotency_key', None)
        if not idempotency_key:
            idempotency_key = None
        validated_data.pop('table_id', None)
        table_id = self.initial_data.get('tableId') or self.initial_data.get('table_id')

        guest = not self._request_is_staff()
        # Staff counter/shop sale: the POS sends status COMPLETED (or SERVED)
        # for goods handed over on the spot, so they never hit the kitchen.
        requested = str(self.initial_data.get('status') or '').upper()
        skip_kitchen = not guest and requested in ('COMPLETED', 'SERVED')
        guest_type = str(self.initial_data.get('type') or 'DINE_IN').upper()
        if guest and guest_type == 'DELIVERY':
            # Website delivery: no table; staff call the number to confirm,
            # then approve the DRAFT round into the kitchen.
            validated_data.update(self._guest_delivery_fields(validated_data, items_data))
            table_id = None
        elif guest:
            # Public-menu orders: dine-in at a real table only, no contact or
            # delivery data, and they wait for a waiter's approval (DRAFT).
            from apps.tables.models import Table
            table = Table.objects.filter(id=table_id).first() if table_id else None
            if table is None:
                raise serializers.ValidationError({'tableId': 'Choose your table before ordering.'})
            if services.get_restaurant_settings().require_table_qr_key:
                key = str(self.initial_data.get('tableKey') or '').strip()
                if key != table.qr_token:
                    raise serializers.ValidationError({
                        'tableKey': 'Scan the QR code on your table to order from your phone.',
                    })
            if not items_data:
                raise serializers.ValidationError({'items': 'Add at least one item.'})
            validated_data['type'] = 'DINE_IN'
            for field in ('customer_phone', 'delivery_address', 'payment_preference'):
                validated_data.pop(field, None)

        payload = {
            **validated_data,
            'table_id': table_id,
        }
        return services.create_order(payload, items_data, idempotency_key=idempotency_key, guest=guest,
                                     skip_kitchen=skip_kitchen, user=self.context['request'].user)

    def _guest_delivery_fields(self, validated_data, items_data) -> dict:
        settings = services.get_restaurant_settings()
        if not settings.delivery_enabled:
            raise serializers.ValidationError({'type': 'Delivery is not available right now.'})
        if not settings.delivery_open_now():
            start = settings.delivery_start_time.strftime('%H:%M')
            end = settings.delivery_end_time.strftime('%H:%M')
            raise serializers.ValidationError({'type': f'We deliver between {start} and {end}. Please order again then.'})
        if not items_data:
            raise serializers.ValidationError({'items': 'Add at least one item.'})
        errors = {}
        name = str(validated_data.get('customer_name') or '').strip()
        if len(name) < 2:
            errors['customerName'] = 'Tell us your name.'
        phone = normalize_phone(validated_data.get('customer_phone'))
        if not phone:
            errors['customerPhone'] = 'Enter a phone number we can call (e.g. 0911 234 567).'
        address = str(validated_data.get('delivery_address') or '').strip()
        if len(address) < 5:
            errors['deliveryAddress'] = 'Tell us where to deliver (area, street, building, landmark).'
        if errors:
            raise serializers.ValidationError(errors)
        return {
            'type': 'DELIVERY',
            'customer_name': name[:200],
            'customer_phone': phone,
            'delivery_address': address[:500],
            'payment_preference': validated_data.get('payment_preference') or PaymentPreference.ON_DELIVERY,
            'notes': str(validated_data.get('notes') or '').strip()[:500],
        }

    # Editable after creation: who the order is for and how it leaves. Money,
    # status, table (use /move) and items (use add-items / kitchen) are not.
    EDITABLE_FIELDS = ('type', 'customer_name', 'customer_phone', 'delivery_address', 'payment_preference', 'notes')

    def update(self, instance, validated_data):
        if instance.status in services.TERMINAL_ORDER_STATUSES:
            raise serializers.ValidationError('A closed ticket can no longer be edited.')
        type_changed = 'type' in validated_data and validated_data['type'] != instance.type
        for attr in self.EDITABLE_FIELDS:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])
        instance.save()
        if type_changed:
            # Service charge / delivery fee depend on the order type.
            services.recalculate_order_totals(instance)
            services.sync_payment_status(instance)
        return instance
