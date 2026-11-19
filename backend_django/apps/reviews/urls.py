from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import ReviewViewSet

router = OptionalSlashRouter()
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
]
