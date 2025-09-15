"""
Notification Tasks for Capimax Real Estate Tokenization Platform.

This module contains Celery tasks for automated notification processing,
email delivery, SMS sending, and notification cleanup.
"""

import logging
from typing import Dict, Any, List, Optional
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail, send_mass_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta

from .models import (
    Notification, NotificationPreference, EmailTemplate, 
    EmailLog, SystemAlert, NotificationChannel
)
from accounts.models import User

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, retry_backoff=True)
def send_email_notification(
    self,
    notification_id: str,
    template_name: Optional[str] = None,
    context_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send email notification for a specific notification.
    
    Args:
        notification_id: UUID of the notification
        template_name: Email template to use (optional)
        context_data: Additional context data for email template
        
    Returns:
        Dictionary with sending result
    """
    try:
        # Get the notification
        notification = Notification.objects.select_related('user').get(id=notification_id)
        user = notification.user
        
        # Check user's email preferences
        preferences = getattr(user, 'notification_preferences', None)
        if preferences and not preferences.email_notifications_enabled:
            return {
                'success': False,
                'message': 'User has disabled email notifications',
                'skipped': True
            }
        
        # Get or create email template
        email_template = None
        if template_name:
            try:
                email_template = EmailTemplate.objects.get(
                    template_type=template_name,
                    is_active=True
                )
            except EmailTemplate.DoesNotExist:
                logger.warning(f"Email template '{template_name}' not found")
        
        # Prepare email content
        if email_template:
            context = {
                'user': user,
                'notification': notification,
                'platform_name': 'Capimax',
                'base_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
                **(context_data or {})
            }
            
            subject = email_template.subject.format(**context)
            html_content = email_template.html_content.format(**context)
            text_content = email_template.text_content.format(**context)
        else:
            # Fallback to notification content
            subject = notification.title
            html_content = f"""
            <html>
            <body>
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                {f'<p><a href="{notification.action_url}">{notification.action_label}</a></p>' if notification.action_url else ''}
                <hr>
                <p><small>This is an automated message from Capimax.</small></p>
            </body>
            </html>
            """
            text_content = f"{notification.title}\n\n{notification.message}"
            
            if notification.action_url:
                text_content += f"\n\n{notification.action_label}: {notification.action_url}"
        
        # Send email
        from django.core.mail import EmailMultiAlternatives
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_content, "text/html")
        
        # Create email log record
        email_log = EmailLog.objects.create(
            recipient=user,
            template=email_template,
            notification=notification,
            subject=subject,
            recipient_email=user.email,
            sender_email=settings.DEFAULT_FROM_EMAIL,
            status='queued'
        )
        
        # Send the email
        email.send()
        
        # Update email log
        email_log.status = 'sent'
        email_log.sent_at = timezone.now()
        email_log.save()
        
        # Update notification
        notification.is_sent_via_email = True
        notification.save()
        
        # Create notification channel record
        NotificationChannel.objects.create(
            notification=notification,
            channel='email',
            status='sent',
            sent_at=timezone.now()
        )
        
        logger.info(f"Email notification sent to {user.email} for notification {notification_id}")
        
        return {
            'success': True,
            'email_log_id': str(email_log.id),
            'recipient': user.email,
            'subject': subject
        }
        
    except Notification.DoesNotExist:
        error_msg = f"Notification {notification_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as exc:
        logger.error(f"Error sending email notification {notification_id}: {exc}")
        
        # Update email log if it exists
        try:
            email_log = EmailLog.objects.filter(notification_id=notification_id).first()
            if email_log:
                email_log.status = 'failed'
                email_log.failed_at = timezone.now()
                email_log.error_message = str(exc)
                email_log.retry_count += 1
                email_log.save()
        except:
            pass
        
        # Retry the task
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task(bind=True, max_retries=3)
def send_bulk_notifications(
    self,
    user_ids: List[str],
    title: str,
    message: str,
    notification_type: str = 'info',
    priority: str = 'medium',
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
    send_email: bool = True,
    email_template: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send bulk notifications to multiple users.
    
    Args:
        user_ids: List of user IDs to send notifications to
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        priority: Notification priority
        action_url: Optional action URL
        action_label: Optional action label
        send_email: Whether to send email notifications
        email_template: Email template to use
        
    Returns:
        Dictionary with sending results
    """
    try:
        users = User.objects.filter(id__in=user_ids)
        
        if not users.exists():
            return {
                'success': False,
                'error': 'No valid users found'
            }
        
        notifications_created = []
        email_tasks_queued = []
        
        # Create notifications for all users
        for user in users:
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                action_url=action_url,
                action_label=action_label
            )
            notifications_created.append(str(notification.id))
            
            # Queue email notification if requested
            if send_email:
                task = send_email_notification.delay(
                    notification_id=str(notification.id),
                    template_name=email_template
                )
                email_tasks_queued.append(task.id)
        
        logger.info(f"Created {len(notifications_created)} bulk notifications")
        
        return {
            'success': True,
            'notifications_created': len(notifications_created),
            'email_tasks_queued': len(email_tasks_queued),
            'notification_ids': notifications_created,
            'email_task_ids': email_tasks_queued
        }
        
    except Exception as exc:
        logger.error(f"Error sending bulk notifications: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task(bind=True, max_retries=2)
def process_pending_emails(self, batch_size: int = 50) -> Dict[str, Any]:
    """
    Process pending email notifications in batches.
    
    Args:
        batch_size: Number of emails to process in this batch
        
    Returns:
        Dictionary with processing results
    """
    try:
        # Get pending email logs
        pending_emails = EmailLog.objects.filter(
            status='queued',
            retry_count__lt=3
        ).select_related('recipient', 'notification', 'template')[:batch_size]
        
        if not pending_emails.exists():
            return {
                'success': True,
                'message': 'No pending emails to process'
            }
        
        processed = 0
        failed = 0
        
        for email_log in pending_emails:
            try:
                # Process the email
                if email_log.notification:
                    result = send_email_notification.delay(
                        notification_id=str(email_log.notification.id)
                    )
                    processed += 1
                else:
                    # Handle emails without notifications (direct emails)
                    # This would be implemented based on specific requirements
                    processed += 1
                    
            except Exception as e:
                failed += 1
                email_log.status = 'failed'
                email_log.failed_at = timezone.now()
                email_log.error_message = str(e)
                email_log.retry_count += 1
                email_log.save()
                
                logger.error(f"Failed to process email {email_log.id}: {e}")
        
        logger.info(f"Processed {processed} emails, {failed} failed")
        
        return {
            'success': True,
            'processed': processed,
            'failed': failed,
            'batch_size': batch_size
        }
        
    except Exception as exc:
        logger.error(f"Error processing pending emails: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task
def cleanup_expired_notifications(days_to_keep: int = 90) -> Dict[str, Any]:
    """
    Clean up expired notifications and related records.
    
    Args:
        days_to_keep: Number of days to keep notifications
        
    Returns:
        Dictionary with cleanup results
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        # Delete old notifications
        deleted_notifications = Notification.objects.filter(
            created_at__lt=cutoff_date,
            is_read=True
        ).delete()
        
        # Delete old email logs
        deleted_email_logs = EmailLog.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['sent', 'delivered', 'failed']
        ).delete()
        
        # Delete old notification channels
        deleted_channels = NotificationChannel.objects.filter(
            created_at__lt=cutoff_date
        ).delete()
        
        # Clean up resolved system alerts older than 30 days
        alert_cutoff = timezone.now() - timedelta(days=30)
        deleted_alerts = SystemAlert.objects.filter(
            created_at__lt=alert_cutoff,
            is_resolved=True
        ).delete()
        
        logger.info(
            f"Cleanup completed: {deleted_notifications[0]} notifications, "
            f"{deleted_email_logs[0]} email logs, {deleted_channels[0]} channels, "
            f"{deleted_alerts[0]} alerts deleted"
        )
        
        return {
            'success': True,
            'deleted_notifications': deleted_notifications[0],
            'deleted_email_logs': deleted_email_logs[0],
            'deleted_channels': deleted_channels[0],
            'deleted_alerts': deleted_alerts[0],
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during notification cleanup: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True, max_retries=2)
def send_digest_notifications(self, frequency: str = 'weekly') -> Dict[str, Any]:
    """
    Send digest notifications to users based on their preferences.
    
    Args:
        frequency: Digest frequency ('daily', 'weekly')
        
    Returns:
        Dictionary with digest sending results
    """
    try:
        # Get users who want digest notifications
        users_with_digests = NotificationPreference.objects.filter(
            digest_frequency=frequency,
            email_notifications_enabled=True
        ).select_related('user')
        
        if not users_with_digests.exists():
            return {
                'success': True,
                'message': f'No users configured for {frequency} digests'
            }
        
        digests_sent = 0
        failed_digests = 0
        
        # Calculate time period for digest
        if frequency == 'daily':
            since_date = timezone.now() - timedelta(days=1)
        elif frequency == 'weekly':
            since_date = timezone.now() - timedelta(days=7)
        else:
            since_date = timezone.now() - timedelta(days=1)
        
        for pref in users_with_digests:
            try:
                user = pref.user
                
                # Get user's recent notifications
                recent_notifications = Notification.objects.filter(
                    user=user,
                    created_at__gte=since_date,
                    is_read=False
                ).order_by('-created_at')[:10]  # Limit to 10 most recent
                
                if not recent_notifications.exists():
                    continue  # Skip if no recent notifications
                
                # Create digest notification
                digest_notification = Notification.objects.create(
                    user=user,
                    title=f"Your {frequency.title()} Digest",
                    message=f"You have {recent_notifications.count()} unread notifications.",
                    notification_type='info',
                    priority='low'
                )
                
                # Send digest email
                context_data = {
                    'notifications': recent_notifications,
                    'frequency': frequency,
                    'notification_count': recent_notifications.count()
                }
                
                send_email_notification.delay(
                    notification_id=str(digest_notification.id),
                    template_name=f'{frequency}_digest',
                    context_data=context_data
                )
                
                digests_sent += 1
                
            except Exception as e:
                failed_digests += 1
                logger.error(f"Failed to send {frequency} digest to user {pref.user.id}: {e}")
        
        logger.info(f"Sent {digests_sent} {frequency} digests, {failed_digests} failed")
        
        return {
            'success': True,
            'digests_sent': digests_sent,
            'failed_digests': failed_digests,
            'frequency': frequency
        }
        
    except Exception as exc:
        logger.error(f"Error sending {frequency} digest notifications: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)
        else:
            return {
                'success': False,
                'error': str(exc)
            }


@shared_task
def update_email_delivery_status(
    email_log_id: str,
    status: str,
    external_id: Optional[str] = None,
    error_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update email delivery status from webhook or external service.
    
    Args:
        email_log_id: UUID of the email log
        status: New delivery status
        external_id: External service ID
        error_message: Error message if delivery failed
        
    Returns:
        Dictionary with update result
    """
    try:
        email_log = EmailLog.objects.get(id=email_log_id)
        
        email_log.status = status
        email_log.external_id = external_id
        
        if status == 'delivered':
            email_log.delivered_at = timezone.now()
        elif status == 'failed':
            email_log.failed_at = timezone.now()
            email_log.error_message = error_message
        
        email_log.save()
        
        # Update notification channel record if it exists
        if email_log.notification:
            try:
                channel = NotificationChannel.objects.get(
                    notification=email_log.notification,
                    channel='email'
                )
                channel.status = 'delivered' if status == 'delivered' else 'failed'
                if status == 'delivered':
                    channel.delivered_at = timezone.now()
                else:
                    channel.failed_at = timezone.now()
                    channel.error_message = error_message
                channel.save()
            except NotificationChannel.DoesNotExist:
                pass
        
        return {
            'success': True,
            'email_log_id': email_log_id,
            'status': status
        }
        
    except EmailLog.DoesNotExist:
        error_msg = f"Email log {email_log_id} not found"
        logger.error(error_msg)
        return {
            'success': False,
            'error': error_msg
        }
    except Exception as e:
        logger.error(f"Error updating email delivery status: {e}")
        return {
            'success': False,
            'error': str(e)
        }


# Utility task for testing notification system
@shared_task
def test_notification_system(user_email: str) -> str:
    """Test task for verifying notification system."""
    try:
        # Find test user
        user = User.objects.get(email=user_email)
        
        # Create test notification
        test_notification = Notification.objects.create(
            user=user,
            title="Test Notification",
            message="This is a test notification to verify the system is working correctly.",
            notification_type='info',
            priority='low'
        )
        
        # Send test email
        send_email_notification.delay(str(test_notification.id))
        
        message = f"Test notification created and email queued for {user_email}"
        logger.info(message)
        return message
        
    except User.DoesNotExist:
        error_message = f"User with email {user_email} not found"
        logger.error(error_message)
        return error_message
    except Exception as e:
        error_message = f"Error in notification system test: {e}"
        logger.error(error_message)
        return error_message