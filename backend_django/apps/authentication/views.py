from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import User, UserStatus
from .serializers import UserSerializer, LoginSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'email', 'date_joined', 'role']

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.status = UserStatus.INACTIVE if user.status == UserStatus.ACTIVE else UserStatus.ACTIVE
        user.is_active = (user.status == UserStatus.ACTIVE)
        user.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)

class CurrentUserView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
