from django.urls import path, include
from apps.core.routers import optional_slash
from apps.core.routers import OptionalSlashRouter
from .views import LoginView, LogoutView, CurrentUserView, UserViewSet, AblyTokenView

router = OptionalSlashRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    optional_slash('login', LoginView.as_view(), name='auth-login'),
    optional_slash('logout', LogoutView.as_view(), name='auth-logout'),
    optional_slash('me', CurrentUserView.as_view(), name='auth-me'),
    optional_slash('ably-token', AblyTokenView.as_view(), name='auth-ably-token'),
    path('', include(router.urls)),
]
