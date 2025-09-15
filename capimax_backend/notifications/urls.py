"""
URL configuration for the notifications app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# API URL patterns
urlpatterns = [
    # Notification endpoints
    path('notifications/', views.NotificationListCreateView.as_view(), name='notification-list'),
    path('notifications/<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('notifications/mark-read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/unread-count/', views.NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/stats/', views.NotificationStatsView.as_view(), name='notification-stats'),
    path('notifications/test/', views.send_test_notification, name='send-test-notification'),
    
    # Notification preferences
    path('notifications/preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    
    # Bulk operations (Admin only)
    path('notifications/bulk-create/', views.BulkNotificationCreateView.as_view(), name='bulk-notification-create'),
    
    # Email template endpoints (Admin only)
    path('email-templates/', views.EmailTemplateListCreateView.as_view(), name='email-template-list'),
    path('email-templates/<uuid:pk>/', views.EmailTemplateDetailView.as_view(), name='email-template-detail'),
    
    # Email logs (Admin only)
    path('email-logs/', views.EmailLogListView.as_view(), name='email-log-list'),
    
    # System alerts (Admin only)
    path('admin/system-alerts/', views.SystemAlertListCreateView.as_view(), name='admin-system-alert-list'),
    path('admin/system-alerts/<uuid:pk>/', views.SystemAlertDetailView.as_view(), name='admin-system-alert-detail'),
    path('admin/system-alerts/<uuid:pk>/resolve/', views.SystemAlertResolveView.as_view(), name='admin-system-alert-resolve'),
    
    # User-visible system alerts
    path('system-alerts/', views.UserSystemAlertListView.as_view(), name='user-system-alert-list'),
]