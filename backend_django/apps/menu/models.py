import uuid
from django.db import models

def generate_category_id():
    return f"cat-{uuid.uuid4().hex[:8]}"

def generate_menu_item_id():
    return f"m-{uuid.uuid4().hex[:8]}"

def generate_addon_id():
    return f"add-{uuid.uuid4().hex[:8]}"

class MenuCategory(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_category_id)
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, default="🍽️")
    description = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Menu Category'
        verbose_name_plural = 'Menu Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"

class MenuItem(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_menu_item_id)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name='items'
    )
    image = models.URLField(max_length=500, blank=True, null=True)
    available = models.BooleanField(default=True)
    preparation_time = models.PositiveIntegerField(default=15, help_text="Preparation time in minutes")
    dietary_tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Menu Item'
        verbose_name_plural = 'Menu Items'
        ordering = ['category__sort_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.price} ETB)"

class MenuItemAddon(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_addon_id)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='custom_addons')
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Addon price in ETB")

    class Meta:
        verbose_name = 'Menu Item Addon'
        verbose_name_plural = 'Menu Item Addons'

    def __str__(self):
        return f"{self.name} (+{self.price} ETB)"
