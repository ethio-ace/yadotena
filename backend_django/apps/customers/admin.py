from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'phone', 'email', 'total_orders', 'total_spent', 'last_order_date']
    search_fields = ['name', 'phone', 'email']
    list_filter = ['created_at']
