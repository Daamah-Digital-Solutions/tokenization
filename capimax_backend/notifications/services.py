"""
Services for the notifications app.
"""

import logging
import json
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template import Template, Context
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import (
    Notification, NotificationPreference, EmailTemplate,
    EmailLog, SystemAlert, NotificationChannel
)

User = get_user_model()
logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for managing notifications and real-time delivery.
    """
    
    @staticmethod
    def create_notification(
        user: User,
        title: str,
        message: str,
        notification_type: str = 'info',
        priority: str = 'medium',
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        expires_at: Optional[timezone.datetime] = None,
        content_object: Optional[Any] = None,
        send_real_time: bool = True,
        send_email: bool = False
    ) -> Notification:
        """
        Create a new notification for a user.
        
        Args:
            user: The user to send the notification to
            title: Notification title
            message: Notification message
            notification_type: Type of notification (info, success, warning, error, etc.)
            priority: Priority level (low, medium, high, urgent)
            action_url: Optional URL for action button
            action_label: Optional label for action button
            expires_at: Optional expiration date
            content_object: Optional related object
            send_real_time: Whether to send via WebSocket
            send_email: Whether to send via email
        
        Returns:
            Created Notification instance
        """
        try:
            # Create notification
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                action_url=action_url,
                action_label=action_label,
                expires_at=expires_at
            )
            
            # Link content object if provided
            if content_object:
                notification.content_type = ContentType.objects.get_for_model(content_object)
                notification.object_id = content_object.id
                notification.save(update_fields=['content_type', 'object_id'])
            
            # Create delivery channels
            channels_to_create = []
            
            if send_real_time:
                channels_to_create.append(
                    NotificationChannel(
                        notification=notification,
                        channel='websocket',
                        status='pending'
                    )
                )
            
            if send_email:
                channels_to_create.append(
                    NotificationChannel(
                        notification=notification,
                        channel='email',
                        status='pending'
                    )
                )
            
            # Always create in-app channel
            channels_to_create.append(
                NotificationChannel(
                    notification=notification,
                    channel='in_app',
                    status='sent',
                    sent_at=timezone.now()
                )
            )
            
            NotificationChannel.objects.bulk_create(channels_to_create)
            
            # Send real-time notification
            if send_real_time:
                NotificationService.send_real_time_notification(notification)
            
            # Send email if requested and user preferences allow
            if send_email:
                NotificationService.send_email_notification(notification)
            
            logger.info(f"Created notification {notification.id} for user {user.email}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise
    
    @staticmethod
    def send_real_time_notification(notification: Notification) -> bool:
        """
        Send notification via WebSocket.
        
        Args:
            notification: The notification to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                logger.warning("No channel layer configured for WebSocket notifications")
                return False
            
            # Get notification data
            notification_data = {
                'id': str(notification.id),
                'title': notification.title,
                'message': notification.message,
                'notification_type': notification.notification_type,
                'priority': notification.priority,
                'action_url': notification.action_url,
                'action_label': notification.action_label,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
            
            # Get updated unread count
            unread_count = notification.user.notifications.filter(is_read=False).count()
            
            # Send to user's notification group
            group_name = f"notifications_{notification.user.id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'notification': notification_data,
                    'unread_count': unread_count
                }
            )
            
            # Update delivery channel status
            NotificationChannel.objects.filter(
                notification=notification,
                channel='websocket'
            ).update(
                status='sent',
                sent_at=timezone.now()
            )
            
            logger.info(f"Sent real-time notification {notification.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending real-time notification: {str(e)}")
            
            # Update delivery channel status
            NotificationChannel.objects.filter(
                notification=notification,
                channel='websocket'
            ).update(
                status='failed',
                failed_at=timezone.now(),
                error_message=str(e)
            )
            return False
    
    @staticmethod
    def send_email_notification(notification: Notification) -> bool:
        """
        Send notification via email.
        
        Args:
            notification: The notification to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            user = notification.user
            
            # Check user preferences
            preferences = getattr(user, 'notification_preferences', None)
            if preferences and not preferences.email_notifications_enabled:
                logger.info(f"Email notifications disabled for user {user.email}")
                return False
            
            # Use appropriate email service
            return EmailNotificationService.send_notification_email(notification)
            
        except Exception as e:
            logger.error(f"Error sending email notification: {str(e)}")
            return False
    
    @staticmethod
    def update_user_notification_count(user: User):
        """
        Send updated notification count to user via WebSocket.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            unread_count = user.notifications.filter(is_read=False).count()
            group_name = f"notifications_{user.id}"
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_count_update',
                    'unread_count': unread_count
                }
            )
            
        except Exception as e:
            logger.error(f"Error updating notification count: {str(e)}")
    
    @staticmethod
    def broadcast_system_alert(alert: SystemAlert):
        """
        Broadcast system alert to admin clients.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            alert_data = {
                'id': str(alert.id),
                'title': alert.title,
                'message': alert.message,
                'alert_type': alert.alert_type,
                'category': alert.category,
                'created_at': alert.created_at.isoformat()
            }
            
            async_to_sync(channel_layer.group_send)(
                "admin_monitoring",
                {
                    'type': 'new_system_alert',
                    'alert': alert_data
                }
            )
            
        except Exception as e:
            logger.error(f"Error broadcasting system alert: {str(e)}")
    
    @staticmethod
    def broadcast_alert_resolution(alert: SystemAlert, resolved_by: User):
        """
        Broadcast alert resolution to admin clients.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            async_to_sync(channel_layer.group_send)(
                "admin_monitoring",
                {
                    'type': 'alert_resolved_broadcast',
                    'alert_id': str(alert.id),
                    'resolved_by': resolved_by.email
                }
            )
            
        except Exception as e:
            logger.error(f"Error broadcasting alert resolution: {str(e)}")
    
    @staticmethod
    def send_property_update(property_obj, update_type: str, data: Dict[str, Any]):
        """
        Send property update to WebSocket clients.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            group_name = f"property_{property_obj.id}"
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'property_update',
                    'update_type': update_type,
                    'data': data
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending property update: {str(e)}")
    
    @staticmethod
    def send_investment_update(investment, status: str, data: Dict[str, Any]):
        """
        Send investment update to WebSocket clients.
        """
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            
            group_name = f"investment_{investment.id}"
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'investment_status_update',
                    'status': status,
                    'data': data
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending investment update: {str(e)}")


class EmailNotificationService:
    """
    Service for managing email notifications with templates.
    """
    
    @staticmethod
    def send_notification_email(notification: Notification) -> bool:
        """
        Send notification as email using appropriate template.
        """
        try:
            user = notification.user
            
            # Get or create basic notification template
            template = EmailNotificationService._get_notification_template(
                notification.notification_type
            )
            
            if not template:
                # Send basic email without template
                return EmailNotificationService._send_basic_email(notification)
            
            # Render template with notification data
            context_data = {
                'user': user,
                'notification': notification,
                'title': notification.title,
                'message': notification.message,
                'action_url': notification.action_url,
                'action_label': notification.action_label,
                'site_name': getattr(settings, 'SITE_NAME', 'Capimax'),
                'site_url': getattr(settings, 'SITE_URL', 'https://capimax.com'),
            }
            
            subject = Template(template.subject).render(Context(context_data))
            html_content = Template(template.html_content).render(Context(context_data))
            text_content = Template(template.text_content).render(Context(context_data))
            
            # Create email log
            email_log = EmailLog.objects.create(
                recipient=user,
                template=template,
                notification=notification,
                subject=subject,
                recipient_email=user.email,
                sender_email=settings.DEFAULT_FROM_EMAIL,
                status='queued'
            )
            
            # Send email
            success = EmailNotificationService._send_email(
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                recipient_email=user.email,
                email_log=email_log
            )
            
            # Update notification flags
            if success:
                notification.is_sent_via_email = True
                notification.save(update_fields=['is_sent_via_email'])
                
                # Update delivery channel
                NotificationChannel.objects.filter(
                    notification=notification,
                    channel='email'
                ).update(
                    status='sent',
                    sent_at=timezone.now()
                )
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending notification email: {str(e)}")
            return False
    
    @staticmethod
    def send_templated_email(
        template_type: str,
        recipient: User,
        context_data: Dict[str, Any],
        related_notification: Optional[Notification] = None
    ) -> bool:
        """
        Send templated email to user.
        
        Args:
            template_type: Type of email template to use
            recipient: User to send email to
            context_data: Context data for template rendering
            related_notification: Optional related notification
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            template = EmailTemplate.objects.filter(
                template_type=template_type,
                is_active=True
            ).first()
            
            if not template:
                logger.error(f"No active template found for type: {template_type}")
                return False
            
            # Add default context data
            context_data.update({
                'user': recipient,
                'site_name': getattr(settings, 'SITE_NAME', 'Capimax'),
                'site_url': getattr(settings, 'SITE_URL', 'https://capimax.com'),
            })
            
            # Render template
            subject = Template(template.subject).render(Context(context_data))
            html_content = Template(template.html_content).render(Context(context_data))
            text_content = Template(template.text_content).render(Context(context_data))
            
            # Create email log
            email_log = EmailLog.objects.create(
                recipient=recipient,
                template=template,
                notification=related_notification,
                subject=subject,
                recipient_email=recipient.email,
                sender_email=settings.DEFAULT_FROM_EMAIL,
                status='queued'
            )
            
            # Send email
            return EmailNotificationService._send_email(
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                recipient_email=recipient.email,
                email_log=email_log
            )
            
        except Exception as e:
            logger.error(f"Error sending templated email: {str(e)}")
            return False
    
    @staticmethod
    def _get_notification_template(notification_type: str) -> Optional[EmailTemplate]:
        """Get email template for notification type."""
        template_mapping = {
            'investment': 'investment_confirmation',
            'payment': 'payment_confirmation',
            'kyc': 'kyc_status_update',
            'property': 'property_update',
            'system': 'system_alert',
        }
        
        template_type = template_mapping.get(notification_type, 'system_alert')
        return EmailTemplate.objects.filter(
            template_type=template_type,
            is_active=True
        ).first()
    
    @staticmethod
    def _send_basic_email(notification: Notification) -> bool:
        """Send basic email without template."""
        try:
            subject = f"[Capimax] {notification.title}"
            message = notification.message
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.user.email],
                fail_silently=False
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending basic email: {str(e)}")
            return False
    
    @staticmethod
    def _send_email(
        subject: str,
        text_content: str,
        html_content: str,
        recipient_email: str,
        email_log: EmailLog
    ) -> bool:
        """Send email and update log."""
        try:
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            
            # Attach HTML content
            if html_content:
                email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send(fail_silently=False)
            
            # Update email log
            email_log.status = 'sent'
            email_log.sent_at = timezone.now()
            email_log.save(update_fields=['status', 'sent_at'])
            
            logger.info(f"Sent email to {recipient_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {recipient_email}: {str(e)}")
            
            # Update email log with error
            email_log.status = 'failed'
            email_log.failed_at = timezone.now()
            email_log.error_message = str(e)
            email_log.retry_count += 1
            email_log.save(update_fields=[
                'status', 'failed_at', 'error_message', 'retry_count'
            ])
            
            return False
    
    @staticmethod
    def create_default_templates():
        """Create default email templates."""
        default_templates = [
            {
                'name': 'Welcome Email',
                'template_type': 'welcome',
                'subject': 'Welcome to {{site_name}}!',
                'html_content': '''
                <html>
                <body>
                    <h1>Welcome to {{site_name}}, {{user.first_name}}!</h1>
                    <p>Thank you for joining our real estate tokenization platform.</p>
                    <p>You can now start exploring investment opportunities.</p>
                    <a href="{{site_url}}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                </body>
                </html>
                ''',
                'text_content': '''
                Welcome to {{site_name}}, {{user.first_name}}!
                
                Thank you for joining our real estate tokenization platform.
                You can now start exploring investment opportunities.
                
                Visit your dashboard: {{site_url}}/dashboard
                ''',
                'variables': {
                    'user.first_name': 'User\'s first name',
                    'site_name': 'Platform name',
                    'site_url': 'Platform URL'
                }
            },
            {
                'name': 'Investment Confirmation',
                'template_type': 'investment_confirmation',
                'subject': 'Investment Confirmation - {{notification.title}}',
                'html_content': '''
                <html>
                <body>
                    <h1>{{notification.title}}</h1>
                    <p>{{notification.message}}</p>
                    {% if notification.action_url %}
                    <a href="{{notification.action_url}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">{{notification.action_label|default:"View Details"}}</a>
                    {% endif %}
                </body>
                </html>
                ''',
                'text_content': '''
                {{notification.title}}
                
                {{notification.message}}
                
                {% if notification.action_url %}
                {{notification.action_label|default:"View Details"}}: {{notification.action_url}}
                {% endif %}
                ''',
                'variables': {
                    'notification.title': 'Notification title',
                    'notification.message': 'Notification message',
                    'notification.action_url': 'Action URL',
                    'notification.action_label': 'Action label'
                }
            },
            {
                'name': 'System Alert',
                'template_type': 'system_alert',
                'subject': 'System Alert - {{notification.title}}',
                'html_content': '''
                <html>
                <body>
                    <h1 style="color: #dc3545;">{{notification.title}}</h1>
                    <p>{{notification.message}}</p>
                    <p><small>This is an automated system notification.</small></p>
                </body>
                </html>
                ''',
                'text_content': '''
                SYSTEM ALERT: {{notification.title}}
                
                {{notification.message}}
                
                This is an automated system notification.
                ''',
                'variables': {
                    'notification.title': 'Alert title',
                    'notification.message': 'Alert message'
                }
            }
        ]
        
        for template_data in default_templates:
            template, created = EmailTemplate.objects.get_or_create(
                template_type=template_data['template_type'],
                defaults=template_data
            )
            if created:
                logger.info(f"Created default email template: {template.name}")


