from decimal import Decimal

from rest_framework import serializers
from .models import MenuIngredient, Product, ProductSale, ProductPurchase

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class ProductSaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    sold_by_name = serializers.CharField(source='sold_by.get_full_name', read_only=True)

    class Meta:
        model = ProductSale
        fields = '__all__'
        read_only_fields = ['total_price', 'sold_by']

class ProductPurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    purchased_by_name = serializers.CharField(source='purchased_by.get_full_name', read_only=True)

    class Meta:
        model = ProductPurchase
        fields = '__all__'
        read_only_fields = ['total_cost', 'purchased_by', 'expense']


class MenuIngredientSerializer(serializers.ModelSerializer):
    menuItemId = serializers.CharField(source='menu_item_id')
    productId = serializers.CharField(source='product_id')
    productName = serializers.CharField(source='product.name', read_only=True)
    unit = serializers.CharField(source='product.unit', read_only=True)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal('0.001'),
                                        coerce_to_string=False)

    class Meta:
        model = MenuIngredient
        fields = ['id', 'menuItemId', 'productId', 'productName', 'unit', 'quantity']

    def validate(self, attrs):
        from apps.menu.models import MenuItem
        menu_item_id = attrs.get('menu_item_id', getattr(self.instance, 'menu_item_id', None))
        product_id = attrs.get('product_id', getattr(self.instance, 'product_id', None))
        if not MenuItem.objects.filter(id=menu_item_id).exists():
            raise serializers.ValidationError({'menuItemId': 'Menu item not found.'})
        if not Product.objects.filter(id=product_id).exists():
            raise serializers.ValidationError({'productId': 'Stock product not found.'})
        dup = MenuIngredient.objects.filter(menu_item_id=menu_item_id, product_id=product_id)
        if self.instance is not None:
            dup = dup.exclude(pk=self.instance.pk)
        if dup.exists():
            raise serializers.ValidationError({'productId': 'This product is already in the recipe.'})
        return attrs
