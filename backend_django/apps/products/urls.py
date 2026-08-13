from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, ProductSaleViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-sales', ProductSaleViewSet, basename='productsale')

urlpatterns = [
    path('', include(router.urls)),
]
