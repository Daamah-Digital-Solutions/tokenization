"""
Views for the notifications app.
"""

import logging
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from core.permissions import IsOwnerOrAdmin, IsAdminUserFlexible
from .models import (
    Notification, NotificationPreference, EmailTemplate,
    EmailLog, SystemAlert, NotificationChannel
)
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer,
    NotificationPreferenceSerializer, EmailTemplateSerializer,
    EmailTemplateCreateSerializer, EmailLogSerializer,
    SystemAlertSerializer, SystemAlertCreateSerializer,
    NotificationStatsSerializer, BulkNotificationCreateSerializer,
    NotificationMarkReadSerializer
)

logger = logging.getLogger(__name__)


class NotificationPagination(PageNumberPagination):
    """Custom pagination for notifications."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListCreateView(generics.ListCreateAPIView):
    """
    List user notifications or create a new notification.
    """
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for the authenticated user."""
        user = self.request.user
        queryset = Notification.objects.filter(user=user).select_related(
            'content_type'
        ).prefetch_related('delivery_channels')
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.request.method == 'POST':
            return NotificationCreateSerializer
        return NotificationSerializer
    
    @swagger_auto_schema(
        operation_description="Get user notifications with optional filtering",
        manual_parameters=[
            openapi.Parameter(
                'type', openapi.IN_QUERY, 
                description="Filter by notification type",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'is_read', openapi.IN_QUERY,
                description="Filter by read status (true/false)",
                type=openapi.TYPE_BOOLEAN
            ),
            openapi.Parameter(
                'priority', openapi.IN_QUERY,
                description="Filter by priority level",
                type=openapi.TYPE_STRING
            ),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a notification.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        """Get notifications for the authenticated user."""
        return Notification.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        """Custom update logic."""
        # If marking as read, set read_at timestamp
        if serializer.validated_data.get('is_read') and not serializer.instance.is_read:
            serializer.save(read_at=timezone.now())
        else:
            serializer.save()


class NotificationMarkReadView(APIView):
    """
    Mark notification(s) as read.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        request_body=NotificationMarkReadSerializer,
        operation_description="Mark specific notifications or all notifications as read"
    )
    def put(self, request):
        serializer = NotificationMarkReadSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data.get('notification_ids')
        user = request.user
        
        if notification_ids:
            # Mark specific notifications as read
            count = Notification.objects.filter(
                id__in=notification_ids,
                user=user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            # Mark all notifications as read
            count = Notification.objects.filter(
                user=user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        
        return Response({
            'message': f'{count} notifications marked as read',
            'count': count
        })


class NotificationUnreadCountView(APIView):
    """
    Get unread notification count for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        unread_count = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        return Response({'unread_count': unread_count})


class NotificationStatsView(APIView):
    """
    Get notification statistics for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Basic counts
        total_notifications = Notification.objects.filter(user=user).count()
        unread_notifications = Notification.objects.filter(user=user, is_read=False).count()
        read_notifications = total_notifications - unread_notifications
        
        # Notifications by type
        notifications_by_type = dict(
            Notification.objects.filter(user=user).values_list('notification_type')
            .annotate(count=Count('notification_type'))
        )
        
        # Notifications by priority
        notifications_by_priority = dict(
            Notification.objects.filter(user=user).values_list('priority')
            .annotate(count=Count('priority'))
        )
        
        # Recent notifications (last 7 days)
        week_ago = timezone.now() - timezone.timedelta(days=7)
        recent_notification_count = Notification.objects.filter(
            user=user,
            created_at__gte=week_ago
        ).count()
        
        stats = {
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'read_notifications': read_notifications,
            'notifications_by_type': notifications_by_type,
            'notifications_by_priority': notifications_by_priority,
            'recent_notification_count': recent_notification_count,
        }
        
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """
    Get and update user notification preferences.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Get or create notification preferences for user."""
        user = self.request.user
        preferences, created = NotificationPreference.objects.get_or_create(user=user)
        return preferences


class BulkNotificationCreateView(APIView):
    """
    Create notifications for multiple users (Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    
    @swagger_auto_schema(
        request_body=BulkNotificationCreateSerializer,
        operation_description="Create notifications for multiple users"
    )
    def post(self, request):
        serializer = BulkNotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = serializer.save()
        
        return Response({
            'message': f"Created {result['created_count']} notifications",
            'created_count': result['created_count']
        }, status=status.HTTP_201_CREATED)


# Email Template Views
class EmailTemplateListCreateView(generics.ListCreateAPIView):
    """
    List and create email templates (Admin only).
    """
    queryset = EmailTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EmailTemplateCreateSerializer
        return EmailTemplateSerializer


class EmailTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete email templates (Admin only).
    """
    queryset = EmailTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return EmailTemplateCreateSerializer
        return EmailTemplateSerializer


class EmailLogListView(generics.ListAPIView):
    """
    List email logs (Admin only).
    """
    queryset = EmailLog.objects.all().select_related('recipient', 'template')
    serializer_class = EmailLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by recipient
        recipient_email = self.request.query_params.get('recipient')
        if recipient_email:
            queryset = queryset.filter(recipient_email__icontains=recipient_email)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by template
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        return queryset.order_by('-created_at')


# System Alert Views
class SystemAlertListCreateView(generics.ListCreateAPIView):
    """
    List and create system alerts (Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        queryset = SystemAlert.objects.all()
        
        # Filter by status
        is_resolved = self.request.query_params.get('is_resolved')
        if is_resolved is not None:
            is_resolved_bool = is_resolved.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_resolved=is_resolved_bool)
        
        # Filter by type
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SystemAlertCreateSerializer
        return SystemAlertSerializer


class SystemAlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete system alerts (Admin only).
    """
    queryset = SystemAlert.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SystemAlertCreateSerializer
        return SystemAlertSerializer


class SystemAlertResolveView(APIView):
    """
    Resolve a system alert (Admin only).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserFlexible]
    
    @swagger_auto_schema(
        operation_description="Resolve a system alert",
        responses={200: "Alert resolved successfully"}
    )
    def post(self, request, pk):
        alert = get_object_or_404(SystemAlert, pk=pk)
        
        if alert.is_resolved:
            return Response(
                {'message': 'Alert is already resolved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.resolve(resolved_by=request.user)
        
        return Response({'message': 'Alert resolved successfully'})


# User System Alerts (Public alerts visible to users)
class UserSystemAlertListView(generics.ListAPIView):
    """
    List active public system alerts for authenticated users.
    """
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Get public alerts or alerts targeted to this user/user type
        queryset = SystemAlert.objects.filter(
            is_active=True,
            is_resolved=False
        ).filter(
            Q(is_public=True) |
            Q(target_users=user) |
            Q(target_user_types__contains=[user.user_type])
        ).distinct()
        
        return queryset.order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@swagger_auto_schema(
    operation_description="Send a test notification to the authenticated user",
    responses={201: "Test notification sent"}
)
def send_test_notification(request):
    """
    Send a test notification to the authenticated user.
    """
    user = request.user
    
    notification = Notification.objects.create(
        user=user,
        title="Test Notification",
        message="This is a test notification to verify the notification system is working.",
        notification_type="info",
        priority="medium"
    )
    
    serializer = NotificationSerializer(notification)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
