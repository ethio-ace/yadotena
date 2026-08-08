from django.urls import path
from .views import RestaurantSettingView, ReportsSummaryView

urlpatterns = [
    path('settings/', RestaurantSettingView.as_view(), name='restaurant-settings'),
    path('reports/summary/', ReportsSummaryView.as_view(), name='reports-summary'),
]
