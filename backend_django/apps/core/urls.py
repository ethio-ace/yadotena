from .routers import optional_slash
from .views import RestaurantSettingView, ReportsSummaryView

urlpatterns = [
    optional_slash('settings', RestaurantSettingView.as_view(), name='restaurant-settings'),
    optional_slash('reports/summary', ReportsSummaryView.as_view(), name='reports-summary'),
]
