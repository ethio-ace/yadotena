from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

class RestaurantSetting(models.Model):
    restaurant_name = models.CharField(max_length=200, default="Hilif Milk & Foods")
    phone = models.CharField(max_length=50, default="+251 91 123 4567")
    address = models.CharField(max_length=255, default="Bole Road, Addis Ababa")
    service_charge_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    # 0 = not VAT-registered (the cafe today): no VAT line on bills. Only a
    # VAT-registered business may charge VAT.
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    # When on, a guest order must carry the table's secret QR key (printed in
    # the table QR), so nobody can order to a table by guessing its id.
    # Off until the new QR codes are printed and on the tables.
    require_table_qr_key = models.BooleanField(default=False)
    # Website delivery: off until the owner launches it. Hours are cafe-local
    # (Addis) times; either left empty = no limit. A window may cross midnight.
    delivery_enabled = models.BooleanField(default=False)
    delivery_start_time = models.TimeField(null=True, blank=True)
    delivery_end_time = models.TimeField(null=True, blank=True)
    guest_wifi_ssid = models.CharField(max_length=100, default="Hilif_Milk_5G")
    guest_wifi_password = models.CharField(max_length=100, default="Hilif2026")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Restaurant Setting'
        verbose_name_plural = 'Restaurant Settings'

    def __str__(self):
        return f"{self.restaurant_name} Settings"

    def delivery_open_now(self, now=None) -> bool:
        """Is website delivery accepting orders right now (cafe-local time)?"""
        if not self.delivery_enabled:
            return False
        start, end = self.delivery_start_time, self.delivery_end_time
        if not start or not end or start == end:
            return True
        from django.utils import timezone
        t = (now or timezone.localtime()).time()
        if start < end:
            return start <= t < end
        return t >= start or t < end  # e.g. 18:00 → 02:00

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


def generate_activity_id():
    import uuid
    return f"log-{uuid.uuid4().hex}"


class ActivityLog(models.Model):
    """Who did what to which record, with before/after snapshots."""
    id = models.CharField(max_length=64, primary_key=True, default=generate_activity_id)
    user_id = models.CharField(max_length=64, default='system', db_index=True)
    user_name = models.CharField(max_length=128, default='System')
    user_role = models.CharField(max_length=32, default='SYSTEM', db_index=True)
    action = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=64)
    entity_id = models.CharField(max_length=64)
    description = models.TextField()
    prev_state = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    next_state = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    ip_address = models.CharField(max_length=45, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['entity_type', 'entity_id'])]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.user_name}: {self.action}"


class DayClose(models.Model):
    """End-of-day cash count. ``summary`` freezes the day-close report as it
    stood when the manager closed the day."""
    business_date = models.DateField(unique=True)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2)
    counted_cash = models.DecimalField(max_digits=12, decimal_places=2)
    difference = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    summary = models.JSONField(default=dict, encoder=DjangoJSONEncoder)
    closed_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='day_closes')
    closed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-business_date']

    def __str__(self):
        return f"Day close {self.business_date} (diff {self.difference})"
