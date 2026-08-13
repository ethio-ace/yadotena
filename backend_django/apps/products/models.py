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
    unit = models.CharField(max_length=20, default='pcs')
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.stock_quantity} {self.unit} in stock)"

class ProductSale(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_sale_id)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    sold_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    sale_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Sale'
        verbose_name_plural = 'Product Sales'
        ordering = ['-sale_date']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} at {self.sale_date}"

def generate_purchase_id():
    return f"ppur-{uuid.uuid4().hex[:8]}"

class ProductPurchase(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_purchase_id)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    purchased_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    purchase_date = models.DateTimeField(auto_now_add=True)
    expense = models.OneToOneField('expenses.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='product_purchase')

    class Meta:
        verbose_name = 'Product Purchase'
        verbose_name_plural = 'Product Purchases'
        ordering = ['-purchase_date']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} cost {self.total_cost} ETB"
