from django.db import models

class RestaurantSetting(models.Model):
    restaurant_name = models.CharField(max_length=200, default="Yadotena Milk & Foods")
    phone = models.CharField(max_length=50, default="+251 91 123 4567")
    address = models.CharField(max_length=255, default="Bole Road, Addis Ababa")
    service_charge_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)
    guest_wifi_ssid = models.CharField(max_length=100, default="Yadotena_Milk_5G")
    guest_wifi_password = models.CharField(max_length=100, default="Yadotena2026")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Restaurant Setting'
        verbose_name_plural = 'Restaurant Settings'

    def __str__(self):
        return f"{self.restaurant_name} Settings"

    @classmethod
    def get_settings(cls):
        setting, created = cls.objects.get_or_create(id=1)
        return setting


class MediaAsset(models.Model):
    """One stored upload, keyed by content hash so identical files are kept once."""
    sha256_hash = models.CharField(max_length=64, unique=True)
    original_filename = models.CharField(max_length=255, blank=True, default='')
    storage_key = models.CharField(max_length=512)
    content_type = models.CharField(max_length=100, default='image/webp')
    file_size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.storage_key
