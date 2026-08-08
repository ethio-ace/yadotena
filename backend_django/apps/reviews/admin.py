from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_name', 'rating', 'order', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['customer_name', 'comment']
