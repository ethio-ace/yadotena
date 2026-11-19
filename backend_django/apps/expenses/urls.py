from django.urls import path, include
from apps.core.routers import OptionalSlashRouter
from .views import ExpenseViewSet

router = OptionalSlashRouter()
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
