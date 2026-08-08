from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, LogoutView, CurrentUserView, UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', CurrentUserView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]
