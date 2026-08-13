from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Product, ProductSale, ProductPurchase
from .serializers import ProductSerializer, ProductSaleSerializer, ProductPurchaseSerializer
from apps.expenses.models import Expense, ExpenseCategory
from decimal import Decimal

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)

        # Helper function to get sum
        def get_sums(qs, date_field):
            return {
                'today': qs.filter(**{f"{date_field}__date": today}).aggregate(q=Sum('quantity'), c=Sum('total_price' if hasattr(qs.model, 'total_price') else 'total_cost')),
                'week': qs.filter(**{f"{date_field}__gte": week_ago}).aggregate(q=Sum('quantity'), c=Sum('total_price' if hasattr(qs.model, 'total_price') else 'total_cost')),
                'month': qs.filter(**{f"{date_field}__gte": month_ago}).aggregate(q=Sum('quantity'), c=Sum('total_price' if hasattr(qs.model, 'total_price') else 'total_cost')),
                'year': qs.filter(**{f"{date_field}__gte": year_ago}).aggregate(q=Sum('quantity'), c=Sum('total_price' if hasattr(qs.model, 'total_price') else 'total_cost')),
            }

        sales_data = get_sums(ProductSale.objects.all(), 'sale_date')
        purchases_data = get_sums(ProductPurchase.objects.all(), 'purchase_date')

        # Clean None values to 0
        def clean_sums(d):
            return {k: {'quantity': v['q'] or 0, 'total': v['c'] or 0} for k, v in d.items()}

        return Response({
            'sales': clean_sums(sales_data),
            'purchases': clean_sums(purchases_data)
        })

class ProductSaleViewSet(viewsets.ModelViewSet):
    queryset = ProductSale.objects.all()
    serializer_class = ProductSaleSerializer

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        quantity = Decimal(str(request.data.get('quantity', 1)))

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

class ProductPurchaseViewSet(viewsets.ModelViewSet):
    queryset = ProductPurchase.objects.all()
    serializer_class = ProductPurchaseSerializer

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        quantity = Decimal(str(request.data.get('quantity', 1)))
        total_cost = Decimal(str(request.data.get('total_cost', 0)))

        if not product_id:
            return Response({"detail": "Product is required."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            product = Product.objects.select_for_update().filter(id=product_id).first()
            if not product:
                return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
            
            # 1. Increment Stock
            product.stock_quantity += quantity
            product.save(update_fields=['stock_quantity', 'updated_at'])

            # 2. Create Expense
            expense = Expense.objects.create(
                amount=total_cost,
                category=ExpenseCategory.DAIRY_SUPPLIES,
                description=f"Stock purchase for {quantity} {product.unit} of {product.name}",
                recorded_by=request.user if request.user.is_authenticated else None
            )

            # 3. Create ProductPurchase
            purchase = ProductPurchase.objects.create(
                product=product,
                quantity=quantity,
                total_cost=total_cost,
                purchased_by=request.user if request.user.is_authenticated else None,
                expense=expense
            )

        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
