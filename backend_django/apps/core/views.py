from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from .models import RestaurantSetting
from .serializers import RestaurantSettingSerializer
from apps.orders.models import Order, OrderItem
from apps.expenses.models import Expense

class RestaurantSettingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        setting = RestaurantSetting.get_settings()
        return Response(RestaurantSettingSerializer(setting).data)

    def put(self, request):
        setting = RestaurantSetting.get_settings()
        serializer = RestaurantSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

class ReportsSummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Gross revenue
        total_revenue = Order.objects.filter(status__in=['SERVED', 'COMPLETED']).aggregate(
            total=Sum('total')
        )['total'] or 0.00

        # Expenses
        total_expenses = Expense.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0.00

        # Net Profit
        net_profit = float(total_revenue) - float(total_expenses)

        # Total Orders
        orders_count = Order.objects.count()
        completed_orders = Order.objects.filter(status__in=['SERVED', 'COMPLETED']).count()

        # Avg ticket
        avg_ticket = float(total_revenue / completed_orders) if completed_orders > 0 else 0.00

        # Top dishes
        top_items = (
            OrderItem.objects.values('name')
            .annotate(qty=Sum('quantity'), revenue=Sum('price'))
            .order_by('-qty')[:5]
        )

        return Response({
            'grossRevenue': float(total_revenue),
            'totalExpenses': float(total_expenses),
            'netProfit': net_profit,
            'ordersCount': orders_count,
            'completedOrders': completed_orders,
            'averageTicket': round(avg_ticket, 2),
            'topDishes': list(top_items),
        }, status=status.HTTP_200_OK)
