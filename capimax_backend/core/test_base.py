"""
Base test classes and utilities for the Capimax Backend test suite.

This module provides common test functionality, fixtures, and utilities
that can be used across all test modules for consistent testing.
"""

import pytest
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import Mock, patch
from decimal import Decimal
from django.core.cache import cache
from django.urls import reverse

from .test_factories import TestDataMixin, UserFactory, AdminUserFactory
from accounts.models import UserRole

User = get_user_model()


class BaseTestCase(TestCase, TestDataMixin):
    """
    Base test case for all Django model and utility tests.
    
    Provides common setup, teardown, and utility methods for testing.
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test class."""
        super().setUpClass()
        cache.clear()
    
    def setUp(self):
        """Set up each test case."""
        super().setUp()
        cache.clear()
        
        # Create common test users
        self.admin_user = AdminUserFactory.create(
            email='admin@test.com',
            password='test_password123'
        )
        self.investor_user = self.create_test_user(
            role=UserRole.INVESTOR,
            email='investor@test.com',
            password='test_password123'
        )
        self.property_owner_user = self.create_test_user(
            role=UserRole.PROPERTY_OWNER,
            email='owner@test.com',
            password='test_password123'
        )
        self.broker_user = self.create_test_user(
            role=UserRole.BROKER,
            email='broker@test.com',
            password='test_password123'
        )
    
    def tearDown(self):
        """Clean up after each test."""
        cache.clear()
        super().tearDown()
    
    def assertDecimalEqual(self, first, second, places=2, msg=None):
        """Assert that two decimal values are equal within specified places."""
        if isinstance(first, str):
            first = Decimal(first)
        if isinstance(second, str):
            second = Decimal(second)
        
        self.assertEqual(
            round(first, places),
            round(second, places),
            msg
        )
    
    def assertDecimalAlmostEqual(self, first, second, delta=Decimal('0.01'), msg=None):
        """Assert that two decimal values are almost equal within delta."""
        if isinstance(first, str):
            first = Decimal(first)
        if isinstance(second, str):
            second = Decimal(second)
        
        diff = abs(first - second)
        self.assertLessEqual(diff, delta, msg)


