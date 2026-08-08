from django.contrib import admin
from .models import RestaurantSetting

@admin.register(RestaurantSetting)
class RestaurantSettingAdmin(admin.ModelAdmin):
    list_display = ['restaurant_name', 'phone', 'service_charge_percent', 'guest_wifi_ssid', 'updated_at']
