"""
URL configuration for the notifications app.

Mounted at /api/v1/notifications/ in capimax_backend/urls.py — therefore
inner paths MUST NOT begin with another `notifications/` segment or the
real URL becomes /api/v1/notifications/notifications/<...>, which is what
caused the frontend NotificationService to silently 404.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Core notifications — relative paths only.
    path('', views.NotificationListCreateView.as_view(), name='notification-list'),
    path('mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('mark-all-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-all-read'),
    path('unread-count/', views.NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('stats/', views.NotificationStatsView.as_view(), name='notification-stats'),
    path('test/', views.send_test_notification, name='send-test-notification'),
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('bulk-create/', views.BulkNotificationCreateView.as_view(), name='bulk-notification-create'),

    # Per-notification (UUID) — keep AFTER static paths so /preferences/ etc.
    # are matched first.
    path('<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('<uuid:pk>/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read-single'),

    # Email tooling (admin only).
    path('email-templates/', views.EmailTemplateListCreateView.as_view(), name='email-template-list'),
    path('email-templates/<uuid:pk>/', views.EmailTemplateDetailView.as_view(), name='email-template-detail'),
    path('email-logs/', views.EmailLogListView.as_view(), name='email-log-list'),

    # System alerts.
    path('admin/system-alerts/', views.SystemAlertListCreateView.as_view(), name='admin-system-alert-list'),
    path('admin/system-alerts/<uuid:pk>/', views.SystemAlertDetailView.as_view(), name='admin-system-alert-detail'),
    path('admin/system-alerts/<uuid:pk>/resolve/', views.SystemAlertResolveView.as_view(), name='admin-system-alert-resolve'),
    path('system-alerts/', views.UserSystemAlertListView.as_view(), name='user-system-alert-list'),
]
