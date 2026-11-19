from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import CustomerViewSet

router = OptionalSlashRouter()
router.register(r'customers', CustomerViewSet, basename='customer')

urlpatterns = [
    path('', include(router.urls)),
]
