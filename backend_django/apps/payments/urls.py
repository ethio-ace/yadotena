from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import PaymentMethodViewSet, PaymentViewSet

router = OptionalSlashRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')

urlpatterns = [
    path('', include(router.urls)),
]
