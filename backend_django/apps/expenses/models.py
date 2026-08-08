import uuid
from django.db import models
from django.utils import timezone
from apps.authentication.models import User

class ExpenseCategory(models.TextChoices):
    DAIRY_SUPPLIES = 'Dairy Supplies', 'Dairy & Milk Supplies'
    KITCHEN_SUPPLIES = 'Kitchen Supplies', 'Kitchen & Food Supplies'
    PACKAGING = 'Packaging', 'Packaging & Takeaway'
    UTILITIES = 'Utilities', 'Utilities (Power, Water, Gas)'
    MAINTENANCE = 'Maintenance', 'Maintenance & Repairs'
    SALARIES = 'Salaries', 'Staff Salaries'
    TRANSPORTATION = 'Transportation', 'Transportation & Logistics'
    OTHER = 'Other', 'Other Expenses'

def generate_expense_id():
    return f"exp-{uuid.uuid4().hex[:8]}"

class Expense(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_expense_id)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50, choices=ExpenseCategory.choices, default=ExpenseCategory.DAIRY_SUPPLIES)
    description = models.TextField()
    date = models.DateField(default=timezone.now)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_expenses')
    payment_method = models.CharField(max_length=50, default='Cash')
    receipt_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.category}: {self.amount} ETB - {self.description[:30]}"
