"""
Marketplace Views for Capimax Real Estate Tokenization Platform.

This module contains API views and viewsets for the secondary marketplace system,
providing endpoints for market listings, orders, transactions, and analytics.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.db.models import Q, Prefetch
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
import logging

from .models import (
    MarketListing, TradeOrder, TradeTransaction, EscrowAccount,
    MarketAnalytics, TradingPair, ListingStatus, OrderStatus,
    TransactionStatus, EscrowStatus
)
from .serializers import (
    MarketListingSerializer, MarketListingCreateSerializer, MarketListingListSerializer,
    TradeOrderSerializer, TradeOrderCreateSerializer,
    TradeTransactionSerializer, TradeTransactionListSerializer,
    EscrowAccountSerializer, MarketAnalyticsSerializer, TradingPairSerializer,
    MarketOverviewSerializer, OrderBookSerializer, TradingHistorySerializer,
    MarketMetricsSerializer
)
from .services import (
    OrderMatchingEngine, TradingFeesCalculator, MarketAnalyticsService, MarketDataService
)
from .permissions import MarketplacePermissions
from properties.models import Property
from core.pagination import StandardResultsSetPagination
from core.utils import create_success_response

logger = logging.getLogger(__name__)


class MarketListingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing market listings in the secondary marketplace.
    
    Provides CRUD operations for buy/sell listings with proper validation
    and business logic integration.
    """
    
    queryset = MarketListing.objects.select_related(
        'property_listing', 'seller'
    ).prefetch_related(
        'property_listing__images'
    ).all()
    permission_classes = [permissions.IsAuthenticated, MarketplacePermissions]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['listing_type', 'status', 'property_listing', 'seller']
    ordering_fields = ['price_per_token', 'created_at', 'expires_at', 'tokens_remaining']
    ordering = ['-created_at']
    search_fields = ['property_listing__title', 'property_listing__city', 'notes']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return MarketListingCreateSerializer
        elif self.action == 'list':
            return MarketListingListSerializer
        return MarketListingSerializer
    
    def list(self, request, *args, **kwargs):
        """List marketplace listings with wrapped response for frontend apiClient."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.paginator.get_paginated_response(serializer.data)
            return Response(create_success_response(data=paginated.data))
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))

    def retrieve(self, request, *args, **kwargs):
        """Get single listing with wrapped response."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(create_success_response(data=serializer.data))

    def get_queryset(self):
        """Filter queryset based on user permissions and request parameters."""
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()
        queryset = super().get_queryset()

        # Filter by property if specified
        property_id = self.request.query_params.get('property_id')
        if property_id:
            queryset = queryset.filter(property_listing_id=property_id)

        # Filter by listing type if specified
        listing_type = self.request.query_params.get('listing_type')
        if listing_type:
            queryset = queryset.filter(listing_type=listing_type)

        # Filter active listings only
        if self.request.query_params.get('active_only', '').lower() == 'true':
            queryset = queryset.filter(
                status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                expires_at__gt=timezone.now(),
                tokens_remaining__gt=0
            )
        
        # Filter user's own listings
        if self.request.query_params.get('my_listings', '').lower() == 'true':
            queryset = queryset.filter(seller=self.request.user)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the seller to the current user when creating a listing."""
        # Set default expires_at if not provided (7 days from now)
        if not serializer.validated_data.get('expires_at'):
            serializer.validated_data['expires_at'] = timezone.now() + timezone.timedelta(days=7)
        
        serializer.save(seller=self.request.user)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a market listing.

        Note: do NOT wrap `self.get_object()` in a bare except — DRF raises
        `PermissionDenied` / `NotAuthenticated` / `Http404` from there, and
        each must be allowed to bubble so DRF can render the correct
        status code. Otherwise a 403 becomes a 500.
        """
        from rest_framework.exceptions import (
            APIException, NotAuthenticated, PermissionDenied,
        )
        from django.http import Http404

        # get_object() runs permission_classes — let auth errors bubble.
        listing = self.get_object()

        # Belt-and-braces ownership check (DRF's permission already enforced).
        if listing.seller != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only cancel your own listings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if listing.status not in [ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED]:
            return Response(
                {'error': 'Only active listings can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reason = request.data.get('reason', 'Cancelled by user')
            listing.cancel_listing(reason)
        except (NotAuthenticated, PermissionDenied, Http404, APIException):
            raise
        except Exception as e:
            logger.error(f"Listing cancellation failed: {str(e)}")
            return Response(
                {'error': 'Failed to cancel listing.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'message': 'Listing cancelled successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """Extend a market listing expiry date."""
        try:
            listing = self.get_object()
            
            # Check permissions
            if listing.seller != request.user:
                return Response(
                    {'error': 'You can only extend your own listings.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get new expiry date from request
            new_expires_at = request.data.get('expires_at')
            if not new_expires_at:
                # Default to extending by 7 days
                new_expires_at = timezone.now() + timezone.timedelta(days=7)
            
            listing.expires_at = new_expires_at
            listing.save(update_fields=['expires_at'])
            
            serializer = self.get_serializer(listing)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Listing extension failed: {str(e)}")
            return Response(
                {'error': 'Failed to extend listing.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TradeOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trade orders in the marketplace.
    
    Handles order creation, matching, and execution with proper
    business logic and error handling.
    """
    
    queryset = TradeOrder.objects.select_related(
        'listing', 'listing__property', 'buyer'
    ).all()
    permission_classes = [permissions.IsAuthenticated, MarketplacePermissions]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['order_type', 'status', 'listing', 'buyer']
    ordering_fields = ['price_per_token', 'created_at', 'executed_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return TradeOrderCreateSerializer
        return TradeOrderSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions and request parameters."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        queryset = super().get_queryset()

        # Filter user's own orders if not staff
        if not self.request.user.is_staff:
            if self.request.query_params.get('all_orders', '').lower() != 'true':
                queryset = queryset.filter(buyer=self.request.user)

        # Filter by property if specified
        property_id = self.request.query_params.get('property_id')
        if property_id:
            queryset = queryset.filter(listing__property_listing_id=property_id)

        return queryset
    
    def perform_create(self, serializer):
        """Process order creation with automatic matching."""
        try:
            with transaction.atomic():
                # Set the buyer to current user
                order = serializer.save(buyer=self.request.user)
                
                # Initialize order matching engine
                matching_engine = OrderMatchingEngine()
                
                # Attempt to match the order
                match_result = matching_engine.match_order(order)
                
                if match_result['success'] and match_result['trades_executed']:
                    logger.info(f"Order {order.id} matched successfully. "
                              f"Executed {len(match_result['trades_executed'])} trades.")
                
                # Return the updated order in the response
                order.refresh_from_db()
                
        except Exception as e:
            logger.error(f"Order creation/matching failed: {str(e)}")
            raise
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a trade order."""
        try:
            order = self.get_object()
            
            # Check permissions
            if order.buyer != request.user and not request.user.is_staff:
                return Response(
                    {'error': 'You can only cancel your own orders.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if order can be cancelled
            if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
                return Response(
                    {'error': 'Only pending or processing orders can be cancelled.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order.cancel_order()
            
            return Response(
                {'message': 'Order cancelled successfully.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Order cancellation failed: {str(e)}")
            return Response(
                {'error': 'Failed to cancel order.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TradeTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing trade transactions.
    
    Provides read-only access to completed and pending transactions
    with proper filtering and permissions.
    """
    
    queryset = TradeTransaction.objects.select_related(
        'buyer', 'seller', 'property_traded', 'listing', 'order'
    ).all()
    permission_classes = [permissions.IsAuthenticated, MarketplacePermissions]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'buyer', 'seller', 'property_traded']
    ordering_fields = ['price_per_token', 'total_amount', 'created_at', 'completed_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return TradeTransactionListSerializer
        return TradeTransactionSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        queryset = super().get_queryset()

        # Non-staff users can only see their own transactions
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(buyer=self.request.user) | Q(seller=self.request.user)
            )

        # Filter by property if specified
        property_id = self.request.query_params.get('property_id')
        if property_id:
            queryset = queryset.filter(property_traded_id=property_id)

        return queryset


class EscrowAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing escrow accounts.
    
    Provides access to escrow status and approval actions
    for secure transaction settlement.
    """
    
    queryset = EscrowAccount.objects.select_related(
        'transaction', 'transaction__buyer', 'transaction__seller',
        'resolved_by'
    ).all()
    permission_classes = [permissions.IsAuthenticated, MarketplacePermissions]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'transaction']
    ordering_fields = ['amount_held', 'created_at', 'timeout_at']
    ordering = ['-created_at']
    serializer_class = EscrowAccountSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        queryset = super().get_queryset()

        # Non-staff users can only see their own escrow accounts
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(transaction__buyer=self.request.user) |
                Q(transaction__seller=self.request.user)
            )

        return queryset
    
    @action(detail=True, methods=['post'])
    def approve_buyer(self, request, pk=None):
        """Approve escrow release as buyer."""
        try:
            escrow = self.get_object()
            
            # Check if user is the buyer
            if escrow.transaction.buyer != request.user:
                return Response(
                    {'error': 'Only the buyer can approve this escrow.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            escrow.approve_by_buyer()
            
            return Response(
                {'message': 'Escrow approved by buyer.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Buyer escrow approval failed: {str(e)}")
            return Response(
                {'error': 'Failed to approve escrow.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def approve_seller(self, request, pk=None):
        """Approve escrow release as seller."""
        try:
            escrow = self.get_object()
            
            # Check if user is the seller
            if escrow.transaction.seller != request.user:
                return Response(
                    {'error': 'Only the seller can approve this escrow.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            escrow.approve_by_seller()
            
            return Response(
                {'message': 'Escrow approved by seller.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Seller escrow approval failed: {str(e)}")
            return Response(
                {'error': 'Failed to approve escrow.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MarketAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for market analytics and performance data.
    
    Provides comprehensive analytics for properties and overall market
    with various timeframes and filtering options.
    """
    
    queryset = MarketAnalytics.objects.select_related('property_analyzed').all()
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['property_analyzed', 'timeframe']
    ordering_fields = ['volume_usd', 'trade_count', 'period_start']
    ordering = ['-period_start']
    serializer_class = MarketAnalyticsSerializer
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get market overview with key statistics."""
        try:
            analytics_service = MarketAnalyticsService()
            
            # Get overall market analytics
            market_data = analytics_service.generate_analytics(
                property_obj=None,
                timeframe=request.query_params.get('timeframe', '24h')
            )
            
            # Get recent top trades
            recent_trades = TradeTransaction.objects.filter(
                status=TransactionStatus.COMPLETED
            ).select_related(
                'buyer', 'seller', 'property_traded'
            ).order_by('-completed_at')[:10]
            
            overview_data = {
                'total_volume_24h': market_data['volume_metrics']['volume_usd'],
                'total_trades_24h': market_data['volume_metrics']['trade_count'],
                'active_listings': MarketListing.objects.filter(
                    status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                    expires_at__gt=timezone.now()
                ).count(),
                'total_properties': Property.objects.filter(
                    market_listings__isnull=False
                ).distinct().count(),
                'top_gainers': [],  # Would require price change calculation
                'recent_trades': recent_trades,
                'market_statistics': [market_data] if market_data else []
            }
            
            serializer = MarketOverviewSerializer(overview_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Market overview generation failed: {str(e)}")
            return Response(
                {'error': 'Failed to generate market overview.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def property_analytics(self, request):
        """Get analytics for a specific property."""
        try:
            property_id = request.query_params.get('property_id')
            if not property_id:
                return Response(
                    {'error': 'property_id parameter is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                property_obj = Property.objects.get(id=property_id)
            except Property.DoesNotExist:
                return Response(
                    {'error': 'Property not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            analytics_service = MarketAnalyticsService()
            timeframe = request.query_params.get('timeframe', '24h')
            
            analytics_data = analytics_service.generate_analytics(
                property_obj=property_obj,
                timeframe=timeframe
            )
            
            return Response(analytics_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Property analytics generation failed: {str(e)}")
            return Response(
                {'error': 'Failed to generate property analytics.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MarketDataViewSet(viewsets.ViewSet):
    """
    ViewSet for real-time market data and trading information.
    
    Provides order books, trading history, and market metrics
    for frontend trading interfaces.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def order_book(self, request):
        """Get order book data for a property."""
        try:
            property_id = request.query_params.get('property_id')
            if not property_id:
                return Response(
                    {'error': 'property_id parameter is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                property_obj = Property.objects.get(id=property_id)
            except Property.DoesNotExist:
                return Response(
                    {'error': 'Property not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            market_service = MarketDataService()
            depth = int(request.query_params.get('depth', 10))
            
            order_book_data = market_service.get_order_book(
                property_obj=property_obj,
                depth=depth
            )
            
            serializer = OrderBookSerializer(order_book_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Order book generation failed: {str(e)}")
            return Response(
                {'error': 'Failed to generate order book.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def trading_history(self, request):
        """Get trading history for a property."""
        try:
            property_id = request.query_params.get('property_id')
            if not property_id:
                return Response(
                    {'error': 'property_id parameter is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                property_obj = Property.objects.get(id=property_id)
            except Property.DoesNotExist:
                return Response(
                    {'error': 'Property not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            market_service = MarketDataService()
            timeframe = request.query_params.get('timeframe', '24h')
            limit = int(request.query_params.get('limit', 100))
            
            history_data = market_service.get_trading_history(
                property_obj=property_obj,
                timeframe=timeframe,
                limit=limit
            )
            
            serializer = TradingHistorySerializer(history_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Trading history generation failed: {str(e)}")
            return Response(
                {'error': 'Failed to generate trading history.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def market_metrics(self, request):
        """Get comprehensive market metrics and KPIs."""
        try:
            from decimal import Decimal
            
            # Generate various market metrics
            timeframe = request.query_params.get('timeframe', '24h')
            
            # Calculate metrics based on timeframe
            analytics_service = MarketAnalyticsService()
            market_data = analytics_service.generate_analytics(
                property_obj=None,
                timeframe=timeframe
            )
            
            fees_calculator = TradingFeesCalculator()
            
            metrics_data = {
                'total_volume_usd': market_data['volume_metrics']['volume_usd'],
                'total_trades': market_data['volume_metrics']['trade_count'],
                'unique_traders': market_data['volume_metrics']['unique_traders'],
                'total_liquidity': Decimal('0.00'),  # Would calculate from active listings
                'average_spread': Decimal('0.00'),  # Would calculate from order books
                'platform_revenue': market_data['platform_revenue'],
                'active_properties': Property.objects.filter(
                    market_listings__isnull=False
                ).distinct().count(),
                'volume_change_24h': Decimal('0.00'),  # Would need comparison data
                'trades_change_24h': Decimal('0.00'),  # Would need comparison data
                'price_volatility': Decimal('0.00'),  # Would calculate from price data
                'market_participation': Decimal('0.00'),  # Would calculate participation rate
            }
            
            serializer = MarketMetricsSerializer(metrics_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Market metrics generation failed: {str(e)}")
            return Response(
                {'error': 'Failed to generate market metrics.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TradingPairViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trading pairs.
    
    Admin-level functionality for defining which properties
    can be traded against each other or base currencies.
    """
    
    queryset = TradingPair.objects.select_related(
        'base_property_pair', 'quote_property_pair'
    ).all()
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['pair_type', 'status', 'base_property_pair']
    ordering_fields = ['symbol', 'created_at']
    ordering = ['symbol']
    serializer_class = TradingPairSerializer
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause trading for a trading pair."""
        try:
            pair = self.get_object()
            pair.pause_trading()
            
            return Response(
                {'message': f'Trading paused for {pair.symbol}.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Trading pair pause failed: {str(e)}")
            return Response(
                {'error': 'Failed to pause trading pair.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume trading for a trading pair."""
        try:
            pair = self.get_object()
            pair.resume_trading()
            
            return Response(
                {'message': f'Trading resumed for {pair.symbol}.'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Trading pair resume failed: {str(e)}")
            return Response(
                {'error': 'Failed to resume trading pair.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )