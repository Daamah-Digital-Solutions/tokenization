"""
Serializers for Dashboard API endpoints.

This module contains serializers for all dashboard-related data structures
including statistics, portfolio summaries, market insights, and analytics.
"""

from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics overview."""
    
    # Portfolio Summary
    total_invested = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_portfolio_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_roi = serializers.DecimalField(max_digits=8, decimal_places=2)
    roi_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Monthly Income
    monthly_dividends = serializers.DecimalField(max_digits=10, decimal_places=2)
    monthly_income_change = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Portfolio Diversity
    properties_count = serializers.IntegerField()
    property_types = serializers.ListField(child=serializers.CharField())
    average_investment_size = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Performance Metrics
    ytd_return = serializers.DecimalField(max_digits=8, decimal_places=2)
    ytd_return_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    best_performing_property = serializers.CharField()
    worst_performing_property = serializers.CharField()
    
    # Investment Activity
    pending_investments = serializers.IntegerField()
    completed_investments_this_month = serializers.IntegerField()
    watchlist_count = serializers.IntegerField()


class PortfolioPropertySerializer(serializers.Serializer):
    """Serializer for property information in portfolio."""
    
    id = serializers.UUIDField()
    title = serializers.CharField()
    property_type = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField()
    image_url = serializers.URLField(allow_null=True)
    
    # Investment Details
    tokens_owned = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    ownership_percentage = serializers.DecimalField(max_digits=8, decimal_places=4)
    investment_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Performance
    roi = serializers.DecimalField(max_digits=8, decimal_places=2)
    roi_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    dividends_received = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Property Status
    funding_status = serializers.CharField()
    funding_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    expected_return = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)


class PortfolioDataSerializer(serializers.Serializer):
    """Serializer for complete portfolio data."""
    
    # Summary Statistics
    total_invested = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_roi = serializers.DecimalField(max_digits=8, decimal_places=2)
    roi_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Diversification
    properties_count = serializers.IntegerField()
    property_types_distribution = serializers.DictField()
    geographical_distribution = serializers.DictField()
    
    # Performance Timeline
    performance_chart_data = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Properties
    properties = PortfolioPropertySerializer(many=True)
    
    # Recent Activity
    recent_dividends = serializers.ListField(
        child=serializers.DictField()
    )
    pending_investments = serializers.IntegerField()


class TransactionSerializer(serializers.Serializer):
    """Serializer for transaction records."""
    
    id = serializers.UUIDField()
    type = serializers.CharField()  # 'investment', 'dividend', 'withdrawal'
    property_title = serializers.CharField(allow_null=True)
    property_id = serializers.UUIDField(allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default='USD')
    status = serializers.CharField()
    date = serializers.DateTimeField()
    description = serializers.CharField()
    
    # Investment specific
    token_amount = serializers.IntegerField(allow_null=True)
    token_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    
    # Transaction details
    transaction_hash = serializers.CharField(allow_null=True)
    blockchain_confirmed = serializers.BooleanField(default=False)


class TransactionListSerializer(serializers.Serializer):
    """Serializer for paginated transaction list."""
    
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = TransactionSerializer(many=True)


class PropertyAnalyticsSerializer(serializers.Serializer):
    """Serializer for property-specific analytics."""
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    
    # Performance Metrics
    total_invested = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    appreciation = serializers.DecimalField(max_digits=8, decimal_places=2)
    appreciation_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Investment Stats
    total_investors = serializers.IntegerField()
    total_tokens_sold = serializers.IntegerField()
    funding_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_investment_size = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Dividend History
    total_dividends_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    dividend_yield = serializers.DecimalField(max_digits=5, decimal_places=2)
    last_dividend_date = serializers.DateTimeField(allow_null=True)
    next_dividend_date = serializers.DateTimeField(allow_null=True)
    
    # Performance Chart Data
    performance_timeline = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Market Comparison
    market_comparison = serializers.DictField()


class TrendingPropertySerializer(serializers.Serializer):
    """Serializer for trending property information."""
    
    id = serializers.UUIDField()
    title = serializers.CharField()
    property_type = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField()
    image_url = serializers.URLField(allow_null=True)
    
    # Investment Details
    token_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    funding_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    expected_return = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    
    # Trending Metrics
    view_count_24h = serializers.IntegerField()
    investment_count_24h = serializers.IntegerField()
    trending_score = serializers.DecimalField(max_digits=5, decimal_places=2)


class MarketInsightsSerializer(serializers.Serializer):
    """Serializer for market insights and trends."""
    
    # Market Overview
    total_properties = serializers.IntegerField()
    total_market_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_investors = serializers.IntegerField()
    average_roi = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Trending Properties
    trending_properties = TrendingPropertySerializer(many=True)
    
    # Market Performance
    market_performance_30d = serializers.DecimalField(max_digits=5, decimal_places=2)
    top_performing_cities = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Investment Opportunities
    new_listings = serializers.IntegerField()
    fully_funded_properties = serializers.IntegerField()
    
    # Market News (simplified)
    market_alerts = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Price Alerts
    price_alerts = serializers.ListField(
        child=serializers.DictField()
    )


class CollaborativeInvestmentSerializer(serializers.Serializer):
    """Serializer for collaborative investment opportunities."""
    
    id = serializers.UUIDField()
    title = serializers.CharField()
    description = serializers.CharField()
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    
    # Investment Details
    target_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    minimum_contribution = serializers.DecimalField(max_digits=10, decimal_places=2)
    participants_count = serializers.IntegerField()
    max_participants = serializers.IntegerField()
    
    # Timeline
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    
    # Benefits
    expected_return = serializers.DecimalField(max_digits=5, decimal_places=2)
    special_benefits = serializers.ListField(
        child=serializers.CharField()
    )
    
    # Status
    status = serializers.CharField()
    funding_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class InvestorProfileSerializer(serializers.Serializer):
    """Serializer for investor profile data."""
    
    # Basic Info
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    country = serializers.CharField()
    member_since = serializers.DateTimeField()
    
    # Investment Summary
    total_invested = serializers.DecimalField(max_digits=12, decimal_places=2)
    portfolio_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_properties = serializers.IntegerField()
    total_roi = serializers.DecimalField(max_digits=8, decimal_places=2)
    
    # Preferences
    investment_preferences = serializers.DictField()
    risk_tolerance = serializers.CharField()
    preferred_property_types = serializers.ListField(
        child=serializers.CharField()
    )
    
    # Achievements/Badges
    investor_level = serializers.CharField()
    achievements = serializers.ListField(
        child=serializers.DictField()
    )
    
    # Account Status
    kyc_status = serializers.CharField()
    account_status = serializers.CharField()
    last_login = serializers.DateTimeField(allow_null=True)