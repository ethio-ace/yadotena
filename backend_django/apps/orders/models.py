import secrets
import uuid
from django.conf import settings
from django.db import models
from apps.tables.models import Table
from apps.menu.models import MenuItem

class OrderStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PENDING = 'PENDING', 'Pending'
    PREPARING = 'PREPARING', 'Preparing'
    READY = 'READY', 'Ready'
    SERVED = 'SERVED', 'Served'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ItemStatus(models.TextChoices):
    """Kitchen lifecycle of a single order line (one round can be cooked
    while another is still being served).

    DRAFT = placed by a guest from the public menu and waiting for a waiter
    to approve it; the kitchen never sees DRAFT items."""
    DRAFT = 'DRAFT', 'Awaiting approval'
    PENDING = 'PENDING', 'Pending'
    PREPARING = 'PREPARING', 'Preparing'
    READY = 'READY', 'Ready'
    SERVED = 'SERVED', 'Served'
    CANCELLED = 'CANCELLED', 'Cancelled'

class OrderType(models.TextChoices):
    DINE_IN = 'DINE_IN', 'Dine-In'
    TAKEAWAY = 'TAKEAWAY', 'Takeaway'
    DELIVERY = 'DELIVERY', 'Delivery'

class PaymentPreference(models.TextChoices):
    """How a delivery customer said they will pay (a hint for staff, not money)."""
    ON_DELIVERY = 'ON_DELIVERY', 'Pay on delivery'
    TRANSFER = 'TRANSFER', 'Transfer before delivery'


class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'
    REFUNDED = 'REFUNDED', 'Refunded'

# No 0/O/1/I/L to keep ids readable aloud. 10 chars ~= 49 bits: unguessable
# (public order lookup relies on this) and collision-free at cafe scale.
ORDER_ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generate_order_id():
    return "ORD-" + "".join(secrets.choice(ORDER_ID_ALPHABET) for _ in range(10))

def generate_order_item_id():
    return f"item-{uuid.uuid4().hex[:8]}"

class Order(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_order_id)
    type = models.CharField(max_length=20, choices=OrderType.choices, default=OrderType.DINE_IN)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    
    # Dine-In connection
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    
    # Takeaway / Delivery customer info
    customer_name = models.CharField(max_length=200, blank=True, null=True)
    customer_phone = models.CharField(max_length=50, blank=True, null=True)
    delivery_address = models.TextField(blank=True, null=True)
    payment_preference = models.CharField(max_length=20, choices=PaymentPreference.choices, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    # Financial breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    service_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)

    # Short number staff call out ("#27"); restarts every cafe day.
    business_date = models.DateField(null=True, blank=True, db_index=True)
    daily_number = models.PositiveIntegerField(null=True, blank=True)
    # Staff member who took the order (for guest orders: the waiter who approved it).
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='orders_taken')
    cancel_reason = models.CharField(max_length=255, blank=True, default='')
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='orders_cancelled')
    cancelled_at = models.DateTimeField(null=True, blank=True)
    # Set when this ticket was folded into another table's ticket (table move).
    merged_into = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='merged_from')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['business_date', 'daily_number'], name='unique_daily_ticket_number'),
        ]

    def __str__(self):
        return f"{self.id} [{self.type}] - {self.status} ({self.total} ETB)"

class OrderItem(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_order_item_id)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    special_instructions = models.TextField(blank=True, null=True)
    selected_addons = models.JSONField(default=list, blank=True)
    round_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.PENDING, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Why a line was cancelled/voided, by whom and when (void report).
    cancel_reason = models.CharField(max_length=255, blank=True, default='')
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='items_cancelled')
    cancelled_at = models.DateTimeField(null=True, blank=True)
    # Recipe stock already taken for this line (taken once, when cooking starts).
    stock_deducted = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.quantity}x {self.name} ({self.price} ETB each)"
