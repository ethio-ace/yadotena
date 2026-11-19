from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.core.media import save_image
from apps.core.permissions import ActionPermissionMixin, AllowAny, IsStaff, IsManager, is_manager_user
from .models import AddonScope, MenuCategory, MenuItem, MenuItemAddon
from .serializers import AddonSerializer, MenuCategorySerializer, MenuItemSerializer

class MenuCategoryViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all().order_by('sort_order', 'name')
    serializer_class = MenuCategorySerializer
    action_permissions = {'list': [AllowAny], 'retrieve': [AllowAny]}
    default_permissions = [IsManager]
    filter_backends = [OrderingFilter]
    ordering_fields = ['sort_order', 'name']

class MenuItemViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = MenuItem.objects.all().prefetch_related('custom_addons').select_related('category')
    serializer_class = MenuItemSerializer
    action_permissions = {
        'list': [AllowAny],
        'retrieve': [AllowAny],
        # Kitchen/floor staff can mark a dish sold out.
        'toggle_availability': [IsStaff],
        'addons': [AllowAny],
    }
    default_permissions = [IsManager]
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

    @action(detail=True, methods=['get'], url_path='addons')
    def addons(self, request, pk=None):
        """Every active addon a customer may add to this item (global + category + item)."""
        item = self.get_object()
        qs = MenuItemAddon.applicable_to(item).select_related('category', 'menu_item')
        return Response(AddonSerializer(qs, many=True, context={'request': request}).data)


class AddonViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    serializer_class = AddonSerializer
    action_permissions = {'list': [AllowAny], 'retrieve': [AllowAny]}
    default_permissions = [IsManager]

    def get_queryset(self):
        qs = MenuItemAddon.objects.select_related('category', 'menu_item')
        if not is_manager_user(self.request.user):
            qs = qs.filter(is_active=True)
        if self.action != 'list':
            return qs
        params = self.request.query_params
        category = params.get('category_id') or params.get('categoryId')
        menu_item = params.get('menu_item_id') or params.get('menuItemId')
        scope = (params.get('scope') or '').upper()
        if category:
            qs = qs.filter(category_id=category)
        if menu_item:
            qs = qs.filter(menu_item_id=menu_item)
        if scope == AddonScope.GLOBAL:
            qs = qs.filter(is_global=True)
        elif scope == AddonScope.CATEGORY:
            qs = qs.filter(category__isnull=False, is_global=False)
        elif scope == AddonScope.ITEM:
            qs = qs.filter(menu_item__isnull=False)
        if params.get('active') in ('true', 'false'):
            qs = qs.filter(is_active=params['active'] == 'true')
        return qs

    def _image_url(self):
        upload = self.request.FILES.get('image')
        return save_image(upload, folder='addons') if upload else None

    def perform_create(self, serializer):
        image_url = self._image_url()
        serializer.save(**({'image_url': image_url} if image_url else {}))

    def perform_update(self, serializer):
        image_url = self._image_url()
        serializer.save(**({'image_url': image_url} if image_url else {}))
