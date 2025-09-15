"""
Comprehensive tests for the accounts app.

This module contains unit tests for all models, views, serializers,
and business logic in the accounts application.
"""

import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, Mock

from core.test_base import BaseTestCase, BaseAPITestCase, MockServiceMixin
from core.test_factories import (
    UserFactory, AdminUserFactory, InvestorUserFactory,
    PropertyOwnerUserFactory, BrokerUserFactory,
    PasswordResetTokenFactory, EmailVerificationTokenFactory,
    UserSessionFactory
)
from .models import (
    User, UserRole, PasswordResetToken, 
    EmailVerificationToken, UserSession
)
from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    PasswordChangeSerializer, ProfileUpdateSerializer
)

User = get_user_model()


class UserModelTest(BaseTestCase):
    """Test cases for User model."""
    
    def test_user_creation(self):
        """Test basic user creation."""
        user = UserFactory.create(
            email='test@example.com',
            first_name='John',
            last_name='Doe',
            country='United States'
        )
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'John')
        self.assertEqual(user.last_name, 'Doe')
        self.assertEqual(user.country, 'United States')
        self.assertEqual(user.role, UserRole.INVESTOR)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_user_str_representation(self):
        """Test user string representation."""
        user = UserFactory.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com'
        )
        self.assertEqual(str(user), 'John Doe (john@example.com)')
    
    def test_get_full_name(self):
        """Test get_full_name method."""
        user = UserFactory.create(
            first_name='John',
            last_name='Doe'
        )
        self.assertEqual(user.get_full_name(), 'John Doe')
        
        # Test with empty first name
        user.first_name = ''
        self.assertEqual(user.get_full_name(), 'Doe')
    
    def test_email_uniqueness(self):
        """Test email field uniqueness constraint."""
        UserFactory.create(email='test@example.com')
        
        with self.assertRaises(IntegrityError):
            UserFactory.create(email='test@example.com')
    
    def test_user_roles(self):
        """Test different user roles."""
        admin = AdminUserFactory.create()
        investor = InvestorUserFactory.create()
        owner = PropertyOwnerUserFactory.create()
        broker = BrokerUserFactory.create()
        
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertEqual(investor.role, UserRole.INVESTOR)
        self.assertEqual(owner.role, UserRole.PROPERTY_OWNER)
        self.assertEqual(broker.role, UserRole.BROKER)
    
    def test_can_invest(self):
        """Test can_invest method."""
        # Verified investor can invest
        investor = InvestorUserFactory.create(is_verified=True)
        self.assertTrue(investor.can_invest())
        
        # Verified broker can invest
        broker = BrokerUserFactory.create(is_verified=True)
        self.assertTrue(broker.can_invest())
        
        # Unverified investor cannot invest
        investor.is_verified = False
        investor.save()
        self.assertFalse(investor.can_invest())
        
        # Property owner cannot invest
        owner = PropertyOwnerUserFactory.create(is_verified=True)
        self.assertFalse(owner.can_invest())
    
    def test_can_list_properties(self):
        """Test can_list_properties method."""
        # Verified property owner can list properties
        owner = PropertyOwnerUserFactory.create(is_verified=True)
        self.assertTrue(owner.can_list_properties())
        
        # Unverified property owner cannot list properties
        owner.is_verified = False
        owner.save()
        self.assertFalse(owner.can_list_properties())
        
        # Other roles cannot list properties
        investor = InvestorUserFactory.create(is_verified=True)
        self.assertFalse(investor.can_list_properties())
    
    def test_is_admin_user(self):
        """Test is_admin_user method."""
        admin = AdminUserFactory.create()
        investor = InvestorUserFactory.create()
        
        self.assertTrue(admin.is_admin_user())
        self.assertFalse(investor.is_admin_user())
    
    def test_is_broker_user(self):
        """Test is_broker_user method."""
        broker = BrokerUserFactory.create()
        investor = InvestorUserFactory.create()
        
        self.assertTrue(broker.is_broker_user())
        self.assertFalse(investor.is_broker_user())


