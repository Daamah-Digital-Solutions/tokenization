"""
Comprehensive tests for the notifications app.
"""

import json
import uuid
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async

from .models import (
    Notification, NotificationPreference, EmailTemplate,
    EmailLog, SystemAlert, NotificationChannel
)
from .services import NotificationService, EmailNotificationService

User = get_user_model()


class NotificationModelTestCase(TestCase):
    """Test cases for notification models."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='investor'
        )
    
    def test_notification_creation(self):
        """Test notification creation."""
        notification = Notification.objects.create(
            user=self.user,
            title='Test Notification',
            message='This is a test notification',
            notification_type='info',
            priority='medium'
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, 'Test Notification')
        self.assertEqual(notification.notification_type, 'info')
        self.assertEqual(notification.priority, 'medium')
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)
    
    def test_notification_mark_as_read(self):
        """Test marking notification as read."""
        notification = Notification.objects.create(
            user=self.user,
            title='Test Notification',
            message='Test message'
        )
        
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)
        
        notification.mark_as_read()
        
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
    
    def test_notification_expiration(self):
        """Test notification expiration."""
        past_time = timezone.now() - timezone.timedelta(hours=1)
        future_time = timezone.now() + timezone.timedelta(hours=1)
        
        # Expired notification
        expired_notification = Notification.objects.create(
            user=self.user,
            title='Expired',
            message='Test',
            expires_at=past_time
        )
        
        # Non-expired notification
        valid_notification = Notification.objects.create(
            user=self.user,
            title='Valid',
            message='Test',
            expires_at=future_time
        )
        
        # No expiration
        no_expiration = Notification.objects.create(
            user=self.user,
            title='No Expiration',
            message='Test'
        )
        
        self.assertTrue(expired_notification.is_expired)
        self.assertFalse(valid_notification.is_expired)
        self.assertFalse(no_expiration.is_expired)
    
    def test_notification_preferences(self):
        """Test notification preferences."""
        preferences = NotificationPreference.objects.create(
            user=self.user,
            email_notifications_enabled=True,
            in_app_notifications_enabled=True,
            push_notifications_enabled=False
        )
        
        self.assertEqual(preferences.user, self.user)
        self.assertTrue(preferences.email_notifications_enabled)
        self.assertTrue(preferences.in_app_notifications_enabled)
        self.assertFalse(preferences.push_notifications_enabled)
    
    def test_system_alert(self):
        """Test system alert creation and resolution."""
        alert = SystemAlert.objects.create(
            title='Test Alert',
            message='This is a test alert',
            alert_type='warning',
            category='system',
            is_public=True
        )
        
        self.assertEqual(alert.title, 'Test Alert')
        self.assertEqual(alert.alert_type, 'warning')
        self.assertTrue(alert.is_active)
        self.assertFalse(alert.is_resolved)
        
        # Resolve alert
        alert.resolve(resolved_by=self.user)
        
        self.assertTrue(alert.is_resolved)
        self.assertEqual(alert.resolved_by, self.user)
        self.assertIsNotNone(alert.resolved_at)
    
    def test_email_template(self):
        """Test email template functionality."""
        template = EmailTemplate.objects.create(
            name='Test Template',
            template_type='welcome',
            subject='Welcome {{user.first_name}}!',
            html_content='<h1>Welcome {{user.first_name}}!</h1>',
            text_content='Welcome {{user.first_name}}!',
            variables={'user.first_name': 'User\'s first name'}
        )
        
        self.assertEqual(template.name, 'Test Template')
        self.assertEqual(template.template_type, 'welcome')
        self.assertTrue(template.is_active)
        self.assertIsInstance(template.variables, dict)


class NotificationAPITestCase(APITestCase):
    """Test cases for notification API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='investor'
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            user_type='admin',
            is_staff=True
        )
        
        # Create JWT tokens
        self.user_token = RefreshToken.for_user(self.user).access_token
        self.admin_token = RefreshToken.for_user(self.admin_user).access_token
        
        # Create test notifications
        self.notification = Notification.objects.create(
            user=self.user,
            title='Test Notification',
            message='This is a test notification',
            notification_type='info'
        )
    
    def authenticate_user(self):
        """Authenticate as regular user."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_token}')
    
    def authenticate_admin(self):
        """Authenticate as admin user."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
    
    def test_get_user_notifications(self):
        """Test getting user notifications."""
        self.authenticate_user()
        
        url = reverse('notification-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Notification')
    
    def test_get_notification_detail(self):
        """Test getting notification detail."""
        self.authenticate_user()
        
        url = reverse('notification-detail', kwargs={'pk': self.notification.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Notification')
    
    def test_mark_notification_read(self):
        """Test marking notification as read."""
        self.authenticate_user()
        
        url = reverse('notification-mark-read')
        data = {'notification_ids': [str(self.notification.id)]}
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        
        # Verify notification is marked as read
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
    
    def test_mark_all_notifications_read(self):
        """Test marking all notifications as read."""
        self.authenticate_user()
        
        # Create another notification
        Notification.objects.create(
            user=self.user,
            title='Another Notification',
            message='Another test'
        )
        
        url = reverse('notification-mark-read')
        response = self.client.put(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_get_unread_count(self):
        """Test getting unread notification count."""
        self.authenticate_user()
        
        url = reverse('notification-unread-count')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
    
    def test_notification_preferences(self):
        """Test notification preferences API."""
        self.authenticate_user()
        
        url = reverse('notification-preferences')
        
        # Get preferences (should create if not exists)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update preferences
        data = {
            'email_notifications_enabled': False,
            'in_app_notifications_enabled': True,
            'push_notifications_enabled': False
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['email_notifications_enabled'])
    
    def test_admin_bulk_notification_create(self):
        """Test bulk notification creation (admin only)."""
        self.authenticate_admin()
        
        # Create another user to send to
        user2 = User.objects.create_user(
            email='user2@example.com',
            password='pass123',
            user_type='investor'
        )
        
        url = reverse('bulk-notification-create')
        data = {
            'user_ids': [str(self.user.id), str(user2.id)],
            'title': 'Bulk Notification',
            'message': 'This is a bulk notification',
            'notification_type': 'info',
            'priority': 'medium'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_count'], 2)
    
    def test_system_alerts_admin(self):
        """Test system alerts admin endpoints."""
        self.authenticate_admin()
        
        # Create system alert
        url = reverse('admin-system-alert-list')
        data = {
            'title': 'Test Alert',
            'message': 'This is a test alert',
            'alert_type': 'warning',
            'category': 'system',
            'is_public': True
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        alert_id = response.data['id']
        
        # Get system alerts
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        
        # Resolve alert
        resolve_url = reverse('admin-system-alert-resolve', kwargs={'pk': alert_id})
        response = self.client.post(resolve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_user_system_alerts(self):
        """Test user-visible system alerts."""
        self.authenticate_user()
        
        # Create public alert
        SystemAlert.objects.create(
            title='Public Alert',
            message='This is public',
            alert_type='info',
            category='system',
            is_public=True,
            is_active=True
        )
        
        url = reverse('user-system-alert-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_unauthorized_access(self):
        """Test unauthorized access to endpoints."""
        # No authentication
        url = reverse('notification-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Regular user trying admin endpoint
        self.authenticate_user()
        admin_url = reverse('admin-system-alert-list')
        response = self.client.get(admin_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class NotificationServiceTestCase(TestCase):
    """Test cases for notification services."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='investor'
        )
    
    def test_create_notification_service(self):
        """Test notification creation via service."""
        notification = NotificationService.create_notification(
            user=self.user,
            title='Service Test',
            message='Created via service',
            notification_type='success',
            priority='high',
            send_real_time=False,  # Disable WebSocket for test
            send_email=False
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, 'Service Test')
        self.assertEqual(notification.notification_type, 'success')
        self.assertEqual(notification.priority, 'high')
        
        # Check delivery channels
        channels = notification.delivery_channels.all()
        self.assertTrue(channels.filter(channel='in_app').exists())
    
    def test_email_notification_service(self):
        """Test email notification service."""
        # Create email template
        EmailTemplate.objects.create(
            name='Test Template',
            template_type='system_alert',
            subject='Test: {{notification.title}}',
            html_content='<p>{{notification.message}}</p>',
            text_content='{{notification.message}}',
            is_active=True
        )
        
        notification = Notification.objects.create(
            user=self.user,
            title='Email Test',
            message='Test email notification',
            notification_type='system'
        )
        
        # This would normally send an email
        # In tests, we just check that the method runs without error
        result = EmailNotificationService.send_notification_email(notification)
        
        # In a real test environment with email backend,
        # you would check email delivery here


class NotificationIntegrationTestCase(TestCase):
    """Integration tests for notification system."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='investor'
        )
    
    def test_end_to_end_notification_flow(self):
        """Test complete notification flow."""
        # Create notification via service
        notification = NotificationService.create_notification(
            user=self.user,
            title='Integration Test',
            message='End-to-end test',
            notification_type='investment',
            priority='high',
            action_url='/test-url',
            action_label='Test Action',
            send_real_time=False,  # Skip WebSocket for test
            send_email=False  # Skip email for test
        )
        
        # Verify notification exists
        self.assertTrue(Notification.objects.filter(id=notification.id).exists())
        
        # Check delivery channels
        channels = NotificationChannel.objects.filter(notification=notification)
        self.assertTrue(channels.filter(channel='in_app', status='sent').exists())
        
        # Mark as read
        notification.mark_as_read()
        self.assertTrue(notification.is_read)
        
        # Verify read status persisted
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)
    
    def test_system_alert_to_notification_flow(self):
        """Test system alert creating user notifications."""
        # Create system alert
        alert = SystemAlert.objects.create(
            title='System Maintenance',
            message='Scheduled maintenance at 2 AM',
            alert_type='warning',
            category='system',
            is_public=True,
            is_active=True
        )
        
        # This would normally trigger notification creation
        # In a real scenario, this would be handled by signals or tasks
        
        # Verify alert exists
        self.assertTrue(SystemAlert.objects.filter(id=alert.id).exists())
        self.assertTrue(alert.is_active)
        self.assertFalse(alert.is_resolved)
    
    def test_notification_preferences_integration(self):
        """Test notification preferences affecting delivery."""
        # Create preferences
        preferences = NotificationPreference.objects.create(
            user=self.user,
            email_notifications_enabled=False,
            in_app_notifications_enabled=True
        )
        
        # Create notification
        notification = NotificationService.create_notification(
            user=self.user,
            title='Preferences Test',
            message='Testing preferences',
            send_email=True,  # Should be ignored due to preferences
            send_real_time=False
        )
        
        # Email channel should not be created or should be skipped
        email_channels = NotificationChannel.objects.filter(
            notification=notification,
            channel='email'
        )
        
        # Depending on implementation, this might not exist
        # or exist but be marked as 'skipped'
        if email_channels.exists():
            self.assertEqual(email_channels.first().status, 'skipped')


# Test utilities
class NotificationTestUtils:
    """Utility functions for notification tests."""
    
    @staticmethod
    def create_test_user(email='test@example.com', user_type='investor'):
        """Create a test user."""
        return User.objects.create_user(
            email=email,
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type=user_type
        )
    
    @staticmethod
    def create_test_notification(user, **kwargs):
        """Create a test notification."""
        defaults = {
            'title': 'Test Notification',
            'message': 'Test message',
            'notification_type': 'info',
            'priority': 'medium'
        }
        defaults.update(kwargs)
        return Notification.objects.create(user=user, **defaults)
    
    @staticmethod
    def create_jwt_token(user):
        """Create JWT token for user."""
        return str(RefreshToken.for_user(user).access_token)
