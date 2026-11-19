"""
URL configuration for backend_django project (Yadotena Milk & Foods).
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.static import serve as serve_static


def health(_request):
    return JsonResponse({'ok': True})


def ready(_request):
    """Readiness: the database answers. /health stays cheap for keep-alive pings."""
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:
        return JsonResponse({'ok': False, 'db': False}, status=503)
    return JsonResponse({'ok': True, 'db': True})

api_v1_patterns = [
    path('auth/', include('apps.authentication.urls')),
    path('', include('apps.authentication.urls')),
    path('', include('apps.menu.urls')),
    path('', include('apps.tables.urls')),
    path('', include('apps.orders.urls')),
    path('', include('apps.service_requests.urls')),
    path('', include('apps.payments.urls')),
    path('', include('apps.expenses.urls')),
    path('', include('apps.customers.urls')),
    path('', include('apps.reviews.urls')),
    path('', include('apps.core.urls')),
    path('', include('apps.products.urls')),
]

urlpatterns = [
    re_path(r'^health/?$', health, name='health'),
    re_path(r'^ready/?$', ready, name='ready'),
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
elif settings.SERVE_MEDIA:
    # static() is a no-op when DEBUG is off; keep uploaded menu images working.
    urlpatterns += [
        re_path(r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'), serve_static,
                {'document_root': settings.MEDIA_ROOT}),
    ]
