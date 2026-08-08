import uuid
from django.db import models

class TableStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    OCCUPIED = 'OCCUPIED', 'Occupied'
    ORDERING = 'ORDERING', 'Ordering'
    PREPARING = 'PREPARING', 'Preparing Food'
    WAITING_FOR_SERVICE = 'WAITING_FOR_SERVICE', 'Waiting for Service'
    WAITING_FOR_PAYMENT = 'WAITING_FOR_PAYMENT', 'Waiting for Payment'
    CLEANING = 'CLEANING', 'Cleaning Required'

def generate_qr_token():
    return uuid.uuid4().hex[:12]

class Table(models.Model):
    id = models.CharField(max_length=50, primary_key=True)  # e.g. 't1', 't2'
    name = models.CharField(max_length=100)                # e.g. 'Table 01'
    capacity = models.PositiveIntegerField(default=4)
    status = models.CharField(
        max_length=30,
        choices=TableStatus.choices,
        default=TableStatus.AVAILABLE
    )
    qr_token = models.CharField(max_length=100, unique=True, default=generate_qr_token)
    current_order_id = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Table'
        verbose_name_plural = 'Tables'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.status})"

class DiningSession(models.Model):
    class SessionStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        BILLED = 'BILLED', 'Billed'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='sessions')
    session_code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=SessionStatus.choices, default=SessionStatus.ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Dining Session'
        verbose_name_plural = 'Dining Sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.table.name} - #{self.session_code} ({self.status})"
