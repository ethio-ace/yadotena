from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm as BaseUserChangeForm
from .models import User


class UserCreationForm(BaseUserCreationForm):
    """Add-user form for the email-based User (the stock form expects ``username``)."""

    class Meta(BaseUserCreationForm.Meta):
        model = User
        fields = ('email', 'name', 'role', 'status')


class UserChangeForm(BaseUserChangeForm):
    class Meta(BaseUserChangeForm.Meta):
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    list_display = ['email', 'name', 'role', 'status', 'is_staff', 'date_joined']
    list_filter = ['role', 'status', 'is_staff', 'is_active']
    search_fields = ['email', 'name']
    ordering = ['email']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('name', 'phone', 'avatar_url')}),
        ('Restaurant Role & Status', {'fields': ('role', 'status')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    # Role decides what the person can do in the app (waiter, kitchen, ...);
    # "staff status" only controls access to this admin site.
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'role', 'status', 'password1', 'password2'),
        }),
    )
