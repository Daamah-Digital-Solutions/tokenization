"""
Marketplace Services for Capimax Real Estate Tokenization Platform.

This module contains business logic services for the secondary marketplace system,
including order matching engine, trading fees calculation, and market analytics.
"""

from django.db import transaction, models
from django.db.models import Sum, Count, Q, Avg, Max, Min, F
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from typing import List, Dict, Optional, Tuple
import logging

from .models import (
    MarketListing, TradeOrder, TradeTransaction, EscrowAccount,
    MarketAnalytics, TradingPair, ListingStatus, OrderStatus,
    TransactionStatus, EscrowStatus, ListingType, OrderType
)
from accounts.models import User
from properties.models import Property

logger = logging.getLogger(__name__)


class OrderMatchingEngine:
    """
    Order matching engine for processing trade orders against market listings.
    
    Handles order matching, execution, and trade settlement with proper
    atomic transactions and error handling.
    """
    
    def __init__(self):
        self.platform_fee_rate = Decimal('0.025')  # 2.5% default
    
    def match_order(self, order: TradeOrder) -> Dict:
        """
        Match a trade order against available market listings.
        
        Returns:
            Dict with match results including executed trades and remaining order.
        """
        try:
            with transaction.atomic():
                result = {
                    'success': False,
                    'trades_executed': [],
                    'total_tokens_filled': 0,
                    'total_amount_paid': Decimal('0.00'),
                    'fees_paid': Decimal('0.00'),
                    'order_status': order.status,
                    'remaining_tokens': order.tokens_requested,
                    'error_message': None
                }
                
                # Find matching listings based on order type
                matching_listings = self._find_matching_listings(order)
                
                if not matching_listings:
                    result['error_message'] = "No matching listings found"
                    return result
                
                # Execute trades against matching listings
                for listing in matching_listings:
                    if order.tokens_remaining == 0:
                        break
                    
                    trade_result = self._execute_trade(order, listing)
                    if trade_result['success']:
                        result['trades_executed'].append(trade_result['transaction'])
                        result['total_tokens_filled'] += trade_result['tokens_traded']
                        result['total_amount_paid'] += trade_result['amount_paid']
                        result['fees_paid'] += trade_result['fees_paid']
                
                # Update order status
                if result['total_tokens_filled'] > 0:
                    order.tokens_filled = result['total_tokens_filled']
                    if order.is_fully_filled:
                        order.status = OrderStatus.COMPLETED
                    order.save()
                    
                    result['success'] = True
                    result['order_status'] = order.status
                    result['remaining_tokens'] = order.tokens_remaining
                
                return result
                
        except Exception as e:
            logger.error(f"Order matching failed for order {order.id}: {str(e)}")
            return {
                'success': False,
                'error_message': f"Order matching failed: {str(e)}",
                'trades_executed': [],
                'total_tokens_filled': 0,
                'total_amount_paid': Decimal('0.00'),
                'fees_paid': Decimal('0.00'),
                'order_status': order.status,
                'remaining_tokens': order.tokens_requested
            }
    
    def _find_matching_listings(self, order: TradeOrder) -> List[MarketListing]:
        """Find market listings that match the trade order criteria."""
        # Get the property from the order's listing
        property_obj = order.listing.property
        
        # For buy orders, find sell listings with acceptable prices
        if order.listing.listing_type == ListingType.SELL:
            # This is a buy order - find sell listings
            listings = MarketListing.objects.filter(
                property=property_obj,
                listing_type=ListingType.SELL,
                status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                tokens_remaining__gt=0,
                expires_at__gt=timezone.now()
            ).exclude(
                seller=order.buyer  # Don't match user's own listings
            )
            
            # Filter by acceptable price for limit orders
            if order.order_type == OrderType.LIMIT:
                listings = listings.filter(price_per_token__lte=order.price_per_token)
            
            # Order by priority: best price first, then priority score, then time
            listings = listings.order_by(
                'price_per_token',
                '-priority_score',
                'created_at'
            )
        
        else:
            # This is a sell order - find buy listings
            listings = MarketListing.objects.filter(
                property=property_obj,
                listing_type=ListingType.BUY,
                status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                tokens_remaining__gt=0,
                expires_at__gt=timezone.now()
            ).exclude(
                seller=order.buyer  # Don't match user's own listings
            )
            
            # Filter by acceptable price for limit orders
            if order.order_type == OrderType.LIMIT:
                listings = listings.filter(price_per_token__gte=order.price_per_token)
            
            # Order by priority: best price first, then priority score, then time
            listings = listings.order_by(
                '-price_per_token',
                '-priority_score',
                'created_at'
            )
        
        return list(listings)
    
    def _execute_trade(self, order: TradeOrder, listing: MarketListing) -> Dict:
        """Execute a trade between an order and a listing."""
        try:
            # Calculate trade parameters
            tokens_to_trade = min(order.tokens_remaining, listing.tokens_remaining)
            trade_price = listing.price_per_token
            trade_amount = trade_price * Decimal(tokens_to_trade)
            
            # Check minimum order size
            if tokens_to_trade < listing.minimum_order_size:
                return {'success': False, 'error': 'Below minimum order size'}
            
            # Create trade transaction
            transaction_obj = TradeTransaction.objects.create(
                listing=listing,
                order=order,
                buyer=order.buyer,
                seller=listing.seller,
                property=listing.property,
                tokens_traded=tokens_to_trade,
                price_per_token=trade_price,
                total_amount=trade_amount,
                status=TransactionStatus.PROCESSING,
                payment_method={'type': 'marketplace_trade'},
                market_cap_at_trade=self._calculate_market_cap(listing.property),
                volume_24h=self._get_24h_volume(listing.property)
            )
            
            # Update listing tokens remaining
            listing.fill_order(tokens_to_trade)
            
            # Create escrow account for secure settlement
            escrow = EscrowAccount.objects.create(
                transaction=transaction_obj,
                amount_held=transaction_obj.total_cost_to_buyer,
                tokens_held=tokens_to_trade,
                timeout_duration=timedelta(hours=24)
            )
            
            # Update transaction status
            transaction_obj.status = TransactionStatus.IN_ESCROW
            transaction_obj.processed_at = timezone.now()
            transaction_obj.save()
            
            return {
                'success': True,
                'transaction': transaction_obj,
                'tokens_traded': tokens_to_trade,
                'amount_paid': trade_amount,
                'fees_paid': transaction_obj.platform_fee,
                'escrow': escrow
            }
            
        except Exception as e:
            logger.error(f"Trade execution failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _calculate_market_cap(self, property_obj: Property) -> Decimal:
        """Calculate current market cap of a property based on latest trades."""
        latest_trade = TradeTransaction.objects.filter(
            property=property_obj,
            status=TransactionStatus.COMPLETED
        ).order_by('-completed_at').first()
        
        if latest_trade:
            return latest_trade.price_per_token * Decimal(property_obj.total_tokens)
        else:
            return property_obj.token_price * Decimal(property_obj.total_tokens)
    
    def _get_24h_volume(self, property_obj: Property) -> Decimal:
        """Get 24-hour trading volume for a property."""
        since = timezone.now() - timedelta(hours=24)
        volume = TradeTransaction.objects.filter(
            property=property_obj,
            status=TransactionStatus.COMPLETED,
            completed_at__gte=since
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        return volume


class TradingFeesCalculator:
    """
    Trading fees calculation service for marketplace transactions.
    
    Handles fee calculations based on user tiers, trading volumes,
    and special promotions.
    """
    
    def __init__(self):
        self.base_fee_rate = Decimal('0.025')  # 2.5% base fee
        self.maker_discount = Decimal('0.005')  # 0.5% discount for makers
        self.volume_tiers = [
            (Decimal('10000'), Decimal('0.020')),   # $10k+ volume: 2.0%
            (Decimal('50000'), Decimal('0.015')),   # $50k+ volume: 1.5%
            (Decimal('100000'), Decimal('0.010')),  # $100k+ volume: 1.0%
            (Decimal('500000'), Decimal('0.005')),  # $500k+ volume: 0.5%
        ]
    
    def calculate_fees(self, user: User, amount: Decimal, is_maker: bool = False) -> Dict:
        """
        Calculate trading fees for a user and transaction amount.
        
        Args:
            user: User making the trade
            amount: Transaction amount
            is_maker: Whether user is a maker (providing liquidity)
            
        Returns:
            Dict with fee breakdown
        """
        # Get user's 30-day trading volume
        user_volume = self._get_user_volume(user, days=30)
        
        # Determine fee rate based on volume tier
        fee_rate = self.base_fee_rate
        for volume_threshold, tier_rate in self.volume_tiers:
            if user_volume >= volume_threshold:
                fee_rate = tier_rate
        
        # Apply maker discount
        if is_maker:
            fee_rate = max(fee_rate - self.maker_discount, Decimal('0.000'))
        
        # Calculate fee amount
        fee_amount = (amount * fee_rate).quantize(Decimal('0.01'))
        
        return {
            'fee_rate': fee_rate,
            'fee_amount': fee_amount,
            'user_volume_30d': user_volume,
            'volume_tier': self._get_volume_tier_name(user_volume),
            'is_maker': is_maker,
            'maker_discount_applied': is_maker and self.maker_discount > 0
        }
    
    def _get_user_volume(self, user: User, days: int = 30) -> Decimal:
        """Get user's trading volume for the specified period."""
        since = timezone.now() - timedelta(days=days)
        
        # Sum volume from both buy and sell transactions
        buy_volume = TradeTransaction.objects.filter(
            buyer=user,
            status=TransactionStatus.COMPLETED,
            completed_at__gte=since
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        sell_volume = TradeTransaction.objects.filter(
            seller=user,
            status=TransactionStatus.COMPLETED,
            completed_at__gte=since
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        return buy_volume + sell_volume
    
    def _get_volume_tier_name(self, volume: Decimal) -> str:
        """Get descriptive name for volume tier."""
        for threshold, _ in reversed(self.volume_tiers):
            if volume >= threshold:
                return f"Tier {len([t for t in self.volume_tiers if volume >= t[0]])}"
        return "Base Tier"


class MarketAnalyticsService:
    """
    Market analytics service for generating trading statistics and insights.
    
    Provides comprehensive analytics for properties, trading pairs,
    and overall market performance.
    """
    
    def generate_analytics(self, property_obj: Property = None, timeframe: str = '24h') -> Dict:
        """
        Generate market analytics for a property or overall market.
        
        Args:
            property_obj: Specific property to analyze (None for overall market)
            timeframe: Time period for analytics (1h, 24h, 7d, 30d, etc.)
            
        Returns:
            Dict with comprehensive analytics data
        """
        try:
            # Determine time range
            period_start, period_end = self._get_time_range(timeframe)
            
            # Base transaction query
            transactions_query = TradeTransaction.objects.filter(
                status=TransactionStatus.COMPLETED,
                completed_at__range=(period_start, period_end)
            )
            
            if property_obj:
                transactions_query = transactions_query.filter(property=property_obj)
            
            # Calculate volume metrics
            volume_data = transactions_query.aggregate(
                volume_usd=Sum('total_amount'),
                volume_tokens=Sum('tokens_traded'),
                trade_count=Count('id'),
                unique_traders=Count('buyer', distinct=True) + Count('seller', distinct=True)
            )
            
            # Calculate price metrics
            price_data = transactions_query.aggregate(
                high_price=Max('price_per_token'),
                low_price=Min('price_per_token'),
                avg_price=Avg('price_per_token'),
                first_price=models.Min('price_per_token', 
                                     filter=Q(completed_at=transactions_query.earliest('completed_at').completed_at)
                                     if transactions_query.exists() else None),
                last_price=models.Max('price_per_token',
                                    filter=Q(completed_at=transactions_query.latest('completed_at').completed_at)
                                    if transactions_query.exists() else None)
            )
            
            # Market depth and liquidity
            listings_data = self._get_market_depth(property_obj)
            
            # Platform revenue
            platform_revenue = transactions_query.aggregate(
                revenue=Sum('platform_fee')
            )['revenue'] or Decimal('0.00')
            
            # Combine all analytics
            analytics = {
                'timeframe': timeframe,
                'period_start': period_start,
                'period_end': period_end,
                'volume_metrics': {
                    'volume_usd': volume_data['volume_usd'] or Decimal('0.00'),
                    'volume_tokens': volume_data['volume_tokens'] or 0,
                    'trade_count': volume_data['trade_count'] or 0,
                    'unique_traders': volume_data['unique_traders'] or 0,
                },
                'price_metrics': {
                    'opening_price': price_data['first_price'],
                    'closing_price': price_data['last_price'],
                    'high_price': price_data['high_price'],
                    'low_price': price_data['low_price'],
                    'average_price': price_data['avg_price'],
                },
                'market_depth': listings_data,
                'platform_revenue': platform_revenue,
                'property': property_obj.id if property_obj else None
            }
            
            # Store analytics record
            self._store_analytics_record(analytics, property_obj, timeframe)
            
            return analytics
            
        except Exception as e:
            logger.error(f"Analytics generation failed: {str(e)}")
            return {}
    
    def _get_time_range(self, timeframe: str) -> Tuple[timezone.datetime, timezone.datetime]:
        """Convert timeframe string to datetime range."""
        now = timezone.now()
        
        if timeframe == '1h':
            start = now - timedelta(hours=1)
        elif timeframe == '24h':
            start = now - timedelta(hours=24)
        elif timeframe == '7d':
            start = now - timedelta(days=7)
        elif timeframe == '30d':
            start = now - timedelta(days=30)
        elif timeframe == '90d':
            start = now - timedelta(days=90)
        elif timeframe == '1y':
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(hours=24)  # Default to 24h
        
        return start, now
    
    def _get_market_depth(self, property_obj: Property = None) -> Dict:
        """Calculate market depth and liquidity metrics."""
        listings_query = MarketListing.objects.filter(
            status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
            expires_at__gt=timezone.now(),
            tokens_remaining__gt=0
        )
        
        if property_obj:
            listings_query = listings_query.filter(property=property_obj)
        
        # Separate buy and sell orders
        sell_orders = listings_query.filter(listing_type=ListingType.SELL)
        buy_orders = listings_query.filter(listing_type=ListingType.BUY)
        
        # Calculate metrics
        depth_data = {
            'active_listings_count': listings_query.count(),
            'total_tokens_for_sale': sell_orders.aggregate(
                total=Sum('tokens_remaining')
            )['total'] or 0,
            'total_tokens_wanted': buy_orders.aggregate(
                total=Sum('tokens_remaining')
            )['total'] or 0,
            'new_listings_count': listings_query.filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).count(),
        }
        
        # Calculate bid-ask spread
        if sell_orders.exists() and buy_orders.exists():
            best_ask = sell_orders.order_by('price_per_token').first().price_per_token
            best_bid = buy_orders.order_by('-price_per_token').first().price_per_token
            depth_data['bid_ask_spread'] = best_ask - best_bid
        else:
            depth_data['bid_ask_spread'] = None
        
        return depth_data
    
    def _store_analytics_record(self, analytics: Dict, property_obj: Property, timeframe: str):
        """Store analytics data in the database."""
        try:
            MarketAnalytics.objects.update_or_create(
                property=property_obj,
                timeframe=timeframe,
                period_start=analytics['period_start'],
                defaults={
                    'period_end': analytics['period_end'],
                    'volume_tokens': analytics['volume_metrics']['volume_tokens'],
                    'volume_usd': analytics['volume_metrics']['volume_usd'],
                    'trade_count': analytics['volume_metrics']['trade_count'],
                    'unique_traders': analytics['volume_metrics']['unique_traders'],
                    'opening_price': analytics['price_metrics']['opening_price'],
                    'closing_price': analytics['price_metrics']['closing_price'],
                    'high_price': analytics['price_metrics']['high_price'],
                    'low_price': analytics['price_metrics']['low_price'],
                    'average_price': analytics['price_metrics']['average_price'],
                    'active_listings_count': analytics['market_depth']['active_listings_count'],
                    'total_tokens_for_sale': analytics['market_depth']['total_tokens_for_sale'],
                    'total_tokens_wanted': analytics['market_depth']['total_tokens_wanted'],
                    'bid_ask_spread': analytics['market_depth']['bid_ask_spread'],
                    'new_listings_count': analytics['market_depth']['new_listings_count'],
                    'platform_revenue': analytics['platform_revenue'],
                }
            )
        except Exception as e:
            logger.warning(f"Failed to store analytics record: {str(e)}")


class MarketDataService:
    """
    Market data service for real-time market information and order books.
    
    Provides order book data, recent trades, and market statistics
    for frontend trading interfaces.
    """
    
    def get_order_book(self, property_obj: Property, depth: int = 10) -> Dict:
        """
        Get order book data for a property.
        
        Args:
            property_obj: Property to get order book for
            depth: Number of price levels to include
            
        Returns:
            Dict with order book data
        """
        try:
            # Get active sell orders (asks) - lowest price first
            asks = MarketListing.objects.filter(
                property=property_obj,
                listing_type=ListingType.SELL,
                status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                tokens_remaining__gt=0,
                expires_at__gt=timezone.now()
            ).order_by('price_per_token')[:depth]
            
            # Get active buy orders (bids) - highest price first
            bids = MarketListing.objects.filter(
                property=property_obj,
                listing_type=ListingType.BUY,
                status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                tokens_remaining__gt=0,
                expires_at__gt=timezone.now()
            ).order_by('-price_per_token')[:depth]
            
            # Calculate spread and mid price
            spread = None
            mid_price = None
            if asks.exists() and bids.exists():
                best_ask = asks.first().price_per_token
                best_bid = bids.first().price_per_token
                spread = best_ask - best_bid
                mid_price = (best_ask + best_bid) / 2
            
            # Get last trade price
            last_trade = TradeTransaction.objects.filter(
                property=property_obj,
                status=TransactionStatus.COMPLETED
            ).order_by('-completed_at').first()
            
            last_trade_price = last_trade.price_per_token if last_trade else None
            
            return {
                'property_id': property_obj.id,
                'property_title': property_obj.title,
                'bids': list(bids),
                'asks': list(asks),
                'spread': spread,
                'mid_price': mid_price,
                'last_trade_price': last_trade_price,
                'timestamp': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"Order book generation failed: {str(e)}")
            return {}
    
    def get_trading_history(self, property_obj: Property, timeframe: str = '24h', limit: int = 100) -> Dict:
        """
        Get trading history for a property.
        
        Args:
            property_obj: Property to get history for
            timeframe: Time period for history
            limit: Maximum number of trades to return
            
        Returns:
            Dict with trading history data
        """
        try:
            # Get time range
            period_start, period_end = MarketAnalyticsService()._get_time_range(timeframe)
            
            # Get recent trades
            recent_trades = TradeTransaction.objects.filter(
                property=property_obj,
                status=TransactionStatus.COMPLETED,
                completed_at__range=(period_start, period_end)
            ).order_by('-completed_at')[:limit]
            
            # Generate price/volume data for charting
            price_data = []
            volume_data = []
            
            # Group trades by time intervals for charting
            interval_minutes = self._get_interval_minutes(timeframe)
            current_time = period_start
            
            while current_time < period_end:
                interval_end = current_time + timedelta(minutes=interval_minutes)
                
                interval_trades = recent_trades.filter(
                    completed_at__range=(current_time, interval_end)
                )
                
                if interval_trades.exists():
                    interval_data = interval_trades.aggregate(
                        open_price=models.Min('price_per_token', filter=Q(
                            completed_at=interval_trades.earliest('completed_at').completed_at
                        )),
                        close_price=models.Max('price_per_token', filter=Q(
                            completed_at=interval_trades.latest('completed_at').completed_at
                        )),
                        high_price=Max('price_per_token'),
                        low_price=Min('price_per_token'),
                        volume=Sum('total_amount')
                    )
                    
                    price_data.append({
                        'timestamp': current_time.isoformat(),
                        'open': interval_data['open_price'],
                        'high': interval_data['high_price'],
                        'low': interval_data['low_price'],
                        'close': interval_data['close_price']
                    })
                    
                    volume_data.append({
                        'timestamp': current_time.isoformat(),
                        'volume': interval_data['volume']
                    })
                
                current_time = interval_end
            
            return {
                'property_id': property_obj.id,
                'property_title': property_obj.title,
                'timeframe': timeframe,
                'price_data': price_data,
                'volume_data': volume_data,
                'recent_trades': list(recent_trades),
                'total_trades': recent_trades.count()
            }
            
        except Exception as e:
            logger.error(f"Trading history generation failed: {str(e)}")
            return {}
    
    def _get_interval_minutes(self, timeframe: str) -> int:
        """Get appropriate interval minutes for charting based on timeframe."""
        intervals = {
            '1h': 5,    # 5-minute intervals
            '24h': 60,  # 1-hour intervals
            '7d': 240,  # 4-hour intervals
            '30d': 1440,  # 1-day intervals
            '90d': 1440,  # 1-day intervals
            '1y': 10080,  # 1-week intervals
        }
        return intervals.get(timeframe, 60)  # Default to 1-hour intervals