class UserManagerTest(BaseTestCase):
    """Test cases for UserManager."""
    
    def test_create_user(self):
        """Test create_user method."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe',
            country='United States'
        )
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertEqual(user.role, UserRole.INVESTOR)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_superuser(self):
        """Test create_superuser method."""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            country='United States'
        )
        
        self.assertEqual(admin.email, 'admin@example.com')
        self.assertTrue(admin.check_password('adminpass123'))
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_verified)
    
    def test_create_user_without_email(self):
        """Test create_user raises error without email."""
        with self.assertRaises(ValueError) as context:
            User.objects.create_user(
                email='',
                password='testpass123'
            )
        
        self.assertIn('The Email field must be set', str(context.exception))
    
    def test_create_superuser_validation(self):
        """Test create_superuser validation."""
        # Test is_staff=False raises error
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_staff=False,
                first_name='Admin',
                last_name='User',
                country='United States'
            )
        
        # Test is_superuser=False raises error
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_superuser=False,
                first_name='Admin',
                last_name='User',
                country='United States'
            )


class PasswordResetTokenModelTest(BaseTestCase):
    """Test cases for PasswordResetToken model."""
    
    def test_token_creation(self):
        """Test password reset token creation."""
        user = UserFactory.create()
        token = PasswordResetTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        self.assertEqual(token.user, user)
        self.assertFalse(token.used)
        self.assertTrue(token.is_valid())
    
    def test_token_str_representation(self):
        """Test token string representation."""
        user = UserFactory.create(email='test@example.com')
        token = PasswordResetTokenFactory.create(user=user)
        
        self.assertIn('test@example.com', str(token))
    
    def test_is_valid(self):
        """Test is_valid method."""
        user = UserFactory.create()
        
        # Valid token
        valid_token = PasswordResetTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=1),
            used=False
        )
        self.assertTrue(valid_token.is_valid())
        
        # Expired token
        expired_token = PasswordResetTokenFactory.create(
            user=user,
            expires_at=timezone.now() - timedelta(hours=1),
            used=False
        )
        self.assertFalse(expired_token.is_valid())
        
        # Used token
        used_token = PasswordResetTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=1),
            used=True
        )
        self.assertFalse(used_token.is_valid())
    
    def test_mark_as_used(self):
        """Test mark_as_used method."""
        token = PasswordResetTokenFactory.create(used=False)
        self.assertFalse(token.used)
        
        token.mark_as_used()
        self.assertTrue(token.used)


class EmailVerificationTokenModelTest(BaseTestCase):
    """Test cases for EmailVerificationToken model."""
    
    def test_token_creation(self):
        """Test email verification token creation."""
        user = UserFactory.create(is_verified=False)
        token = EmailVerificationTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        self.assertEqual(token.user, user)
        self.assertFalse(token.verified)
        self.assertTrue(token.is_valid())
    
    def test_is_valid(self):
        """Test is_valid method."""
        user = UserFactory.create()
        
        # Valid token
        valid_token = EmailVerificationTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24),
            verified=False
        )
        self.assertTrue(valid_token.is_valid())
        
        # Expired token
        expired_token = EmailVerificationTokenFactory.create(
            user=user,
            expires_at=timezone.now() - timedelta(hours=1),
            verified=False
        )
        self.assertFalse(expired_token.is_valid())
        
        # Already verified token
        verified_token = EmailVerificationTokenFactory.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24),
            verified=True
        )
        self.assertFalse(verified_token.is_valid())
    
    def test_mark_as_verified(self):
        """Test mark_as_verified method."""
        token = EmailVerificationTokenFactory.create(verified=False)
        self.assertFalse(token.verified)
        
        token.mark_as_verified()
        self.assertTrue(token.verified)


class UserSessionModelTest(BaseTestCase):
    """Test cases for UserSession model."""
    
    def test_session_creation(self):
        """Test user session creation."""
        user = UserFactory.create()
        session = UserSessionFactory.create(
            user=user,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test Browser'
        )
        
        self.assertEqual(session.user, user)
        self.assertEqual(session.ip_address, '192.168.1.1')
        self.assertTrue(session.is_active)
    
    def test_session_str_representation(self):
        """Test session string representation."""
        user = UserFactory.create(email='test@example.com')
        session = UserSessionFactory.create(
            user=user,
            ip_address='192.168.1.1'
        )
        
        session_str = str(session)
        self.assertIn('test@example.com', session_str)
        self.assertIn('192.168.1.1', session_str)
    
    def test_deactivate(self):
        """Test deactivate method."""
        session = UserSessionFactory.create(is_active=True)
        self.assertTrue(session.is_active)
        
        session.deactivate()
        self.assertFalse(session.is_active)
