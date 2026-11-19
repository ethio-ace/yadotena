import django
from django.apps import AppConfig


def _apply_sqlite_pragmas(sender, connection, **kwargs):
    """Fallback for Django < 5.1, which has no sqlite ``init_command`` option."""
    if connection.vendor != 'sqlite':
        return
    from django.conf import settings
    with connection.cursor() as cursor:
        for pragma in settings.SQLITE_PRAGMAS.split(';'):
            if pragma.strip():
                cursor.execute(pragma)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Core Settings & System Reports'

    def ready(self):
        if django.VERSION < (5, 1):
            from django.db.backends.signals import connection_created
            connection_created.connect(_apply_sqlite_pragmas, dispatch_uid='yadotena-sqlite-pragmas')
