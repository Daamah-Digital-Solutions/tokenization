"""
Investment Services for Capimax Real Estate Tokenization Platform.

This module contains service classes that handle investment business logic,
portfolio calculations, dividend distributions, and automatic investments.
"""

from django.db import transaction
from django.db.models import Sum, Avg, F, Q, Count, Max
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta, datetime
from typing import Dict, List, Optional, Tuple
import logging

from .models import (
    Investment, InstallmentPayment, TokenReservation,
    InvestmentWithdrawal, AutoInvestment, DividendPayment,
    InvestmentStatus
)
from properties.models import Property
from accounts.models import User
from payments.models import Payment, WalletBalance
from core.exceptions import InvestmentError
from core.services.email_service import EmailService

logger = logging.getLogger(__name__)


# Investment limits by KYC verification level
INVESTMENT_LIMITS = {
    'basic': {'daily': Decimal('1000'), 'monthly': Decimal('5000')},
    'enhanced': {'daily': Decimal('5000'), 'monthly': Decimal('25000')},
    'premium': {'daily': Decimal('25000'), 'monthly': Decimal('100000')},
}


class InvestmentCalculationService:
    """Service for calculating investment details and fees."""
    
    PLATFORM_FEE_RATE = Decimal('0.005')  # 0.5% platform fee
    PROCESSING_FEES = {
        'credit_card': Decimal('0.029'),  # 2.9%
        'bank_transfer': Decimal('0.01'),  # 1%
        'cryptocurrency': Decimal('0.015'),  # 1.5%
        'paypal': Decimal('0.034'),  # 3.4%
    }
    
    @classmethod
    def calculate_investment_details(
        cls,
        property_id: str,
        token_amount: int,
        payment_method: str = 'credit_card'
    ) -> Dict:
        """Calculate comprehensive investment details."""
        try:
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            raise InvestmentError("Property not found")
        
        # Basic calculations
        base_amount = property_obj.token_price * token_amount
        platform_fee = base_amount * cls.PLATFORM_FEE_RATE
        processing_fee = base_amount * cls.PROCESSING_FEES.get(payment_method, Decimal('0.029'))
        total_amount = base_amount + platform_fee + processing_fee
        
        # Ownership calculations
        ownership_percentage = (Decimal(token_amount) / Decimal(property_obj.total_tokens)) * 100
        
        # Estimated returns
        monthly_dividend = Decimal('0')
        if property_obj.rental_yield:
            annual_dividend = base_amount * (property_obj.rental_yield / 100)
            monthly_dividend = annual_dividend / 12
        
        # Available tokens check
        available_tokens = property_obj.total_tokens - property_obj.tokens_sold
        reserved_tokens = TokenReservation.objects.filter(
            property_investment=property_obj,
            released=False,
            expires_at__gt=timezone.now()
        ).aggregate(total=Sum('token_amount'))['total'] or 0
        
        available_tokens -= reserved_tokens
        
        return {
            'property': {
                'id': str(property_obj.id),
                'title': property_obj.title,
                'token_price': property_obj.token_price,
                'total_tokens': property_obj.total_tokens,
                'available_tokens': available_tokens,
                'rental_yield': property_obj.rental_yield or 0,
            },
            'investment': {
                'token_amount': token_amount,
                'base_amount': base_amount,
                'platform_fee': platform_fee,
                'processing_fee': processing_fee,
                'total_amount': total_amount,
                'ownership_percentage': ownership_percentage.quantize(Decimal('0.0001')),
                'estimated_monthly_dividend': monthly_dividend.quantize(Decimal('0.01')),
                'estimated_annual_dividend': (monthly_dividend * 12).quantize(Decimal('0.01')),
            },
            'payment_method': payment_method,
            'can_invest': available_tokens >= token_amount,
            'validation_errors': [] if available_tokens >= token_amount else [
                f"Only {available_tokens} tokens available"
            ]
        }
    
    @classmethod
    def calculate_withdrawal_value(cls, investment: Investment, token_amount: int) -> Dict:
        """Calculate withdrawal value for investment tokens."""
        if token_amount > investment.token_amount:
            raise InvestmentError("Cannot withdraw more tokens than owned")
        
        # Get current property value
        property_obj = investment.property_investment
        current_value = property_obj.total_value  # Should use latest valuation
        
        # Calculate proportional value
        ownership_fraction = Decimal(token_amount) / Decimal(property_obj.total_tokens)
        estimated_value = current_value * ownership_fraction
        
        # Calculate fees
        processing_fee = estimated_value * Decimal('0.02')  # 2% withdrawal fee
        net_value = estimated_value - processing_fee
        
        # Estimated processing time
        estimated_completion = timezone.now() + timedelta(days=7)
        
        return {
            'token_amount': token_amount,
            'estimated_value': estimated_value,
            'processing_fee': processing_fee,
            'net_value': net_value,
            'estimated_completion': estimated_completion,
            'processing_time_days': 7
        }


