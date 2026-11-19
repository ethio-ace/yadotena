import json

from rest_framework import serializers
from apps.core.media import absolute_url
from .models import AddonScope, MenuCategory, MenuItem, MenuItemAddon


def _truthy(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


class MenuItemAddonSerializer(serializers.ModelSerializer):
    """Compact addon as embedded in a menu item (``customAddons``)."""
    imageUrl = serializers.SerializerMethodField()

    class Meta:
        model = MenuItemAddon
        fields = ['id', 'name', 'price', 'description', 'imageUrl']

    def get_imageUrl(self, obj):
        return absolute_url(self.context.get('request'), obj.image_url) or ''


class AddonSerializer(serializers.ModelSerializer):
    """Standalone addon management (/addons), Go API field names."""
    scope = serializers.ChoiceField(choices=AddonScope.choices, required=False)
    categoryId = serializers.PrimaryKeyRelatedField(source='category', queryset=MenuCategory.objects.all(),
                                                    required=False, allow_null=True)
    categoryName = serializers.CharField(source='category.name', read_only=True, default=None)
    menuItemId = serializers.PrimaryKeyRelatedField(source='menu_item', queryset=MenuItem.objects.all(),
                                                    required=False, allow_null=True)
    menuItemName = serializers.CharField(source='menu_item.name', read_only=True, default=None)
    isGlobal = serializers.BooleanField(source='is_global', required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    sortOrder = serializers.IntegerField(source='sort_order', required=False)
    imageUrl = serializers.CharField(source='image_url', required=False, allow_blank=True, max_length=500)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = MenuItemAddon
        fields = ['id', 'name', 'description', 'price', 'imageUrl', 'scope', 'categoryId', 'categoryName',
                  'menuItemId', 'menuItemName', 'isGlobal', 'isActive', 'sortOrder', 'createdAt']
        read_only_fields = ['id', 'createdAt']
        extra_kwargs = {'description': {'required': False, 'allow_blank': True}}

    def to_internal_value(self, data):
        # Multipart forms send everything as strings; "image" may be a URL.
        data = {k: data.get(k) for k in data.keys()} if hasattr(data, 'getlist') else dict(data)
        if isinstance(data.get('image'), str) and not data.get('imageUrl'):
            data['imageUrl'] = data['image']
        data.pop('image', None)
        for key in ('isGlobal', 'isActive'):
            if key in data and not isinstance(data[key], bool):
                data[key] = _truthy(data[key])
        for key in ('categoryId', 'menuItemId'):
            if data.get(key) == '':
                data[key] = None
        if isinstance(data.get('scope'), str):
            data['scope'] = data['scope'].strip().upper() or None
            if data['scope'] is None:
                data.pop('scope')
        return super().to_internal_value(data)

    def validate(self, attrs):
        """Exactly one target: global, a category, or a menu item."""
        instance = self.instance
        scope = attrs.pop('scope', None)
        category = attrs.get('category', instance.category if instance else None)
        menu_item = attrs.get('menu_item', instance.menu_item if instance else None)
        is_global = attrs.get('is_global', instance.is_global if instance else False)

        if scope is None:
            if 'is_global' in attrs and is_global:
                scope = AddonScope.GLOBAL
            elif 'category' in attrs and category:
                scope = AddonScope.CATEGORY
            elif 'menu_item' in attrs and menu_item:
                scope = AddonScope.ITEM
            elif instance is not None:
                scope = instance.scope
            else:
                scope = AddonScope.GLOBAL if is_global else (
                    AddonScope.CATEGORY if category else (AddonScope.ITEM if menu_item else None))
        if scope is None:
            raise serializers.ValidationError({'scope': 'Choose GLOBAL, CATEGORY (with categoryId) or ITEM (with menuItemId).'})

        if scope == AddonScope.GLOBAL:
            attrs.update(is_global=True, category=None, menu_item=None)
        elif scope == AddonScope.CATEGORY:
            if not category:
                raise serializers.ValidationError({'categoryId': 'categoryId is required for CATEGORY scoped addons.'})
            attrs.update(is_global=False, category=category, menu_item=None)
        else:
            if not menu_item:
                raise serializers.ValidationError({'menuItemId': 'menuItemId is required for ITEM scoped addons.'})
            attrs.update(is_global=False, category=None, menu_item=menu_item)
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['scope'] = instance.scope
        data['imageUrl'] = absolute_url(self.context.get('request'), instance.image_url) or ''
        data['image'] = data['imageUrl']
        return data

class MenuCategorySerializer(serializers.ModelSerializer):
    sortOrder = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'icon', 'description', 'sortOrder', 'is_active']

class MenuItemSerializer(serializers.ModelSerializer):
    customAddons = MenuItemAddonSerializer(source='custom_addons', many=True, read_only=True)
    preparationTime = serializers.IntegerField(source='preparation_time', required=False, default=15)
    dietaryTags = serializers.ListField(source='dietary_tags', required=False, default=list)
    categoryName = serializers.SerializerMethodField(read_only=True)
    categoryId = serializers.CharField(source='category_id', read_only=True)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    imageUrl = serializers.CharField(source='image_url', required=False, allow_blank=True, max_length=500)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category', 'categoryId', 'categoryName',
            'image', 'imageUrl', 'available', 'preparationTime', 'dietaryTags', 'customAddons',
            'createdAt', 'updatedAt',
        ]

    def get_categoryName(self, obj):
        return obj.category.name if obj.category else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure category field in response matches frontend expectation (string name or id)
        if instance.category:
            ret['category'] = instance.category.name
        # One image URL for clients: an uploaded file wins over a pasted link.
        request = self.context.get('request')
        image = absolute_url(request, instance.image.url) if instance.image else absolute_url(request, instance.image_url)
        ret['image'] = ret['imageUrl'] = image or ''
        return ret

    def to_internal_value(self, data):
        # Plain dict (multipart QueryDicts mangle list values); files kept.
        data = {k: data.get(k) for k in data.keys()} if hasattr(data, 'getlist') else dict(data)
        # "image" may be a pasted URL instead of a file (Go API accepted both).
        if isinstance(data.get('image'), str):
            if not data.get('imageUrl'):
                data['imageUrl'] = data['image']
            data.pop('image')
        # The form sends categoryId (and sometimes a display name in category).
        if data.get('categoryId'):
            data['category'] = data.pop('categoryId')
        for key in ('available',):
            if isinstance(data.get(key), str):
                data[key] = _truthy(data[key])
        if 'dietaryTags' in data and isinstance(data['dietaryTags'], str):
            try:
                data['dietaryTags'] = json.loads(data['dietaryTags'])
            except ValueError:
                data['dietaryTags'] = [t.strip() for t in data['dietaryTags'].split(',') if t.strip()]
        return super().to_internal_value(data)

    def create(self, validated_data):
        category_name_or_id = validated_data.pop('category', None)
        
        category_obj = None
        if category_name_or_id:
            category_obj = MenuCategory.objects.filter(name=category_name_or_id).first() or \
                           MenuCategory.objects.filter(id=category_name_or_id).first()
        
        if category_obj is None:
            raise serializers.ValidationError({'category': 'Choose an existing category.'})
        menu_item = MenuItem.objects.create(category=category_obj, **validated_data)
        self._attach_item_addons(menu_item, self.initial_data.get('customAddons'))
        return menu_item

    @staticmethod
    def _attach_item_addons(menu_item, raw):
        """Create ITEM-scoped addons from the form's ``customAddons`` list.

        Entries pointing at an existing global/category addon are skipped
        (they already apply to this item); everything else becomes an addon
        of this item.
        """
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except ValueError:
                raw = []
        for entry in raw or []:
            if not isinstance(entry, dict) or not str(entry.get('name', '')).strip():
                continue
            existing = MenuItemAddon.objects.filter(id=entry.get('id')).first() if entry.get('id') else None
            if existing and (existing.is_global or existing.category_id or existing.menu_item_id == menu_item.id):
                continue
            MenuItemAddon.objects.create(menu_item=menu_item, name=str(entry['name']).strip()[:150],
                                         price=entry.get('price') or 0)

    def update(self, instance, validated_data):
        category_name_or_id = validated_data.pop('category', None)

        if category_name_or_id:
            category_obj = MenuCategory.objects.filter(name=category_name_or_id).first() or \
                           MenuCategory.objects.filter(id=category_name_or_id).first()
            if category_obj is None:
                raise serializers.ValidationError({'category': 'Choose an existing category.'})
            instance.category = category_obj

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Addons are managed through /addons once an item exists (Go parity):
        # editing an item never deletes or duplicates its addons.
        return instance
