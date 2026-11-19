from rest_framework import serializers
from .models import Payment, PaymentMethod


class PaymentSerializer(serializers.ModelSerializer):
    orderId = serializers.CharField(source='order_id', read_only=True)
    paymentMethodId = serializers.CharField(source='payment_method_id', read_only=True)
    transactionRef = serializers.CharField(source='transaction_ref', read_only=True)
    receiptUrl = serializers.CharField(source='receipt_url', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'orderId', 'method', 'paymentMethodId', 'amount', 'status',
                  'transactionRef', 'receiptUrl', 'notes', 'createdAt']
        read_only_fields = fields


class PaymentCreateSerializer(serializers.Serializer):
    orderId = serializers.CharField()
    method = serializers.CharField(required=False, allow_blank=True, default='CASH')
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    status = serializers.CharField(required=False, default='PAID')
    transactionRef = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    reference = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    receiptUrl = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=500)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')


class PaymentMethodSerializer(serializers.ModelSerializer):
    accountNumber = serializers.CharField(source='account_number', required=False, allow_blank=True)
    accountName = serializers.CharField(source='account_name', required=False, allow_blank=True)
    qrCodeUrl = serializers.CharField(source='qr_code_url', required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', required=False)
    sortOrder = serializers.IntegerField(source='sort_order', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'code', 'type', 'accountNumber', 'accountName', 'instructions',
                  'qrCodeUrl', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
        read_only_fields = ['id', 'createdAt', 'updatedAt']
        extra_kwargs = {'instructions': {'required': False, 'allow_blank': True}}

    def validate_code(self, value):
        value = value.strip().upper()
        qs = PaymentMethod.objects.filter(code=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A payment method with this code already exists.')
        return value

    def to_internal_value(self, data):
        # Accept enum values in any case ("digital", "Cash").
        if hasattr(data, 'get') and isinstance(data.get('type'), str):
            data = {**data, 'type': data['type'].strip().upper()}
        return super().to_internal_value(data)
