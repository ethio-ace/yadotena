from rest_framework import serializers
from .models import RestaurantSetting

class RestaurantSettingSerializer(serializers.ModelSerializer):
    """Go API field names; older names (serviceCharge, vat, guestWifiSSID)
    are still accepted and returned for existing clients."""
    LEGACY_INPUT = {'serviceCharge': 'serviceChargePercent', 'vat': 'vatPercent', 'guestWifiSSID': 'guestWifiSsid'}

    restaurantName = serializers.CharField(source='restaurant_name', required=False)
    serviceChargePercent = serializers.DecimalField(source='service_charge_percent', max_digits=5, decimal_places=2,
                                                    min_value=0, max_value=100, required=False)
    vatPercent = serializers.DecimalField(source='vat_percent', max_digits=5, decimal_places=2,
                                          min_value=0, max_value=100, required=False)
    deliveryFee = serializers.DecimalField(source='delivery_fee', max_digits=10, decimal_places=2,
                                           min_value=0, required=False)
    requireTableQrKey = serializers.BooleanField(source='require_table_qr_key', required=False)
    guestWifiSsid = serializers.CharField(source='guest_wifi_ssid', required=False, allow_blank=True)
    guestWifiPassword = serializers.CharField(source='guest_wifi_password', required=False, allow_blank=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = RestaurantSetting
        fields = [
            'restaurantName', 'phone', 'address', 'serviceChargePercent', 'vatPercent',
            'deliveryFee', 'requireTableQrKey', 'guestWifiSsid', 'guestWifiPassword', 'updatedAt',
        ]
        extra_kwargs = {'phone': {'required': False}, 'address': {'required': False}}

    def to_internal_value(self, data):
        data = dict(data)
        for old, new in self.LEGACY_INPUT.items():
            if old in data and new not in data:
                data[new] = data.pop(old)
        return super().to_internal_value(data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for old, new in self.LEGACY_INPUT.items():
            data[old] = data[new]
        return data


class ActivityLogSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source='user_id')
    userName = serializers.CharField(source='user_name')
    userRole = serializers.CharField(source='user_role')
    entityType = serializers.CharField(source='entity_type')
    entityId = serializers.CharField(source='entity_id')
    prevState = serializers.JSONField(source='prev_state')
    nextState = serializers.JSONField(source='next_state')
    ipAddress = serializers.CharField(source='ip_address')
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        from .models import ActivityLog
        model = ActivityLog
        fields = ['id', 'userId', 'userName', 'userRole', 'action', 'entityType', 'entityId',
                  'description', 'prevState', 'nextState', 'ipAddress', 'createdAt']
        read_only_fields = fields
