from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.authtoken.models import Token

from apps.core.activity import AuditedViewSetMixin, log_activity
from apps.core.ably_utils import create_token_request, REALTIME_CHANNEL
from apps.core.permissions import IsManager, user_role
from .models import User, UserStatus
from .serializers import UserSerializer, LoginSerializer
from .tokens import issue_token, token_expires_at


class UserViewSet(AuditedViewSetMixin, viewsets.ModelViewSet):
    audit_entity = 'STAFF'
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'email', 'date_joined', 'role']

    def _guard_target(self, target):
        """Only an owner may modify an owner account."""
        if user_role(self.request.user) != 'OWNER' and user_role(target) == 'OWNER':
            raise PermissionDenied('Only an owner can modify an owner account.')

    def perform_update(self, serializer):
        self._guard_target(serializer.instance)
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        self._guard_target(instance)
        if instance.pk == self.request.user.pk:
            raise ValidationError('You cannot delete your own account.')
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        self._guard_target(user)
        if user.pk == request.user.pk:
            raise ValidationError('You cannot deactivate your own account.')
        user.status = UserStatus.INACTIVE if user.status == UserStatus.ACTIVE else UserStatus.ACTIVE
        user.is_active = (user.status == UserStatus.ACTIVE)
        user.save()
        if not user.is_active:
            Token.objects.filter(user=user).delete()
        log_activity(request, 'TOGGLE_STAFF_STATUS', 'STAFF', user.pk,
                     f'{"Activated" if user.is_active else "Deactivated"} {user.name or user.email}',
                     next={'status': user.status})
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token = issue_token(user)
        log_activity(request, 'LOGIN', 'STAFF', user.pk, f'{user.name or user.email} signed in', user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'expiresAt': token_expires_at(token).isoformat(),
            'message': 'Login successful',
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if isinstance(request.auth, Token):
            request.auth.delete()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class AblyTokenView(APIView):
    """Issue a short-lived, subscribe-only Ably token request.

    Replaces shipping the Ably API key to the browser. Public, because
    customers receive live order updates too; the capability is read-only.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ably_token'

    def get(self, request):
        client_id = str(request.user.pk) if request.user.is_authenticated else None
        token_request = create_token_request(
            capability={REALTIME_CHANNEL: ['subscribe']},
            client_id=client_id,
        )
        if token_request is None:
            return Response({'detail': 'Realtime is not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(token_request)
