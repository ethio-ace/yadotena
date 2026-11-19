from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import ServiceRequestViewSet

router = OptionalSlashRouter()
router.register(r'service-requests', ServiceRequestViewSet, basename='service-request')

urlpatterns = [
    path('', include(router.urls)),
]
