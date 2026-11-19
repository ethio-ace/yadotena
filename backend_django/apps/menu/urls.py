from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import AddonViewSet, MenuCategoryViewSet, MenuItemViewSet

router = OptionalSlashRouter()
router.register(r'categories', MenuCategoryViewSet, basename='category')
router.register(r'menu', MenuItemViewSet, basename='menu')
router.register(r'addons', AddonViewSet, basename='addon')

urlpatterns = [
    path('', include(router.urls)),
]
