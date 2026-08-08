from rest_framework import serializers
from .models import MenuCategory, MenuItem, MenuItemAddon

class MenuItemAddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemAddon
        fields = ['id', 'name', 'price']

class MenuCategorySerializer(serializers.ModelSerializer):
    sortOrder = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'icon', 'description', 'sortOrder', 'is_active']

class MenuItemSerializer(serializers.ModelSerializer):
    customAddons = MenuItemAddonSerializer(source='custom_addons', many=True, required=False)
    preparationTime = serializers.IntegerField(source='preparation_time', required=False, default=15)
    dietaryTags = serializers.ListField(source='dietary_tags', required=False, default=list)
    categoryName = serializers.SerializerMethodField(read_only=True)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category', 'categoryName',
            'image', 'available', 'preparationTime', 'dietaryTags', 'customAddons'
        ]

    def get_categoryName(self, obj):
        return obj.category.name if obj.category else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure category field in response matches frontend expectation (string name or id)
        if instance.category:
            ret['category'] = instance.category.name
        return ret

    def create(self, validated_data):
        addons_data = validated_data.pop('custom_addons', [])
        category_name_or_id = validated_data.pop('category', None)
        
        category_obj = None
        if category_name_or_id:
            category_obj = MenuCategory.objects.filter(name=category_name_or_id).first() or \
                           MenuCategory.objects.filter(id=category_name_or_id).first()
        
        menu_item = MenuItem.objects.create(category=category_obj, **validated_data)
        for addon_data in addons_data:
            MenuItemAddon.objects.create(menu_item=menu_item, **addon_data)
        return menu_item

    def update(self, instance, validated_data):
        addons_data = validated_data.pop('custom_addons', None)
        category_name_or_id = validated_data.pop('category', None)

        if category_name_or_id is not None:
            instance.category = MenuCategory.objects.filter(name=category_name_or_id).first() or \
                                MenuCategory.objects.filter(id=category_name_or_id).first()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if addons_data is not None:
            instance.custom_addons.all().delete()
            for addon_data in addons_data:
                MenuItemAddon.objects.create(menu_item=instance, **addon_data)

        return instance
