from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import transaction
from .models import Product, ProductSale
from .serializers import ProductSerializer, ProductSaleSerializer
from decimal import Decimal

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class ProductSaleViewSet(viewsets.ModelViewSet):
    queryset = ProductSale.objects.all()
    serializer_class = ProductSaleSerializer

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response({"detail": "Product is required."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            product = Product.objects.select_for_update().filter(id=product_id).first()
            if not product:
                return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
            
            if product.stock_quantity < quantity:
                return Response({"detail": "Not enough stock available."}, status=status.HTTP_400_BAD_REQUEST)

            total_price = product.price * Decimal(quantity)
            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity', 'updated_at'])

            sale = ProductSale.objects.create(
                product=product,
                quantity=quantity,
                total_price=total_price,
                sold_by=request.user if request.user.is_authenticated else None
            )

        serializer = self.get_serializer(sale)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
