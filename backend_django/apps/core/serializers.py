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
