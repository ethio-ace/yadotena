import uuid
from django.db import models
from apps.tables.models import Table

class ServiceRequestType(models.TextChoices):
    WAITER = 'WAITER', 'Call Waiter'
    BILL = 'BILL', 'Request Bill'
    ASSISTANCE = 'ASSISTANCE', 'Special Assistance'

class ServiceRequestStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    RESOLVED = 'RESOLVED', 'Resolved'

def generate_request_id():
    return f"req-{uuid.uuid4().hex[:8]}"

class ServiceRequest(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_request_id)
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='service_requests')
    type = models.CharField(max_length=20, choices=ServiceRequestType.choices, default=ServiceRequestType.WAITER)
    status = models.CharField(max_length=20, choices=ServiceRequestStatus.choices, default=ServiceRequestStatus.PENDING)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Service Request'
        verbose_name_plural = 'Service Requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} from {self.table.name} ({self.status})"
