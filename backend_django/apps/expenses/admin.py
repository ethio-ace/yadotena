from django.contrib import admin
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['id', 'category', 'amount', 'date', 'recorded_by', 'payment_method', 'created_at']
    list_filter = ['category', 'payment_method', 'date']
    search_fields = ['description', 'category']
