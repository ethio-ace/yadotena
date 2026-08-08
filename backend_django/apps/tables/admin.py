from django.contrib import admin
from .models import Table, DiningSession

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'capacity', 'status', 'qr_token', 'current_order_id', 'updated_at']
    list_filter = ['status']
    search_fields = ['id', 'name', 'qr_token']
    list_editable = ['status', 'capacity']

@admin.register(DiningSession)
class DiningSessionAdmin(admin.ModelAdmin):
    list_display = ['session_code', 'table', 'status', 'started_at', 'closed_at']
    list_filter = ['status']
    search_fields = ['session_code', 'table__name']
