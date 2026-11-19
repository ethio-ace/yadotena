from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import MenuCategoryViewSet, MenuItemViewSet

router = OptionalSlashRouter()
router.register(r'categories', MenuCategoryViewSet, basename='category')
router.register(r'menu', MenuItemViewSet, basename='menu')

urlpatterns = [
    path('', include(router.urls)),
]
