from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Review
from .serializers import ReviewSerializer
from apps.core.permissions import ActionPermissionMixin, AllowAny, IsManager
from apps.core.throttles import PublicActionThrottle

class ReviewViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = Review.objects.all().select_related('order')
    serializer_class = ReviewSerializer
    action_permissions = {'create': [AllowAny]}
    default_permissions = [IsManager]
    throttle_classes = [PublicActionThrottle]
    public_throttle_scope = 'public_writes'
    public_throttle_actions = {'create'}
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['rating', 'order']
    ordering_fields = ['created_at', 'rating']
