import uuid
from django.db import models

def generate_customer_id():
    return f"c-{uuid.uuid4().hex[:8]}"

class Customer(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_customer_id)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True, null=True)
    total_orders = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_order_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        ordering = ['-total_spent', '-total_orders']

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.total_spent} ETB"
