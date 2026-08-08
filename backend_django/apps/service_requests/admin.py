from django.contrib import admin
from .models import ServiceRequest

@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'table', 'type', 'status', 'created_at', 'resolved_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['table__name', 'notes']
    list_editable = ['status']
