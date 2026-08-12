import uuid
import random
from django.db import models
from apps.tables.models import Table
from apps.menu.models import MenuItem

class OrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PREPARING = 'PREPARING', 'Preparing'
    READY = 'READY', 'Ready'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class OrderType(models.TextChoices):
    DINE_IN = 'DINE_IN', 'Dine-In'
    TAKEAWAY = 'TAKEAWAY', 'Takeaway'
    DELIVERY = 'DELIVERY', 'Delivery'

class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'
    REFUNDED = 'REFUNDED', 'Refunded'

def generate_order_id():
    return f"ORD-{random.randint(1000, 9999)}"

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

    # Financial breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    service_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

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

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.quantity}x {self.name} ({self.price} ETB each)"
