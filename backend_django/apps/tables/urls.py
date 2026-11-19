from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import TableViewSet, DiningSessionViewSet

router = OptionalSlashRouter()
router.register(r'tables', TableViewSet, basename='table')
router.register(r'sessions', DiningSessionViewSet, basename='dining-session')

urlpatterns = [
    path('', include(router.urls)),
]
