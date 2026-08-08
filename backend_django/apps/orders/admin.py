from django.contrib import admin
from .models import Order, OrderItem

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'status', 'payment_status', 'table', 'customer_name', 'total', 'created_at']
    list_filter = ['type', 'status', 'payment_status', 'created_at']
    search_fields = ['id', 'customer_name', 'customer_phone', 'table__name']
    list_editable = ['status', 'payment_status']
    inlines = [OrderItemInline]
