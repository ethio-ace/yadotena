"""
URL configuration for backend_django project (Yadotena Milk & Foods).
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
