import uuid
from django.db import models
from apps.orders.models import Order, PaymentStatus

class PaymentMethod(models.TextChoices):
    TELEBIRR = 'TELEBIRR', 'Telebirr'
    CHAPA = 'CHAPA', 'Chapa / Digital'
    CARD = 'CARD', 'Credit / Debit Card'
    CASH = 'CASH', 'Cash'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.TELEBIRR)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PAID)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.method} - {self.amount} ETB ({self.status})"
