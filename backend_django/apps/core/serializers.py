from rest_framework import serializers
from .models import RestaurantSetting

class RestaurantSettingSerializer(serializers.ModelSerializer):
    restaurantName = serializers.CharField(source='restaurant_name')
    serviceCharge = serializers.DecimalField(source='service_charge_percent', max_digits=5, decimal_places=2)
    vat = serializers.DecimalField(source='vat_percent', max_digits=5, decimal_places=2, required=False)
    guestWifiSSID = serializers.CharField(source='guest_wifi_ssid', required=False)
    guestWifiPassword = serializers.CharField(source='guest_wifi_password', required=False)

    class Meta:
        model = RestaurantSetting
        fields = [
            'restaurantName', 'phone', 'address', 'serviceCharge', 'vat',
            'guestWifiSSID', 'guestWifiPassword'
        ]


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
