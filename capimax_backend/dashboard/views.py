"""
Dashboard Views for Capimax Real Estate Tokenization Platform.

This module contains views for dashboard functionality including user statistics,
portfolio summaries, and real-time market data.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q, F, Max
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from accounts.models import User
from properties.models import Property, PropertyAnalytics
from investments.models import Investment, DividendPayment
from .serializers import DashboardStatsSerializer


class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics overview.
    
    Returns comprehensive statistics about user's portfolio,
    performance metrics, and investment activity.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dashboard statistics for the authenticated user."""
        user = request.user
        
        # Get user's investments
        user_investments = Investment.objects.filter(
            user=user, 
            status='completed'
        ).select_related('property_investment')
        
        if not user_investments.exists():
            # Return default stats for new users
            stats_data = {
                'total_invested': Decimal('0.00'),
                'current_portfolio_value': Decimal('0.00'),
                'total_roi': Decimal('0.00'),
                'roi_percentage': Decimal('0.00'),
                'monthly_dividends': Decimal('0.00'),
                'monthly_income_change': Decimal('0.00'),
                'properties_count': 0,
                'property_types': [],
                'average_investment_size': Decimal('0.00'),
                'ytd_return': Decimal('0.00'),
                'ytd_return_percentage': Decimal('0.00'),
                'best_performing_property': 'None',
                'worst_performing_property': 'None',
                'pending_investments': 0,
                'completed_investments_this_month': 0,
                'watchlist_count': 0,
            }
        else:
            # Calculate portfolio statistics
            total_invested = user_investments.aggregate(
                total=Sum('investment_amount')
            )['total'] or Decimal('0.00')
            
            # Calculate current portfolio value
            current_value = Decimal('0.00')
            for investment in user_investments:
                current_value += investment.current_value
            
            # Calculate ROI
            total_roi = current_value - total_invested
            roi_percentage = (total_roi / total_invested * 100) if total_invested > 0 else Decimal('0.00')
            
            # Calculate monthly dividends
            this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_month = (this_month - timedelta(days=1)).replace(day=1)
            
            monthly_dividends = DividendPayment.objects.filter(
                investment__user=user,
                payment_date__gte=this_month,
                status='paid'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            last_month_dividends = DividendPayment.objects.filter(
                investment__user=user,
                payment_date__gte=last_month,
                payment_date__lt=this_month,
                status='paid'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            monthly_income_change = Decimal('0.00')
            if last_month_dividends > 0:
                monthly_income_change = ((monthly_dividends - last_month_dividends) / last_month_dividends * 100)
            
            # Portfolio diversity
            properties_count = user_investments.values('property_investment').distinct().count()
            property_types = list(user_investments.values_list(
                'property_investment__property_type', flat=True
            ).distinct())
            
            average_investment_size = total_invested / user_investments.count() if user_investments.count() > 0 else Decimal('0.00')
            
            # YTD performance
            ytd_start = timezone.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            ytd_investments = user_investments.filter(created_at__gte=ytd_start)
            ytd_invested = ytd_investments.aggregate(total=Sum('investment_amount'))['total'] or Decimal('0.00')
            
            ytd_current_value = Decimal('0.00')
            for investment in ytd_investments:
                ytd_current_value += investment.current_value
            
            ytd_return = ytd_current_value - ytd_invested
            ytd_return_percentage = (ytd_return / ytd_invested * 100) if ytd_invested > 0 else Decimal('0.00')
            
            # Best and worst performing properties
            property_performance = {}
            for investment in user_investments:
                prop_roi = investment.current_value - investment.investment_amount
                prop_roi_pct = (prop_roi / investment.investment_amount * 100) if investment.investment_amount > 0 else Decimal('0.00')
                
                if investment.property_investment.title not in property_performance:
                    property_performance[investment.property_investment.title] = prop_roi_pct
            
            if property_performance:
                best_performing_property = max(property_performance, key=property_performance.get)
                worst_performing_property = min(property_performance, key=property_performance.get)
            else:
                best_performing_property = 'None'
                worst_performing_property = 'None'
            
            # Investment activity
            pending_investments = Investment.objects.filter(
                user=user,
                status__in=['pending', 'processing']
            ).count()
            
            completed_investments_this_month = Investment.objects.filter(
                user=user,
                status='completed',
                completed_at__gte=this_month
            ).count()
            
            # Watchlist count (using property subscriptions as proxy)
            from properties.models import PropertySubscription
            watchlist_count = PropertySubscription.objects.filter(user=user).count()
            
            stats_data = {
                'total_invested': total_invested,
                'current_portfolio_value': current_value,
                'total_roi': total_roi,
                'roi_percentage': roi_percentage,
                'monthly_dividends': monthly_dividends,
                'monthly_income_change': monthly_income_change,
                'properties_count': properties_count,
                'property_types': property_types,
                'average_investment_size': average_investment_size,
                'ytd_return': ytd_return,
                'ytd_return_percentage': ytd_return_percentage,
                'best_performing_property': best_performing_property,
                'worst_performing_property': worst_performing_property,
                'pending_investments': pending_investments,
                'completed_investments_this_month': completed_investments_this_month,
                'watchlist_count': watchlist_count,
            }
        
        serializer = DashboardStatsSerializer(stats_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
