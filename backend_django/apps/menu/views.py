from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import MenuCategory, MenuItem
from .serializers import MenuCategorySerializer, MenuItemSerializer

class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all().order_by('sort_order', 'name')
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [OrderingFilter]
    ordering_fields = ['sort_order', 'name']

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all().prefetch_related('custom_addons').select_related('category')
    serializer_class = MenuItemSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'available']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'name', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            if category.startswith('cat-'):
                queryset = queryset.filter(category_id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)
        return queryset

    @action(detail=True, methods=['post'], url_path='toggle-availability')
    def toggle_availability(self, request, pk=None):
        item = self.get_object()
        item.available = not item.available
        item.save()
        return Response(MenuItemSerializer(item).data, status=status.HTTP_200_OK)
