from .routers import optional_slash
from django.urls import include, path
from .routers import OptionalSlashRouter
from .analytics import MenuAnalyticsView, OverviewAnalyticsView, PaymentAnalyticsView, SalesAnalyticsView
from .dayclose import DayCloseView
from .views import MediaPresignView, MediaUploadView
from .views import ActivityLogViewSet, RestaurantSettingView, ReportsSummaryView

router = OptionalSlashRouter()
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    optional_slash('settings', RestaurantSettingView.as_view(), name='restaurant-settings'),
    optional_slash('reports/day-close', DayCloseView.as_view(), name='day-close'),
    optional_slash('reports/summary', ReportsSummaryView.as_view(), name='reports-summary'),
    optional_slash('analytics/overview', OverviewAnalyticsView.as_view(), name='analytics-overview'),
    optional_slash('analytics/sales', SalesAnalyticsView.as_view(), name='analytics-sales'),
    optional_slash('analytics/menu', MenuAnalyticsView.as_view(), name='analytics-menu'),
    optional_slash('analytics/payments', PaymentAnalyticsView.as_view(), name='analytics-payments'),
    optional_slash('media/upload', MediaUploadView.as_view(), name='media-upload'),
    optional_slash('uploads', MediaUploadView.as_view(), name='media-upload-legacy'),
    optional_slash('media/presign', MediaPresignView.as_view(), name='media-presign'),
    path('', include(router.urls)),
]
