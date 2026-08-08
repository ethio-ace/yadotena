from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TableViewSet, DiningSessionViewSet

router = DefaultRouter()
router.register(r'tables', TableViewSet, basename='table')
router.register(r'sessions', DiningSessionViewSet, basename='dining-session')

urlpatterns = [
    path('', include(router.urls)),
]
