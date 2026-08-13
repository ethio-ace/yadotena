import uuid
from django.db import models
from django.conf import settings

def generate_product_id():
    return f"prod-{uuid.uuid4().hex[:8]}"

def generate_sale_id():
    return f"psale-{uuid.uuid4().hex[:8]}"

class Product(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_product_id)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.stock_quantity} in stock)"

class ProductSale(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_sale_id)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    sold_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    sale_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Sale'
        verbose_name_plural = 'Product Sales'
        ordering = ['-sale_date']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} at {self.sale_date}"
