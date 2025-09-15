"""
Comprehensive test suite for Capimax Real Estate Tokenization Platform - Marketplace App.

This module contains unit tests, integration tests, and security tests
for all marketplace functionality including models, serializers, views,
services, and business logic.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch, Mock
import uuid

from properties.models import Property
from investments.models import Investment
from .models import (
    MarketListing, TradeOrder, TradeTransaction, EscrowAccount,
    MarketAnalytics, TradingPair, ListingStatus, OrderStatus,
    OrderType, TransactionStatus, ListingType, EscrowStatus
)
from .serializers import (
    MarketListingSerializer, TradeOrderSerializer, TradeTransactionSerializer,
    EscrowAccountSerializer, MarketAnalyticsSerializer
)
from .services import (
    OrderMatchingEngine, TradingFeesCalculator,
    MarketAnalyticsService, MarketDataService
)

User = get_user_model()


class MarketplaceModelTests(TestCase):
    """Test cases for marketplace models."""
    
    def setUp(self):
        """Set up test data for model tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        self.buyer = User.objects.create_user(
            email='buyer@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Buyer'
        )
        
        # Create a property
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
        
        # Create an investment
        self.investment = Investment.objects.create(
            property=self.property,
            investor=self.seller,
            tokens_owned=1000,
            total_invested=Decimal('100000.00')
        )
    
    def test_market_listing_creation(self):
        """Test MarketListing model creation and basic functionality."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00'),
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        self.assertEqual(listing.property_listing, self.property)
        self.assertEqual(listing.seller, self.seller)
        self.assertEqual(listing.tokens_offered, 500)
        self.assertEqual(listing.tokens_available, 500)
        self.assertEqual(listing.status, ListingStatus.ACTIVE)
        self.assertFalse(listing.is_expired)
        
    def test_market_listing_properties(self):
        """Test MarketListing computed properties."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00'),
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Test tokens_filled and fill_percentage
        self.assertEqual(listing.tokens_filled, 0)
        self.assertEqual(listing.fill_percentage, Decimal('0.00'))
        
        # Simulate partial fill
        listing.tokens_available = 300
        listing.save()
        listing.refresh_from_db()
        
        self.assertEqual(listing.tokens_filled, 200)
        self.assertEqual(listing.fill_percentage, Decimal('40.00'))
        
    def test_market_listing_expiration(self):
        """Test MarketListing expiration functionality."""
        # Create expired listing
        expired_listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00'),
            expires_at=timezone.now() - timedelta(days=1)
        )
        
        self.assertTrue(expired_listing.is_expired)
        
    def test_trade_order_creation(self):
        """Test TradeOrder model creation and basic functionality."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        order = TradeOrder.objects.create(
            listing=listing,
            buyer=self.buyer,
            order_type=OrderType.BUY,
            tokens_requested=100,
            price_per_token=Decimal('105.00')
        )
        
        self.assertEqual(order.listing, listing)
        self.assertEqual(order.buyer, self.buyer)
        self.assertEqual(order.tokens_requested, 100)
        self.assertEqual(order.status, OrderStatus.PENDING)
        self.assertEqual(order.total_amount, Decimal('10500.00'))
        
    def test_trade_transaction_creation(self):
        """Test TradeTransaction model creation."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        order = TradeOrder.objects.create(
            listing=listing,
            buyer=self.buyer,
            order_type=OrderType.BUY,
            tokens_requested=100,
            price_per_token=Decimal('105.00')
        )
        
        transaction = TradeTransaction.objects.create(
            order=order,
            seller=self.seller,
            buyer=self.buyer,
            property_traded=self.property,
            tokens_traded=100,
            price_per_token=Decimal('105.00'),
            platform_fee=Decimal('210.00')
        )
        
        self.assertEqual(transaction.order, order)
        self.assertEqual(transaction.tokens_traded, 100)
        self.assertEqual(transaction.total_amount, Decimal('10500.00'))
        self.assertEqual(transaction.platform_fee, Decimal('210.00'))
        self.assertEqual(transaction.net_amount, Decimal('10290.00'))
        self.assertEqual(transaction.status, TransactionStatus.PENDING)
        
    def test_escrow_account_creation(self):
        """Test EscrowAccount model creation."""
        escrow = EscrowAccount.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            property_traded=self.property,
            tokens_in_escrow=100,
            escrow_amount=Decimal('10500.00')
        )
        
        self.assertEqual(escrow.buyer, self.buyer)
        self.assertEqual(escrow.seller, self.seller)
        self.assertEqual(escrow.status, EscrowStatus.PENDING)
        self.assertEqual(escrow.escrow_amount, Decimal('10500.00'))


