from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import ProductViewSet, ProductSaleViewSet, ProductPurchaseViewSet

router = OptionalSlashRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-sales', ProductSaleViewSet, basename='productsale')
router.register(r'product-purchases', ProductPurchaseViewSet, basename='productpurchase')

urlpatterns = [
    path('', include(router.urls)),
]
