import uuid
from django.db import models
from apps.orders.models import Order, PaymentStatus


def generate_payment_method_id():
    return f"pm-{uuid.uuid4().hex[:8]}"


class PaymentMethodType(models.TextChoices):
    DIGITAL = 'DIGITAL', 'Digital transfer'
    CASH = 'CASH', 'Cash'


class PaymentMethod(models.Model):
    """A way customers can pay (cash, Telebirr, a bank account...).

    Managed by owners/managers and shown to customers with account details.
    """
    id = models.CharField(max_length=50, primary_key=True, default=generate_payment_method_id)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20, choices=PaymentMethodType.choices, default=PaymentMethodType.DIGITAL)
    account_number = models.CharField(max_length=120, blank=True, default='')
    account_name = models.CharField(max_length=200, blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    qr_code_url = models.CharField(max_length=500, blank=True, default='')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def save(self, *args, **kwargs):
        self.code = (self.code or '').strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    # Method code (e.g. CASH, TELEBIRR, CBE); kept as text so history survives
    # a method being renamed or deleted.
    method = models.CharField(max_length=50, default='CASH')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PAID)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    receipt_url = models.CharField(max_length=500, blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.method} - {self.amount} ETB ({self.status})"
