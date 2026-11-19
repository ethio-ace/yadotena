from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import OrderViewSet

router = OptionalSlashRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
