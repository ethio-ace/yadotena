from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MenuCategoryViewSet, MenuItemViewSet

router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet, basename='category')
router.register(r'menu', MenuItemViewSet, basename='menu')

urlpatterns = [
    path('', include(router.urls)),
]