class SystemAlertService:
    """
    Service for managing system alerts and monitoring.
    """
    
    @staticmethod
    def create_system_alert(
        title: str,
        message: str,
        alert_type: str,
        category: str,
        is_public: bool = False,
        target_user_types: List[str] = None,
        target_users: List[User] = None,
        expires_at: Optional[timezone.datetime] = None,
        metadata: Dict[str, Any] = None
    ) -> SystemAlert:
        """
        Create a system alert.
        """
        try:
            alert = SystemAlert.objects.create(
                title=title,
                message=message,
                alert_type=alert_type,
                category=category,
                is_public=is_public,
                target_user_types=target_user_types or [],
                expires_at=expires_at,
                metadata=metadata or {}
            )
            
            if target_users:
                alert.target_users.set(target_users)
            
            # Broadcast to admin clients
            NotificationService.broadcast_system_alert(alert)
            
            # Create notifications for targeted users if needed
            if is_public or target_users or target_user_types:
                SystemAlertService._create_alert_notifications(alert)
            
            logger.info(f"Created system alert: {alert.title}")
            return alert
            
        except Exception as e:
            logger.error(f"Error creating system alert: {str(e)}")
            raise
    
    @staticmethod
    def _create_alert_notifications(alert: SystemAlert):
        """Create individual notifications for system alert."""
        try:
            users_to_notify = set()
            
            # Add targeted users
            users_to_notify.update(alert.target_users.all())
            
            # Add users by type
            if alert.target_user_types:
                users_by_type = User.objects.filter(
                    user_type__in=alert.target_user_types,
                    is_active=True
                )
                users_to_notify.update(users_by_type)
            
            # Add all users if public
            if alert.is_public:
                all_users = User.objects.filter(is_active=True)
                users_to_notify.update(all_users)
            
            # Create notifications
            notifications = []
            for user in users_to_notify:
                notification = Notification(
                    user=user,
                    title=f"System Alert: {alert.title}",
                    message=alert.message,
                    notification_type='system',
                    priority='high' if alert.alert_type in ['error', 'critical'] else 'medium'
                )
                notifications.append(notification)
            
            # Bulk create notifications
            Notification.objects.bulk_create(notifications)
            
            # Send real-time notifications
            for notification in notifications:
                NotificationService.send_real_time_notification(notification)
            
            logger.info(f"Created {len(notifications)} notifications for system alert {alert.id}")
            
        except Exception as e:
            logger.error(f"Error creating alert notifications: {str(e)}")


# Initialize default templates on startup
try:
    EmailNotificationService.create_default_templates()
except Exception as e:
    logger.warning(f"Failed to create default email templates: {e}")