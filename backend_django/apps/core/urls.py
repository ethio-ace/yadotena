from .routers import optional_slash
from django.urls import include, path
from .routers import OptionalSlashRouter
from .views import ActivityLogViewSet, RestaurantSettingView, ReportsSummaryView

router = OptionalSlashRouter()
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    optional_slash('settings', RestaurantSettingView.as_view(), name='restaurant-settings'),
    optional_slash('reports/summary', ReportsSummaryView.as_view(), name='reports-summary'),
    path('', include(router.urls)),
]
