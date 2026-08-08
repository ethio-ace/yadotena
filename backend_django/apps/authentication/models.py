import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.OWNER)
        extra_fields.setdefault('status', UserStatus.ACTIVE)
        return self.create_user(email, password, **extra_fields)

class Role(models.TextChoices):
    OWNER = 'OWNER', 'Owner'
    MANAGER = 'MANAGER', 'Manager'
    WAITER = 'WAITER', 'Waiter'
    KITCHEN = 'KITCHEN', 'Kitchen Staff'
    CUSTOMER = 'CUSTOMER', 'Customer'

class UserStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Use email as unique identifier
    email = models.EmailField('email address', unique=True)
    name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['name', 'email']

    def __str__(self):
        return f"{self.name or self.email} ({self.role})"
