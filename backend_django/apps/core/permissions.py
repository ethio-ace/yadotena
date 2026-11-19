"""
Role-based permissions for the Yadotena API.

Roles (apps.authentication.models.Role):
  OWNER, MANAGER  -> "managers": full back-office access
  WAITER, KITCHEN -> floor staff: orders, tables, service requests
  CUSTOMER / anonymous -> only the explicitly public endpoints

Views declare per-action permissions with ``ActionPermissionMixin``:

    class FooViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
        action_permissions = {
            'list': [IsStaff],
            'create': [AllowAny],
        }
        default_permissions = [IsManager]
"""
from rest_framework.permissions import AllowAny, BasePermission, SAFE_METHODS

MANAGER_ROLES = frozenset({'OWNER', 'MANAGER'})
STAFF_ROLES = frozenset({'OWNER', 'MANAGER', 'WAITER', 'KITCHEN'})


def user_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return 'OWNER'
    return getattr(user, 'role', None)


def is_staff_user(user):
    return user_role(user) in STAFF_ROLES


def is_manager_user(user):
    return user_role(user) in MANAGER_ROLES


class IsStaff(BasePermission):
    message = 'Staff access required.'

    def has_permission(self, request, view):
        return is_staff_user(request.user)


class IsManager(BasePermission):
    message = 'Owner or manager access required.'

    def has_permission(self, request, view):
        return is_manager_user(request.user)


class IsOwner(BasePermission):
    message = 'Owner access required.'

    def has_permission(self, request, view):
        return user_role(request.user) == 'OWNER'


class ReadOnlyOrManager(BasePermission):
    """Anyone may read; only owners/managers may write."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_manager_user(request.user)


class ActionPermissionMixin:
    """Resolve permission classes from ``action_permissions[self.action]``."""

    action_permissions = {}
    default_permissions = [IsManager]

    def get_permissions(self):
        classes = self.action_permissions.get(getattr(self, 'action', None), self.default_permissions)
        return [cls() for cls in classes]


__all__ = [
    'AllowAny', 'IsStaff', 'IsManager', 'IsOwner', 'ReadOnlyOrManager',
    'ActionPermissionMixin', 'is_staff_user', 'is_manager_user', 'user_role',
    'MANAGER_ROLES', 'STAFF_ROLES',
]