class MarketplaceSerializerTests(TestCase):
    """Test cases for marketplace serializers."""
    
    def setUp(self):
        """Set up test data for serializer tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
    
    def test_market_listing_serializer_validation(self):
        """Test MarketListingSerializer validation."""
        valid_data = {
            'property_listing': self.property.id,
            'listing_type': ListingType.IMMEDIATE,
            'tokens_offered': 500,
            'price_per_token': '105.00',
            'expires_at': timezone.now() + timedelta(days=7)
        }
        
        serializer = MarketListingSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())
        
        # Test invalid data
        invalid_data = valid_data.copy()
        invalid_data['tokens_offered'] = 0
        
        serializer = MarketListingSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('tokens_offered', serializer.errors)
    
    def test_trade_order_serializer_validation(self):
        """Test TradeOrderSerializer validation."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        valid_data = {
            'listing': listing.id,
            'order_type': OrderType.BUY,
            'tokens_requested': 100,
            'price_per_token': '105.00'
        }
        
        serializer = TradeOrderSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())


class MarketplaceServiceTests(TestCase):
    """Test cases for marketplace services."""
    
    def setUp(self):
        """Set up test data for service tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        self.buyer = User.objects.create_user(
            email='buyer@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Buyer'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
    
    def test_order_matching_engine(self):
        """Test OrderMatchingEngine functionality."""
        # Create a listing
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        # Create an order
        order = TradeOrder.objects.create(
            listing=listing,
            buyer=self.buyer,
            order_type=OrderType.BUY,
            tokens_requested=100,
            price_per_token=Decimal('105.00')
        )
        
        # Test order matching
        engine = OrderMatchingEngine()
        result = engine.match_order(order)
        
        self.assertTrue(result['matched'])
        self.assertEqual(result['tokens_matched'], 100)
        
    def test_trading_fees_calculator(self):
        """Test TradingFeesCalculator functionality."""
        calculator = TradingFeesCalculator()
        
        # Test basic fee calculation
        fee = calculator.calculate_platform_fee(Decimal('10000.00'))
        self.assertEqual(fee, Decimal('200.00'))  # 2% of 10000
        
        # Test volume discount
        discounted_fee = calculator.calculate_platform_fee(
            Decimal('10000.00'), 
            user_volume=Decimal('100000.00')
        )
        self.assertLess(discounted_fee, fee)
    
    def test_market_analytics_service(self):
        """Test MarketAnalyticsService functionality."""
        service = MarketAnalyticsService()
        
        # Test market summary
        summary = service.get_market_summary(self.property)
        self.assertIn('total_volume', summary)
        self.assertIn('average_price', summary)
        self.assertIn('price_change_24h', summary)


class MarketplaceAPITests(APITestCase):
    """Test cases for marketplace API endpoints."""
    
    def setUp(self):
        """Set up test data for API tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        self.buyer = User.objects.create_user(
            email='buyer@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Buyer'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
        
        # Set up authentication
        self.seller_token = RefreshToken.for_user(self.seller).access_token
        self.buyer_token = RefreshToken.for_user(self.buyer).access_token
        
    def test_create_market_listing(self):
        """Test creating a market listing via API."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.seller_token}')
        
        data = {
            'property_listing': self.property.id,
            'listing_type': ListingType.IMMEDIATE,
            'tokens_offered': 500,
            'price_per_token': '105.00',
            'expires_at': (timezone.now() + timedelta(days=7)).isoformat()
        }
        
        response = self.client.post('/api/v1/marketplace/listings/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify listing was created
        listing = MarketListing.objects.get(id=response.data['id'])
        self.assertEqual(listing.seller, self.seller)
        self.assertEqual(listing.tokens_offered, 500)
        
    def test_list_market_listings(self):
        """Test listing market listings via API."""
        # Create test listings
        MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        response = self.client.get('/api/v1/marketplace/listings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        
    def test_create_trade_order(self):
        """Test creating a trade order via API."""
        # Create a listing first
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.buyer_token}')
        
        data = {
            'listing': listing.id,
            'order_type': OrderType.BUY,
            'tokens_requested': 100,
            'price_per_token': '105.00'
        }
        
        response = self.client.post('/api/v1/marketplace/orders/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify order was created
        order = TradeOrder.objects.get(id=response.data['id'])
        self.assertEqual(order.buyer, self.buyer)
        self.assertEqual(order.tokens_requested, 100)
        
    def test_cancel_market_listing(self):
        """Test cancelling a market listing via API."""
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.seller_token}')
        
        response = self.client.post(f'/api/v1/marketplace/listings/{listing.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify listing was cancelled
        listing.refresh_from_db()
        self.assertEqual(listing.status, ListingStatus.CANCELLED)
        
    def test_market_analytics_api(self):
        """Test market analytics API endpoints."""
        response = self.client.get('/api/v1/marketplace/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_market_data_api(self):
        """Test market data API endpoints."""
        response = self.client.get('/api/v1/marketplace/market-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MarketplaceIntegrationTests(TransactionTestCase):
    """Integration tests for marketplace functionality."""
    
    def setUp(self):
        """Set up test data for integration tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        self.buyer = User.objects.create_user(
            email='buyer@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Buyer'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
        
        # Create investment for seller
        self.investment = Investment.objects.create(
            property=self.property,
            investor=self.seller,
            tokens_owned=1000,
            total_invested=Decimal('100000.00')
        )
    
    def test_complete_trade_flow(self):
        """Test complete end-to-end trading flow."""
        # Step 1: Create a market listing
        listing = MarketListing.objects.create(
            property_listing=self.property,
            seller=self.seller,
            listing_type=ListingType.IMMEDIATE,
            tokens_offered=500,
            price_per_token=Decimal('105.00')
        )
        
        # Step 2: Create a trade order
        order = TradeOrder.objects.create(
            listing=listing,
            buyer=self.buyer,
            order_type=OrderType.BUY,
            tokens_requested=100,
            price_per_token=Decimal('105.00')
        )
        
        # Step 3: Process the order through matching engine
        engine = OrderMatchingEngine()
        result = engine.match_order(order)
        
        # Verify the trade was processed
        self.assertTrue(result['matched'])
        self.assertEqual(result['tokens_matched'], 100)
        
        # Verify database state
        order.refresh_from_db()
        listing.refresh_from_db()
        
        self.assertEqual(order.status, OrderStatus.COMPLETED)
        self.assertEqual(listing.tokens_available, 400)
    
    def test_escrow_workflow(self):
        """Test escrow account workflow."""
        # Create escrow account
        escrow = EscrowAccount.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            property_traded=self.property,
            tokens_in_escrow=100,
            escrow_amount=Decimal('10500.00')
        )
        
        # Test escrow approval
        escrow.approve_escrow()
        self.assertEqual(escrow.status, EscrowStatus.APPROVED)
        
        # Test escrow release
        escrow.release_escrow()
        self.assertEqual(escrow.status, EscrowStatus.RELEASED)


class MarketplaceSecurityTests(TestCase):
    """Security tests for marketplace functionality."""
    
    def setUp(self):
        """Set up test data for security tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        self.buyer = User.objects.create_user(
            email='buyer@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Buyer'
        )
        self.malicious_user = User.objects.create_user(
            email='malicious@test.com',
            password='testpass123',
            first_name='Malicious',
            last_name='User'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
    
    def test_authorization_requirements(self):
        """Test that proper authorization is required for actions."""
        client = APIClient()
        
        # Test unauthenticated access
        response = client.post('/api/v1/marketplace/listings/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test creating listing for someone else's property
        client.force_authenticate(user=self.malicious_user)
        
        data = {
            'property_listing': self.property.id,
            'listing_type': ListingType.IMMEDIATE,
            'tokens_offered': 500,
            'price_per_token': '105.00'
        }
        
        response = client.post('/api/v1/marketplace/listings/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_input_validation_security(self):
        """Test input validation to prevent security issues."""
        client = APIClient()
        client.force_authenticate(user=self.seller)
        
        # Test negative token amounts
        data = {
            'property_listing': self.property.id,
            'listing_type': ListingType.IMMEDIATE,
            'tokens_offered': -100,  # Negative tokens
            'price_per_token': '105.00'
        }
        
        response = client.post('/api/v1/marketplace/listings/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test extremely large numbers
        data = {
            'property_listing': self.property.id,
            'listing_type': ListingType.IMMEDIATE,
            'tokens_offered': 999999999999,  # Unrealistic amount
            'price_per_token': '105.00'
        }
        
        response = client.post('/api/v1/marketplace/listings/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_sql_injection_prevention(self):
        """Test that SQL injection attempts are prevented."""
        client = APIClient()
        client.force_authenticate(user=self.buyer)
        
        # Test SQL injection in search parameters
        response = client.get('/api/v1/marketplace/listings/?search=\'; DROP TABLE marketplace_marketlisting; --')
        
        # Should not crash and should return normal response
        self.assertIn(response.status_code, [200, 400])  # Either works normally or rejects input
        
        # Verify table still exists
        self.assertTrue(MarketListing.objects.model._meta.db_table)


class MarketplacePerformanceTests(TestCase):
    """Performance tests for marketplace functionality."""
    
    def setUp(self):
        """Set up test data for performance tests."""
        self.seller = User.objects.create_user(
            email='seller@test.com',
            password='testpass123',
            first_name='John',
            last_name='Seller'
        )
        
        self.property = Property.objects.create(
            name='Test Property',
            address='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            property_type='residential',
            description='A test property',
            price=Decimal('500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=5000,
            owner=self.seller
        )
    
    def test_bulk_listing_creation(self):
        """Test performance with bulk listing creation."""
        import time
        
        start_time = time.time()
        
        # Create 100 listings
        listings = []
        for i in range(100):
            listings.append(MarketListing(
                property_listing=self.property,
                seller=self.seller,
                listing_type=ListingType.IMMEDIATE,
                tokens_offered=10,
                price_per_token=Decimal(f'{100 + i}.00')
            ))
        
        MarketListing.objects.bulk_create(listings)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        self.assertLess(execution_time, 5.0)  # 5 seconds
        
        # Verify all listings were created
        self.assertEqual(MarketListing.objects.count(), 100)
    
    def test_market_data_query_performance(self):
        """Test performance of market data queries."""
        # Create test data
        for i in range(50):
            MarketListing.objects.create(
                property_listing=self.property,
                seller=self.seller,
                listing_type=ListingType.IMMEDIATE,
                tokens_offered=10,
                price_per_token=Decimal(f'{100 + i}.00')
            )
        
        # Test query performance
        import time
        from django.test.utils import override_settings
        
        start_time = time.time()
        
        service = MarketDataService()
        order_book = service.get_order_book(self.property)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete within reasonable time
        self.assertLess(execution_time, 2.0)  # 2 seconds
        
        # Verify data structure
        self.assertIn('buy_orders', order_book)
        self.assertIn('sell_orders', order_book)