class BaseAPITestCase(APITestCase, TestDataMixin):
    """
    Base test case for all API tests.
    
    Provides authentication utilities and common API testing methods.
    """
    
    @classmethod
    def setUpClass(cls):
        """Set up test class."""
        super().setUpClass()
        cache.clear()
    
    def setUp(self):
        """Set up each test case."""
        super().setUp()
        cache.clear()
        
        self.client = APIClient()
        
        # Create common test users
        self.admin_user = AdminUserFactory.create(
            email='admin@test.com',
            password='test_password123'
        )
        self.investor_user = self.create_test_user(
            role=UserRole.INVESTOR,
            email='investor@test.com',
            password='test_password123'
        )
        self.property_owner_user = self.create_test_user(
            role=UserRole.PROPERTY_OWNER,
            email='owner@test.com',
            password='test_password123'
        )
        self.broker_user = self.create_test_user(
            role=UserRole.BROKER,
            email='broker@test.com',
            password='test_password123'
        )
        
        # Generate JWT tokens for authentication
        self.admin_token = self.get_jwt_token(self.admin_user)
        self.investor_token = self.get_jwt_token(self.investor_user)
        self.property_owner_token = self.get_jwt_token(self.property_owner_user)
        self.broker_token = self.get_jwt_token(self.broker_user)
    
    def tearDown(self):
        """Clean up after each test."""
        cache.clear()
        super().tearDown()
    
    def get_jwt_token(self, user):
        """Generate JWT token for user authentication."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def authenticate(self, user):
        """Authenticate client with user token."""
        token = self.get_jwt_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return token
    
    def authenticate_admin(self):
        """Authenticate as admin user."""
        return self.authenticate(self.admin_user)
    
    def authenticate_investor(self):
        """Authenticate as investor user."""
        return self.authenticate(self.investor_user)
    
    def authenticate_property_owner(self):
        """Authenticate as property owner user."""
        return self.authenticate(self.property_owner_user)
    
    def authenticate_broker(self):
        """Authenticate as broker user."""
        return self.authenticate(self.broker_user)
    
    def unauthenticate(self):
        """Remove authentication from client."""
        self.client.credentials()
    
    def assertAPIError(self, response, status_code, error_code=None, error_message=None):
        """Assert API error response format."""
        self.assertEqual(response.status_code, status_code)
        
        if error_code:
            self.assertIn('error', response.data)
            self.assertEqual(response.data['error']['code'], error_code)
        
        if error_message:
            self.assertIn('error', response.data)
            self.assertIn(error_message, response.data['error']['message'])
    
    def assertAPISuccess(self, response, status_code=200):
        """Assert successful API response."""
        self.assertEqual(response.status_code, status_code)
        self.assertNotIn('error', response.data)
    
    def assertPaginatedResponse(self, response, expected_count=None):
        """Assert paginated API response format."""
        self.assertAPISuccess(response)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        
        if expected_count is not None:
            self.assertEqual(len(response.data['results']), expected_count)


class BaseTransactionTestCase(TransactionTestCase, TestDataMixin):
    """
    Base test case for tests requiring database transactions.
    
    Used for testing database-level constraints, transactions, and concurrency.
    """
    
    def setUp(self):
        """Set up each test case."""
        super().setUp()
        cache.clear()
        
        # Create common test users
        self.admin_user = AdminUserFactory.create(
            email='admin@test.com',
            password='test_password123'
        )
        self.investor_user = self.create_test_user(
            role=UserRole.INVESTOR,
            email='investor@test.com',
            password='test_password123'
        )
    
    def tearDown(self):
        """Clean up after each test."""
        cache.clear()
        super().tearDown()


class MockServiceMixin:
    """
    Mixin providing mock services for external dependencies.
    
    Provides common mocking utilities for payment providers, KYC services,
    blockchain interactions, and other external services.
    """
    
    def mock_stripe_payment(self, success=True, amount=None):
        """Mock Stripe payment processing."""
        mock_charge = Mock()
        mock_charge.id = 'ch_test_12345'
        mock_charge.amount = amount or 10000  # $100.00 in cents
        mock_charge.currency = 'usd'
        mock_charge.status = 'succeeded' if success else 'failed'
        mock_charge.paid = success
        
        return patch('stripe.Charge.create', return_value=mock_charge)
    
    def mock_coinbase_payment(self, success=True, amount=None):
        """Mock Coinbase payment processing."""
        mock_charge = Mock()
        mock_charge.id = 'cb_test_12345'
        mock_charge.amount = str(amount or Decimal('100.00'))
        mock_charge.currency = 'USD'
        mock_charge.status = 'completed' if success else 'failed'
        
        return patch('coinbase_commerce.Charge.create', return_value=mock_charge)
    
    def mock_kyc_verification(self, success=True, confidence_score=0.95):
        """Mock KYC verification process."""
        mock_result = Mock()
        mock_result.verification_id = 'kyc_test_12345'
        mock_result.status = 'approved' if success else 'rejected'
        mock_result.confidence_score = confidence_score
        
        return patch('kyc.services.KYCService.verify_identity', return_value=mock_result)
    
    def mock_blockchain_transaction(self, success=True, tx_hash=None):
        """Mock blockchain transaction."""
        mock_tx = Mock()
        mock_tx.hash = tx_hash or '0x' + '1' * 64
        mock_tx.status = 1 if success else 0
        mock_tx.gas_used = 21000
        
        return patch('web3.Web3.eth.send_transaction', return_value=mock_tx)
    
    def mock_email_service(self):
        """Mock email service."""
        return patch('django.core.mail.send_mail', return_value=True)


class PerformanceTestMixin:
    """
    Mixin for performance testing utilities.
    
    Provides methods for testing query counts, response times, and
    other performance metrics.
    """
    
    def assertMaxQueries(self, max_queries):
        """Context manager to assert maximum number of database queries."""
        from django.test.utils import override_settings
        from django.db import connection
        from django.test import TransactionTestCase
        
        return self.assertNumQueries(max_queries, using='default')
    
    def benchmark_view(self, view_func, *args, **kwargs):
        """Benchmark a view function execution time."""
        import time
        
        start_time = time.time()
        result = view_func(*args, **kwargs)
        end_time = time.time()
        
        execution_time = end_time - start_time
        return result, execution_time
    
    def assert_response_time(self, response_time, max_time=1.0):
        """Assert that response time is within acceptable limits."""
        self.assertLessEqual(
            response_time, 
            max_time,
            f"Response time {response_time:.2f}s exceeded maximum {max_time}s"
        )


class IntegrationTestMixin:
    """
    Mixin for integration testing utilities.
    
    Provides methods for testing complete user workflows and
    cross-app functionality.
    """
    
    def complete_investment_flow(self, user, property, amount):
        """Complete a full investment flow for testing."""
        from investments.models import Investment
        from payments.models import Payment, Transaction
        
        # Create payment
        payment = Payment.objects.create(
            user=user,
            amount=amount,
            currency='USD',
            payment_method='credit_card',
            status='completed'
        )
        
        # Create investment
        investment = Investment.objects.create(
            user=user,
            property=property,
            amount_invested=amount,
            tokens_purchased=10,
            purchase_price_per_token=amount / 10,
            status='active'
        )
        
        # Create transaction
        transaction = Transaction.objects.create(
            user=user,
            transaction_type='investment',
            amount=amount,
            status='completed',
            related_payment=payment,
            related_investment=investment
        )
        
        return investment, payment, transaction
    
    def complete_kyc_flow(self, user):
        """Complete a full KYC verification flow for testing."""
        from kyc.models import KYCDocument, KYCVerification
        
        # Create document
        document = KYCDocument.objects.create(
            user=user,
            document_type='passport',
            document_number='TEST123456',
            status='approved'
        )
        
        # Create verification
        verification = KYCVerification.objects.create(
            user=user,
            status='approved',
            confidence_score=Decimal('0.95')
        )
        
        # Update user verification status
        user.is_verified = True
        user.save()
        
        return document, verification


# Pytest fixtures
@pytest.fixture
def admin_user():
    """Pytest fixture for admin user."""
    return AdminUserFactory.create(
        email='admin@test.com',
        password='test_password123'
    )


@pytest.fixture
def investor_user():
    """Pytest fixture for investor user."""
    return UserFactory.create(
        role=UserRole.INVESTOR,
        email='investor@test.com',
        password='test_password123'
    )


@pytest.fixture
def property_owner_user():
    """Pytest fixture for property owner user."""
    return UserFactory.create(
        role=UserRole.PROPERTY_OWNER,
        email='owner@test.com',
        password='test_password123'
    )


@pytest.fixture
def broker_user():
    """Pytest fixture for broker user."""
    return UserFactory.create(
        role=UserRole.BROKER,
        email='broker@test.com',
        password='test_password123'
    )


@pytest.fixture
def api_client():
    """Pytest fixture for API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, investor_user):
    """Pytest fixture for authenticated API client."""
    token = RefreshToken.for_user(investor_user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def test_property():
    """Pytest fixture for test property."""
    from .test_factories import PropertyFactory
    return PropertyFactory.create()


@pytest.fixture
def test_investment(investor_user, test_property):
    """Pytest fixture for test investment."""
    from .test_factories import InvestmentFactory
    return InvestmentFactory.create(user=investor_user, property=test_property)


# Utility functions for common test operations
def create_test_data_set():
    """Create a comprehensive set of test data."""
    # Create users
    admin = AdminUserFactory.create(email='admin@test.com')
    investors = [UserFactory.create(role=UserRole.INVESTOR) for _ in range(5)]
    owners = [UserFactory.create(role=UserRole.PROPERTY_OWNER) for _ in range(3)]
    brokers = [UserFactory.create(role=UserRole.BROKER) for _ in range(2)]
    
    # Create properties
    from .test_factories import PropertyFactory
    properties = [PropertyFactory.create(owner=owners[i % len(owners)]) for i in range(10)]
    
    # Create investments
    from .test_factories import InvestmentFactory
    investments = []
    for i, property in enumerate(properties[:5]):
        for j, investor in enumerate(investors):
            if (i + j) % 2 == 0:  # Create some investments
                investments.append(
                    InvestmentFactory.create(user=investor, property=property)
                )
    
    return {
        'admin': admin,
        'investors': investors,
        'owners': owners,
        'brokers': brokers,
        'properties': properties,
        'investments': investments
    }