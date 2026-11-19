from django.urls import re_path
from rest_framework.routers import SimpleRouter


class OptionalSlashRouter(SimpleRouter):
    """Router whose routes match with or without a trailing slash.

    The frontend strips trailing slashes (``/orders/ORD-X``) while older clients
    send them (``/orders/ORD-X/``). APPEND_SLASH cannot redirect POST/PATCH, so
    both forms must resolve directly.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = '/?'


def optional_slash(route: str, view, name=None):
    """``path()`` equivalent for a literal route that accepts an optional slash."""
    route = route.strip('/')
    return re_path(rf'^{route}/?$', view, name=name)
