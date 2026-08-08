import uuid
from django.db import models
from apps.orders.models import Order

def generate_review_id():
    return f"rev-{uuid.uuid4().hex[:8]}"

class Review(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_review_id)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews')
    customer_name = models.CharField(max_length=200, default='Guest')
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Customer Review'
        verbose_name_plural = 'Customer Reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.customer_name} ({self.rating}★): {self.comment[:30]}"
