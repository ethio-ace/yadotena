from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import PaymentViewSet

router = OptionalSlashRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