class PortfolioService:
    """Service for portfolio management and analytics."""
    
    @classmethod
    def get_portfolio_summary(cls, user: User) -> Dict:
        """Get comprehensive portfolio summary for user."""
        investments = Investment.objects.filter(
            user=user,
            status=InvestmentStatus.COMPLETED
        ).select_related('property_investment')
        
        if not investments.exists():
            return cls._empty_portfolio_summary()
        
        # Basic aggregations
        total_invested = investments.aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')
        
        # Calculate current values
        current_value = Decimal('0')
        for investment in investments:
            current_value += investment.current_value
        
        # Calculate returns
        total_return = current_value - total_invested
        return_percentage = (total_return / total_invested * 100) if total_invested > 0 else Decimal('0')
        
        # Dividend calculations
        total_dividends = DividendPayment.objects.filter(
            investment__in=investments,
            status='paid'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Investment counts
        active_investments = investments.count()
        properties_count = investments.values('property_investment').distinct().count()
        pending_investments = Investment.objects.filter(
            user=user,
            status__in=[InvestmentStatus.PENDING, InvestmentStatus.PROCESSING]
        ).count()
        
        return {
            'total_invested': total_invested,
            'current_value': current_value,
            'total_return': total_return,
            'return_percentage': return_percentage.quantize(Decimal('0.01')),
            'total_dividends': total_dividends,
            'active_investments': active_investments,
            'properties_count': properties_count,
            'pending_investments': pending_investments
        }
    
    @classmethod
    def get_portfolio_performance(cls, user: User, period_days: int = 30) -> Dict:
        """Get portfolio performance data for specified period."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)
        
        investments = Investment.objects.filter(
            user=user,
            status=InvestmentStatus.COMPLETED,
            completed_at__range=(start_date, end_date)
        )
        
        # Performance metrics
        performance_data = []
        cumulative_invested = Decimal('0')
        cumulative_value = Decimal('0')
        
        for investment in investments.order_by('completed_at'):
            cumulative_invested += investment.investment_amount
            cumulative_value += investment.current_value
            
            performance_data.append({
                'date': investment.completed_at.date(),
                'invested': float(cumulative_invested),
                'value': float(cumulative_value),
                'return': float(cumulative_value - cumulative_invested)
            })
        
        # Dividend performance
        dividends = DividendPayment.objects.filter(
            investment__user=user,
            payment_date__range=(start_date, end_date),
            status='paid'
        ).order_by('payment_date')
        
        dividend_data = []
        cumulative_dividends = Decimal('0')
        
        for dividend in dividends:
            cumulative_dividends += dividend.amount
            dividend_data.append({
                'date': dividend.payment_date.date(),
                'amount': float(dividend.amount),
                'cumulative': float(cumulative_dividends)
            })
        
        return {
            'period_days': period_days,
            'performance_data': performance_data,
            'dividend_data': dividend_data,
            'total_return_period': float(cumulative_value - cumulative_invested),
            'total_dividends_period': float(cumulative_dividends)
        }
    
    @classmethod
    def get_investment_analytics(cls, user: User) -> List[Dict]:
        """Get detailed analytics for each property investment."""
        investments = Investment.objects.filter(
            user=user,
            status=InvestmentStatus.COMPLETED
        ).select_related('property_investment')
        
        analytics = []
        
        for investment in investments:
            # Calculate dividends for this investment
            total_dividends = DividendPayment.objects.filter(
                investment=investment,
                status='paid'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Calculate ROI
            current_value = investment.current_value
            total_return = current_value + total_dividends - investment.investment_amount
            roi_percentage = (total_return / investment.investment_amount * 100) if investment.investment_amount > 0 else Decimal('0')
            
            analytics.append({
                'property_id': str(investment.property_investment.id),
                'property_title': investment.property_investment.title,
                'total_investment': investment.investment_amount,
                'token_count': investment.token_amount,
                'ownership_percentage': investment.ownership_percentage,
                'current_value': current_value,
                'total_dividends': total_dividends,
                'roi_percentage': roi_percentage.quantize(Decimal('0.01')),
                'investment_date': investment.completed_at or investment.created_at
            })
        
        return analytics
    
    @classmethod
    def _empty_portfolio_summary(cls) -> Dict:
        """Return empty portfolio summary for users with no investments."""
        return {
            'total_invested': Decimal('0'),
            'current_value': Decimal('0'),
            'total_return': Decimal('0'),
            'return_percentage': Decimal('0'),
            'total_dividends': Decimal('0'),
            'active_investments': 0,
            'properties_count': 0,
            'pending_investments': 0
        }


class InvestmentProcessingService:
    """Service for processing investment transactions."""
    
    @classmethod
    @transaction.atomic
    def process_investment(cls, investment: Investment, payment: Payment) -> bool:
        """Process completed investment and update token ownership."""
        try:
            property_obj = Property.objects.select_for_update().get(
                id=investment.property_investment.id
            )
            
            # Verify token availability
            available_tokens = property_obj.total_tokens - property_obj.tokens_sold
            if investment.token_amount > available_tokens:
                raise InvestmentError("Insufficient tokens available")
            
            # Update property token count
            property_obj.tokens_sold += investment.token_amount
            property_obj.save(update_fields=['tokens_sold'])
            
            # Complete investment
            investment.complete_investment()

            # Send investment confirmation email
            try:
                investment_details = {
                    'property_name': property_obj.title,
                    'property_location': f"{property_obj.city}, {property_obj.country}",
                    'property_type': property_obj.property_type,
                    'amount': str(investment.investment_amount),
                    'shares': str(investment.token_amount),
                    'share_price': str(property_obj.token_price),
                    'expected_return': f"{property_obj.expected_return}%" if property_obj.expected_return else "N/A",
                    'transaction_id': str(investment.id),
                    'payment_method': payment.payment_method if hasattr(payment, 'payment_method') else 'N/A',
                    'id': investment.id
                }

                EmailService.send_investment_confirmation_email(
                    user=investment.user,
                    investment_details=investment_details
                )
                logger.info(f"Investment confirmation email sent for investment {investment.id}")
            except Exception as e:
                logger.error(f"Failed to send investment confirmation email for investment {investment.id}: {str(e)}")

            # Release any token reservations for this investment
            TokenReservation.objects.filter(
                user=investment.user,
                property_investment=property_obj,
                released=False
            ).update(released=True)
            
            # Create initial dividend record if property has rental yield
            if property_obj.rental_yield and property_obj.rental_yield > 0:
                cls._create_future_dividend_record(investment)
            
            logger.info(f"Investment {investment.id} processed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to process investment {investment.id}: {str(e)}")
            investment.status = InvestmentStatus.FAILED
            investment.save(update_fields=['status'])
            raise InvestmentError(f"Investment processing failed: {str(e)}")
    
    @classmethod
    def _create_future_dividend_record(cls, investment: Investment):
        """Create future dividend payment record."""
        # Calculate next dividend payment (monthly)
        next_payment_date = timezone.now().replace(day=1) + timedelta(days=32)
        next_payment_date = next_payment_date.replace(day=1)  # First of next month
        
        # Calculate dividend amount
        monthly_yield = investment.property_investment.rental_yield / 12 / 100
        dividend_amount = investment.investment_amount * monthly_yield
        
        DividendPayment.objects.create(
            investment=investment,
            amount=dividend_amount.quantize(Decimal('0.01')),
            payment_date=next_payment_date,
            period_start=timezone.now().replace(day=1),
            period_end=next_payment_date - timedelta(days=1),
            status='pending'
        )


class AutoInvestmentService:
    """Service for managing automatic investments."""
    
    @classmethod
    def process_due_auto_investments(cls) -> List[Dict]:
        """Process all auto investments that are due."""
        due_investments = AutoInvestment.objects.filter(
            status='active',
            next_execution__lte=timezone.now()
        ).select_related('user', 'property_investment')
        
        results = []
        
        for auto_investment in due_investments:
            try:
                result = cls._process_single_auto_investment(auto_investment)
                results.append(result)
            except Exception as e:
                logger.error(f"Auto investment {auto_investment.id} failed: {str(e)}")
                results.append({
                    'auto_investment_id': str(auto_investment.id),
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    @classmethod
    @transaction.atomic
    def _process_single_auto_investment(cls, auto_investment: AutoInvestment) -> Dict:
        """Process a single auto investment."""
        # Check if we've reached max total amount
        if (auto_investment.max_total_amount and 
            auto_investment.total_invested + auto_investment.amount > auto_investment.max_total_amount):
            auto_investment.status = 'cancelled'
            auto_investment.save(update_fields=['status'])
            return {
                'auto_investment_id': str(auto_investment.id),
                'success': False,
                'error': 'Maximum total amount reached'
            }
        
        # Check if end date has passed
        if auto_investment.end_date and timezone.now() > auto_investment.end_date:
            auto_investment.status = 'cancelled'
            auto_investment.save(update_fields=['status'])
            return {
                'auto_investment_id': str(auto_investment.id),
                'success': False,
                'error': 'End date reached'
            }
        
        # Calculate token amount
        property_obj = auto_investment.property_investment
        token_amount = int(auto_investment.amount / property_obj.token_price)
        
        if token_amount == 0:
            return {
                'auto_investment_id': str(auto_investment.id),
                'success': False,
                'error': 'Amount too small for one token'
            }
        
        # Check token availability
        available_tokens = property_obj.total_tokens - property_obj.tokens_sold
        if token_amount > available_tokens:
            # Pause auto investment if tokens not available
            auto_investment.status = 'paused'
            auto_investment.save(update_fields=['status'])
            return {
                'auto_investment_id': str(auto_investment.id),
                'success': False,
                'error': 'Insufficient tokens available'
            }
        
        # Create investment
        investment = Investment.objects.create(
            user=auto_investment.user,
            property_investment=property_obj,
            token_amount=token_amount,
            investment_amount=property_obj.token_price * token_amount,
            payment_method=auto_investment.payment_method,
            status=InvestmentStatus.PENDING
        )
        
        # Update auto investment
        auto_investment.total_invested += investment.investment_amount
        auto_investment.next_execution = cls._calculate_next_execution(auto_investment)
        auto_investment.save(update_fields=['total_invested', 'next_execution'])
        
        return {
            'auto_investment_id': str(auto_investment.id),
            'investment_id': str(investment.id),
            'success': True,
            'amount': float(investment.investment_amount),
            'tokens': token_amount
        }
    
    @classmethod
    def _calculate_next_execution(cls, auto_investment: AutoInvestment) -> datetime:
        """Calculate next execution date based on frequency."""
        current_date = auto_investment.next_execution
        
        if auto_investment.frequency == 'weekly':
            return current_date + timedelta(weeks=1)
        elif auto_investment.frequency == 'monthly':
            # Add one month
            if current_date.month == 12:
                return current_date.replace(year=current_date.year + 1, month=1)
            else:
                return current_date.replace(month=current_date.month + 1)
        elif auto_investment.frequency == 'quarterly':
            # Add three months
            new_month = current_date.month + 3
            new_year = current_date.year
            while new_month > 12:
                new_month -= 12
                new_year += 1
            return current_date.replace(year=new_year, month=new_month)
        
        return current_date + timedelta(days=30)  # Default fallback


class DividendDistributionService:
    """Service for calculating and distributing dividends."""
    
    @classmethod
    def calculate_pending_dividends(cls) -> List[Dict]:
        """Calculate all pending dividend payments."""
        pending_dividends = DividendPayment.objects.filter(
            status='pending',
            payment_date__lte=timezone.now()
        ).select_related('investment', 'investment__user', 'investment__property_investment')
        
        results = []
        
        for dividend in pending_dividends:
            try:
                # Recalculate dividend amount based on current property income
                property_income = cls._get_property_monthly_income(
                    dividend.investment.property_investment
                )
                
                if property_income > 0:
                    # Calculate proportional dividend
                    ownership_fraction = (
                        Decimal(dividend.investment.token_amount) / 
                        Decimal(dividend.investment.property_investment.total_tokens)
                    )
                    dividend_amount = property_income * ownership_fraction
                    
                    # Update dividend amount
                    dividend.amount = dividend_amount.quantize(Decimal('0.01'))
                    dividend.status = 'paid'
                    dividend.save(update_fields=['amount', 'status'])
                    
                    # Credit user wallet (simplified - would integrate with payment system)
                    cls._credit_user_dividend(dividend.investment.user, dividend_amount)

                    # Send dividend notification email
                    try:
                        dividend_details = {
                            'property_name': dividend.investment.property_investment.title,
                            'property_location': f"{dividend.investment.property_investment.city}, {dividend.investment.property_investment.country}",
                            'amount': str(dividend_amount),
                            'period': f"{dividend.period_start.strftime('%B %Y')}",
                            'ownership_percentage': f"{dividend.investment.ownership_percentage}%",
                            'shares_owned': str(dividend.investment.token_amount),
                            'total_income': str(property_income),
                            'occupancy_rate': '95%',  # This could be dynamic based on property data
                            'annual_yield': f"{dividend.investment.property_investment.rental_yield}%" if dividend.investment.property_investment.rental_yield else "N/A",
                            'property_value': f"${dividend.investment.property_investment.total_value:,.0f}",
                            'initial_investment': str(dividend.investment.investment_amount),
                            'total_dividends': str(DividendPayment.objects.filter(
                                investment=dividend.investment,
                                status='paid'
                            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')),
                            'current_value': str(dividend.investment.current_value),
                            'total_return': f"{((dividend.investment.current_value - dividend.investment.investment_amount) / dividend.investment.investment_amount * 100):+.1f}%",
                            'next_distribution': 'Expected next month'
                        }

                        EmailService.send_dividend_notification_email(
                            user=dividend.investment.user,
                            dividend_details=dividend_details
                        )
                        logger.info(f"Dividend notification email sent for dividend {dividend.id}")
                    except Exception as e:
                        logger.error(f"Failed to send dividend notification email for dividend {dividend.id}: {str(e)}")

                    results.append({
                        'dividend_id': str(dividend.id),
                        'user_email': dividend.investment.user.email,
                        'property_title': dividend.investment.property_investment.title,
                        'amount': float(dividend_amount),
                        'success': True
                    })
                
            except Exception as e:
                logger.error(f"Failed to process dividend {dividend.id}: {str(e)}")
                results.append({
                    'dividend_id': str(dividend.id),
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    @classmethod
    def _get_property_monthly_income(cls, property_obj: Property) -> Decimal:
        """Get monthly income for a property (simplified calculation)."""
        if not property_obj.rental_yield:
            return Decimal('0')
        
        # Calculate monthly income based on property value and rental yield
        annual_income = property_obj.total_value * (property_obj.rental_yield / 100)
        monthly_income = annual_income / 12
        
        return monthly_income
    
    @classmethod
    def _credit_user_dividend(cls, user: User, amount: Decimal):
        """Credit dividend to user's wallet balance."""
        wallet_balance, created = WalletBalance.objects.get_or_create(
            user=user,
            currency='USD',
            defaults={'available_balance': Decimal('0')}
        )
        
        wallet_balance.available_balance += amount
        wallet_balance.save(update_fields=['available_balance'])
        
        # Create wallet transaction record
        from payments.models import WalletTransaction
        WalletTransaction.objects.create(
            user=user,
            transaction_type='dividend',
            amount=amount,
            currency='USD',
            balance_before=wallet_balance.available_balance - amount,
            balance_after=wallet_balance.available_balance,
            description=f'Dividend payment'
        )


class InvestmentRecommendationService:
    """Service for generating investment recommendations."""
    
    @classmethod
    def get_recommendations_for_user(cls, user: User, limit: int = 5) -> List[Dict]:
        """Get personalized investment recommendations for user."""
        # Get user's investment history and preferences
        user_investments = Investment.objects.filter(
            user=user,
            status=InvestmentStatus.COMPLETED
        ).select_related('property_investment')
        
        # Analyze user preferences
        preferences = cls._analyze_user_preferences(user_investments)
        
        # Get available properties
        available_properties = Property.objects.filter(
            status__in=['active', 'tokenized'],
            tokens_sold__lt=F('total_tokens')
        ).annotate(
            available_tokens=F('total_tokens') - F('tokens_sold'),
            investor_count=Count('investments', filter=Q(investments__status=InvestmentStatus.COMPLETED))
        )
        
        recommendations = []
        
        for property_obj in available_properties:
            score = cls._calculate_recommendation_score(property_obj, preferences, user)
            
            if score > 0:
                recommendations.append({
                    'property_id': str(property_obj.id),
                    'property_title': property_obj.title,
                    'recommendation_score': score,
                    'recommendation_reason': cls._get_recommendation_reason(property_obj, preferences),
                    'expected_return': property_obj.expected_return or property_obj.rental_yield or 0,
                    'risk_level': cls._assess_risk_level(property_obj),
                    'available_tokens': property_obj.available_tokens,
                    'token_price': property_obj.token_price
                })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        return recommendations[:limit]
    
    @classmethod
    def _analyze_user_preferences(cls, user_investments) -> Dict:
        """Analyze user investment preferences from history."""
        if not user_investments.exists():
            return {
                'preferred_property_types': [],
                'preferred_price_range': (0, 1000),
                'average_investment': Decimal('1000'),
                'risk_tolerance': 'medium'
            }
        
        property_types = list(user_investments.values_list(
            'property_investment__property_type', flat=True
        ))
        
        avg_investment = user_investments.aggregate(
            avg=Avg('investment_amount')
        )['avg'] or Decimal('1000')
        
        avg_token_price = user_investments.aggregate(
            avg=Avg('property_investment__token_price')
        )['avg'] or Decimal('100')
        
        return {
            'preferred_property_types': property_types,
            'preferred_price_range': (avg_token_price * Decimal('0.5'), avg_token_price * Decimal('1.5')),
            'average_investment': avg_investment,
            'risk_tolerance': 'medium'  # Could be more sophisticated
        }
    
    @classmethod
    def _calculate_recommendation_score(cls, property_obj, preferences, user) -> Decimal:
        """Calculate recommendation score for a property."""
        score = Decimal('50')  # Base score
        
        # Property type preference
        if property_obj.property_type in preferences['preferred_property_types']:
            score += Decimal('20')
        
        # Price range preference
        if (preferences['preferred_price_range'][0] <= property_obj.token_price <= 
            preferences['preferred_price_range'][1]):
            score += Decimal('15')
        
        # Expected return
        if property_obj.expected_return:
            if property_obj.expected_return >= 8:
                score += Decimal('20')
            elif property_obj.expected_return >= 6:
                score += Decimal('10')
        
        # Liquidity (based on investor count and available tokens)
        if hasattr(property_obj, 'investor_count') and property_obj.investor_count > 10:
            score += Decimal('10')
        
        # Diversification (penalize if user already invested in this property)
        if Investment.objects.filter(
            user=user,
            property_investment=property_obj,
            status=InvestmentStatus.COMPLETED
        ).exists():
            score -= Decimal('30')
        
        return max(score, Decimal('0'))
    
    @classmethod
    def _get_recommendation_reason(cls, property_obj, preferences) -> str:
        """Generate human-readable recommendation reason."""
        reasons = []
        
        if property_obj.property_type in preferences['preferred_property_types']:
            reasons.append(f"Matches your preference for {property_obj.property_type} properties")
        
        if property_obj.expected_return and property_obj.expected_return >= 8:
            reasons.append(f"High expected return of {property_obj.expected_return}%")
        
        if hasattr(property_obj, 'investor_count') and property_obj.investor_count > 10:
            reasons.append("Popular with other investors")
        
        return "; ".join(reasons) if reasons else "Good investment opportunity"
    
    @classmethod
    def _assess_risk_level(cls, property_obj) -> str:
        """Assess risk level of property investment."""
        # Simplified risk assessment based on property characteristics
        risk_factors = 0
        
        if property_obj.status == 'under_construction':
            risk_factors += 2
        
        if not property_obj.rental_yield:
            risk_factors += 1
        
        if property_obj.total_value > 10000000:  # $10M+
            risk_factors += 1
        
        if risk_factors >= 3:
            return 'high'
        elif risk_factors >= 1:
            return 'medium'
        else:
            return 'low'


class WalletInvestmentService:
    """Service for processing wallet-based investments with complete end-to-end logic."""

    @classmethod
    def check_investment_limits(cls, user: User, investment_amount: Decimal) -> None:
        """
        Check if user's investment amount is within their daily and monthly limits.
        Raises InvestmentError if limits are exceeded.
        """
        # Get user's KYC level for limits
        kyc_profile = getattr(user, 'kyc_profile', None)
        kyc_level = kyc_profile.verification_level if kyc_profile else 'basic'

        # Get limits for this KYC level
        limits = INVESTMENT_LIMITS.get(kyc_level, INVESTMENT_LIMITS['basic'])
        daily_limit = limits['daily']
        monthly_limit = limits['monthly']

        # Calculate current usage
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)

        daily_used = Investment.objects.filter(
            user=user,
            created_at__gte=today_start,
            status__in=['pending', 'processing', 'pending_mint', 'minting', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')

        monthly_used = Investment.objects.filter(
            user=user,
            created_at__gte=month_start,
            status__in=['pending', 'processing', 'pending_mint', 'minting', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')

        # Check daily limit
        daily_remaining = daily_limit - daily_used
        if investment_amount > daily_remaining:
            raise InvestmentError(
                f"Exceeds daily investment limit. "
                f"Remaining today: ${daily_remaining:.2f} (Limit: ${daily_limit:.2f})"
            )

        # Check monthly limit
        monthly_remaining = monthly_limit - monthly_used
        if investment_amount > monthly_remaining:
            raise InvestmentError(
                f"Exceeds monthly investment limit. "
                f"Remaining this month: ${monthly_remaining:.2f} (Limit: ${monthly_limit:.2f})"
            )

    @classmethod
    @transaction.atomic
    def process_wallet_investment(
        cls,
        user: User,
        property_id: str,
        investment_amount: Decimal,
        token_amount: int
    ) -> Dict:
        """
        Process complete wallet-based investment transaction.

        This implements the full end-to-end logic required:
        1. Verify user has sufficient wallet funds
        2. Deduct investment amount from wallet balance
        3. Allocate tokens to user's portfolio
        4. Update property data (tokens_available, total_funds_raised, investor_count)
        5. Record transaction in user's transaction history
        6. Return success status for UI display
        """
        try:
            # Check investment limits FIRST before any other processing
            cls.check_investment_limits(user, investment_amount)

            # Get property with lock to prevent race conditions
            property_obj = Property.objects.select_for_update().get(id=property_id)

            # Verify token availability
            available_tokens = property_obj.total_tokens - property_obj.tokens_sold
            if token_amount > available_tokens:
                raise InvestmentError(f"Insufficient tokens available. Requested: {token_amount}, Available: {available_tokens}")

            # Get user's wallet balance
            wallet_balance = WalletBalance.objects.select_for_update().get(
                user=user,
                currency='USD'
            )

            # Verify sufficient wallet funds
            if wallet_balance.available_balance < investment_amount:
                raise InvestmentError(
                    f"Insufficient wallet balance. Required: ${investment_amount}, Available: ${wallet_balance.available_balance}"
                )

            # Calculate fees
            platform_fee = investment_amount * InvestmentCalculationService.PLATFORM_FEE_RATE
            total_amount = investment_amount + platform_fee

            # Verify total amount including fees
            if wallet_balance.available_balance < total_amount:
                raise InvestmentError(
                    f"Insufficient wallet balance including fees. Required: ${total_amount}, Available: ${wallet_balance.available_balance}"
                )

            # Step 1: Deduct investment amount from user's wallet balance
            balance_before = wallet_balance.available_balance
            wallet_balance.available_balance -= total_amount
            wallet_balance.save(update_fields=['available_balance'])

            # Step 2: Create wallet transaction record
            from payments.models import WalletTransaction
            wallet_transaction = WalletTransaction.objects.create(
                user=user,
                transaction_type='investment',
                amount=-total_amount,
                currency='USD',
                balance_before=balance_before,
                balance_after=wallet_balance.available_balance,
                description=f'Investment in {property_obj.title} - {token_amount} tokens'
            )

            # Step 3: Create Payment record for this wallet transaction
            payment = Payment.objects.create(
                user=user,
                amount=total_amount,
                currency='USD',
                payment_method='wallet',
                status='completed',
                net_amount=investment_amount,
                processing_fee=platform_fee,
                external_transaction_id=str(wallet_transaction.id),
                metadata={
                    'wallet_transaction_id': str(wallet_transaction.id),
                    'property_id': str(property_id),
                    'token_amount': token_amount
                }
            )

            # Step 4: Create Investment record
            investment = Investment.objects.create(
                user=user,
                property_investment=property_obj,
                investment_amount=investment_amount,
                token_amount=token_amount,
                payment_method={'type': 'wallet', 'currency': 'USD',
                                'payment_id': str(payment.id),
                                'wallet_transaction_id': str(wallet_transaction.id)},
                status=InvestmentStatus.PROCESSING,
            )

            # Step 5: Process investment through existing service (updates property tokens_sold)
            success = InvestmentProcessingService.process_investment(investment, payment)

            if not success:
                raise InvestmentError("Investment processing failed")

            # Step 6: Update property total_funds_raised (this is calculated dynamically but we can add it explicitly)
            # The property model should have a method to calculate this, but let's ensure it's updated
            property_obj.refresh_from_db()

            # Calculate current investor count for this property
            investor_count = Investment.objects.filter(
                property_investment=property_obj,
                status=InvestmentStatus.COMPLETED
            ).values('user').distinct().count()

            # Calculate total funds raised for this property
            total_funds_raised = Investment.objects.filter(
                property_investment=property_obj,
                status=InvestmentStatus.COMPLETED
            ).aggregate(
                total=Sum('investment_amount')
            )['total'] or Decimal('0')

            logger.info(
                f"Wallet investment completed successfully: "
                f"User {user.id}, Property {property_id}, "
                f"Amount ${investment_amount}, Tokens {token_amount}, "
                f"New tokens_sold: {property_obj.tokens_sold}, "
                f"Investor count: {investor_count}, "
                f"Total funds raised: ${total_funds_raised}"
            )

            # Return success response with all relevant data
            return {
                'success': True,
                'investment_id': str(investment.id),
                'payment_id': str(payment.id),
                'wallet_transaction_id': str(wallet_transaction.id),
                'message': 'Investment completed successfully',
                'investment': {
                    'amount': str(investment_amount),
                    'tokens': token_amount,
                    'fees': str(platform_fee),
                    'total_paid': str(total_amount)
                },
                'property_updates': {
                    'tokens_sold': property_obj.tokens_sold,
                    'tokens_available': property_obj.total_tokens - property_obj.tokens_sold,
                    'investor_count': investor_count,
                    'total_funds_raised': str(total_funds_raised),
                    'funding_percentage': float((total_funds_raised / property_obj.total_value) * 100) if property_obj.total_value else 0
                },
                'wallet_updates': {
                    'new_balance': str(wallet_balance.available_balance),
                    'amount_deducted': str(total_amount)
                }
            }

        except Property.DoesNotExist:
            raise InvestmentError("Property not found")
        except WalletBalance.DoesNotExist:
            raise InvestmentError("User wallet not found")
        except Exception as e:
            logger.error(f"Wallet investment failed for user {user.id}, property {property_id}: {str(e)}")
            raise InvestmentError(f"Investment failed: {str(e)}")

    @classmethod
    def validate_wallet_investment(
        cls,
        user: User,
        property_id: str,
        investment_amount: Decimal,
        token_amount: int
    ) -> Dict:
        """
        Validate wallet investment before processing.
        Returns validation result with detailed information.
        """
        try:
            property_obj = Property.objects.get(id=property_id)

            # Check token availability
            available_tokens = property_obj.total_tokens - property_obj.tokens_sold
            token_availability_valid = token_amount <= available_tokens

            # Check wallet balance
            try:
                wallet_balance = WalletBalance.objects.get(user=user, currency='USD')
                balance_sufficient = wallet_balance.available_balance >= investment_amount

                # Calculate fees
                platform_fee = investment_amount * InvestmentCalculationService.PLATFORM_FEE_RATE
                total_amount = investment_amount + platform_fee
                total_balance_sufficient = wallet_balance.available_balance >= total_amount

            except WalletBalance.DoesNotExist:
                wallet_balance = None
                balance_sufficient = False
                total_balance_sufficient = False
                platform_fee = Decimal('0')
                total_amount = investment_amount

            # Calculate investment details
            ownership_percentage = (Decimal(token_amount) / Decimal(property_obj.total_tokens)) * 100

            return {
                'valid': token_availability_valid and total_balance_sufficient,
                'property': {
                    'id': str(property_obj.id),
                    'title': property_obj.title,
                    'token_price': str(property_obj.token_price),
                    'total_tokens': property_obj.total_tokens,
                    'available_tokens': available_tokens,
                    'tokens_requested': token_amount
                },
                'wallet': {
                    'available_balance': str(wallet_balance.available_balance) if wallet_balance else '0.00',
                    'balance_sufficient': total_balance_sufficient,
                    'amount_required': str(total_amount)
                },
                'investment': {
                    'base_amount': str(investment_amount),
                    'platform_fee': str(platform_fee),
                    'total_amount': str(total_amount),
                    'ownership_percentage': str(ownership_percentage.quantize(Decimal('0.0001')))
                },
                'validation_errors': cls._get_validation_errors(
                    token_availability_valid,
                    total_balance_sufficient,
                    available_tokens,
                    token_amount,
                    wallet_balance.available_balance if wallet_balance else Decimal('0'),
                    total_amount
                )
            }

        except Property.DoesNotExist:
            return {
                'valid': False,
                'validation_errors': ['Property not found']
            }
        except Exception as e:
            return {
                'valid': False,
                'validation_errors': [f'Validation failed: {str(e)}']
            }

    @classmethod
    def _get_validation_errors(
        cls,
        token_availability_valid: bool,
        balance_sufficient: bool,
        available_tokens: int,
        requested_tokens: int,
        available_balance: Decimal,
        required_amount: Decimal
    ) -> List[str]:
        """Get list of validation errors."""
        errors = []

        if not token_availability_valid:
            errors.append(f'Insufficient tokens available. Requested: {requested_tokens}, Available: {available_tokens}')

        if not balance_sufficient:
            errors.append(f'Insufficient wallet balance. Required: ${required_amount}, Available: ${available_balance}')

        return errors