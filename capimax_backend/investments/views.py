"""
Investment Views for Capimax Real Estate Tokenization Platform.

This module contains viewsets and API views for investment management,
portfolio tracking, and token ownership operations.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Sum
from django.db import models
from decimal import Decimal
from datetime import timedelta
import logging

from .models import (
    Investment, InstallmentPayment, TokenReservation,
    InvestmentWithdrawal, AutoInvestment, DividendPayment
)
from .serializers import (
    InvestmentCalculationSerializer, InvestmentCreateSerializer,
    InvestmentSerializer, PortfolioSummarySerializer,
    InstallmentPaymentSerializer, TokenReservationSerializer,
    InvestmentWithdrawalSerializer, AutoInvestmentSerializer,
    DividendPaymentSerializer, InvestmentAnalyticsSerializer,
    InvestmentRecommendationSerializer, InvestmentLimitsSerializer
)
from .services import (
    InvestmentCalculationService, PortfolioService,
    InvestmentProcessingService, AutoInvestmentService,
    DividendDistributionService, InvestmentRecommendationService,
    WalletInvestmentService
)
from core.permissions import IsOwnerOrReadOnly, CanInvestWithKYC, IsNotSuspended
from core.exceptions import InvestmentError

logger = logging.getLogger(__name__)


class InvestmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing investments."""

    serializer_class = InvestmentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_permissions(self):
        """
        Return different permissions based on action.
        Create and wallet_invest require KYC approval.
        """
        if self.action in ['create', 'wallet_invest', 'validate_wallet_investment']:
            # Financial actions require KYC approval + not suspended
            return [CanInvestWithKYC()]
        elif self.action in ['calculate']:
            # Read-only calculation just needs authentication
            return [IsAuthenticated(), IsNotSuspended()]
        return super().get_permissions()

    def get_queryset(self):
        """Get investments for current user."""
        if getattr(self, 'swagger_fake_view', False):
            return Investment.objects.none()
        return Investment.objects.filter(
            user=self.request.user
        ).select_related('property_investment').order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return InvestmentCreateSerializer
        return InvestmentSerializer
    
    def perform_create(self, serializer):
        """Create investment with user context."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate investment details before creating investment."""
        serializer = InvestmentCalculationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                calculation = InvestmentCalculationService.calculate_investment_details(
                    property_id=serializer.validated_data['property_id'],
                    token_amount=serializer.validated_data['token_amount'],
                    payment_method=serializer.validated_data.get('payment_method', 'credit_card')
                )
                return Response({
                    'success': True,
                    'data': calculation
                })
            except InvestmentError as e:
                return Response({
                    'success': False,
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel pending investment."""
        investment = self.get_object()
        
        if investment.status not in ['pending', 'processing']:
            return Response({
                'success': False,
                'error': 'Cannot cancel investment in current status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            investment.status = 'cancelled'
            investment.save(update_fields=['status'])
            
            # Release any token reservations
            TokenReservation.objects.filter(
                user=investment.user,
                property_investment=investment.property_investment,
                released=False
            ).update(released=True)
        
        return Response({
            'success': True,
            'message': 'Investment cancelled successfully'
        })
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get investment transaction history."""
        investments = self.get_queryset().filter(
            status__in=['completed', 'failed', 'cancelled']
        )
        
        # Apply date filters if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            investments = investments.filter(created_at__gte=start_date)
        if end_date:
            investments = investments.filter(created_at__lte=end_date)
        
        page = self.paginate_queryset(investments)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(investments, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def simulate(self, request):
        """Simulate investment returns."""
        property_id = request.data.get('property_id')
        investment_amount = request.data.get('investment_amount')
        years = request.data.get('years', 5)
        
        if not property_id or not investment_amount:
            return Response({
                'success': False,
                'error': 'property_id and investment_amount required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from properties.models import Property
            property_obj = Property.objects.get(id=property_id)
            
            # Simple simulation based on expected return
            expected_annual_return = property_obj.expected_return or Decimal('6.0')
            rental_yield = property_obj.rental_yield or Decimal('0.0')
            
            simulation_data = []
            current_value = Decimal(str(investment_amount))
            total_dividends = Decimal('0')
            
            for year in range(1, int(years) + 1):
                # Apply capital appreciation
                current_value *= (1 + expected_annual_return / 100)
                
                # Add rental income
                annual_dividend = Decimal(str(investment_amount)) * (rental_yield / 100)
                total_dividends += annual_dividend
                
                simulation_data.append({
                    'year': year,
                    'property_value': float(current_value),
                    'annual_dividend': float(annual_dividend),
                    'total_dividends': float(total_dividends),
                    'total_return': float(current_value + total_dividends - Decimal(str(investment_amount))),
                    'roi_percentage': float((current_value + total_dividends - Decimal(str(investment_amount))) / Decimal(str(investment_amount)) * 100)
                })
            
            return Response({
                'success': True,
                'data': {
                    'property_title': property_obj.title,
                    'initial_investment': float(investment_amount),
                    'simulation_years': years,
                    'expected_annual_return': float(expected_annual_return),
                    'rental_yield': float(rental_yield),
                    'projections': simulation_data
                }
            })
            
        except Property.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Property not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def wallet_invest(self, request):
        """Process wallet-based investment transaction."""
        property_id = request.data.get('property_id')
        investment_amount = request.data.get('investment_amount')
        token_amount = request.data.get('token_amount')

        if not all([property_id, investment_amount, token_amount]):
            return Response({
                'success': False,
                'error': 'property_id, investment_amount, and token_amount are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            investment_amount = Decimal(str(investment_amount))
            token_amount = int(token_amount)

            # Process wallet investment
            result = WalletInvestmentService.process_wallet_investment(
                user=request.user,
                property_id=property_id,
                investment_amount=investment_amount,
                token_amount=token_amount
            )

            return Response({
                'success': True,
                'data': result
            }, status=status.HTTP_201_CREATED)

        except InvestmentError as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Wallet investment failed for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Investment processing failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def validate_wallet_investment(self, request):
        """Validate wallet investment before processing."""
        property_id = request.data.get('property_id')
        investment_amount = request.data.get('investment_amount')
        token_amount = request.data.get('token_amount')

        if not all([property_id, investment_amount, token_amount]):
            return Response({
                'success': False,
                'error': 'property_id, investment_amount, and token_amount are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            investment_amount = Decimal(str(investment_amount))
            token_amount = int(token_amount)

            # Validate wallet investment
            validation_result = WalletInvestmentService.validate_wallet_investment(
                user=request.user,
                property_id=property_id,
                investment_amount=investment_amount,
                token_amount=token_amount
            )

            return Response({
                'success': True,
                'data': validation_result
            })

        except Exception as e:
            logger.error(f"Wallet investment validation failed for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Validation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortfolioViewSet(viewsets.ViewSet):
    """ViewSet for portfolio management operations."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get user's portfolio data."""
        try:
            # Get portfolio summary
            summary = PortfolioService.get_portfolio_summary(request.user)

            # Get user's investments
            investments = Investment.objects.filter(
                user=request.user,
                status__in=['active', 'pending']
            ).select_related('property')

            # Calculate portfolio metrics
            total_invested = investments.filter(status='active').aggregate(
                total=Sum('amount')
            )['total'] or 0

            properties_count = investments.values('property').distinct().count()

            # Get recent performance
            performance = PortfolioService.get_portfolio_performance(request.user, 30)

            portfolio_data = {
                'total_invested': float(total_invested),
                'current_value': summary.get('total_value', 0),
                'return_percentage': summary.get('total_roi', 0),
                'properties_count': properties_count,
                'monthly_dividends': summary.get('total_dividends', 0),
                'investments': InvestmentSerializer(investments, many=True).data,
                'asset_allocation': summary.get('allocation_by_type', []),
                'performance_data': performance
            }

            return Response(portfolio_data)
        except Exception as e:
            logger.error(f"Portfolio list error for user {request.user.id}: {str(e)}")
            # Return empty portfolio data for new users
            return Response({
                'total_invested': 0,
                'current_value': 0,
                'return_percentage': 0,
                'properties_count': 0,
                'monthly_dividends': 0,
                'investments': [],
                'asset_allocation': [],
                'performance_data': []
            })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get portfolio summary."""
        try:
            summary = PortfolioService.get_portfolio_summary(request.user)
            serializer = PortfolioSummarySerializer(summary)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Portfolio summary error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get portfolio summary'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def performance(self, request):
        """Get portfolio performance data."""
        period_days = int(request.query_params.get('period_days', 30))
        
        try:
            performance = PortfolioService.get_portfolio_performance(
                request.user, period_days
            )
            return Response({
                'success': True,
                'data': performance
            })
        except Exception as e:
            logger.error(f"Portfolio performance error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get portfolio performance'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get detailed investment analytics."""
        try:
            analytics = PortfolioService.get_investment_analytics(request.user)
            serializer = InvestmentAnalyticsSerializer(analytics, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Investment analytics error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get investment analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DividendViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for dividend management (read-only for users)."""
    
    serializer_class = DividendPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get dividends for current user's investments."""
        if getattr(self, 'swagger_fake_view', False):
            return DividendPayment.objects.none()
        return DividendPayment.objects.filter(
            investment__user=self.request.user
        ).select_related(
            'investment',
            'investment__property_investment',
            'investment__user'
        ).order_by('-payment_date')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dividend summary for user."""
        queryset = self.get_queryset().filter(status='paid')
        
        # Date filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        from django.db.models import Sum, Count, Avg
        summary = queryset.aggregate(
            total_dividends=Sum('amount'),
            dividend_count=Count('id'),
            average_dividend=Avg('amount')
        )
        
        # Calculate by property
        by_property = {}
        for dividend in queryset.select_related('investment__property_investment'):
            prop_id = str(dividend.investment.property_investment.id)
            prop_title = dividend.investment.property_investment.title
            
            if prop_id not in by_property:
                by_property[prop_id] = {
                    'property_id': prop_id,
                    'property_title': prop_title,
                    'total_dividends': Decimal('0'),
                    'dividend_count': 0
                }
            
            by_property[prop_id]['total_dividends'] += dividend.amount
            by_property[prop_id]['dividend_count'] += 1
        
        return Response({
            'success': True,
            'data': {
                'total_dividends': summary['total_dividends'] or 0,
                'dividend_count': summary['dividend_count'] or 0,
                'average_dividend': summary['average_dividend'] or 0,
                'by_property': list(by_property.values())
            }
        })


class AutoInvestmentViewSet(viewsets.ModelViewSet):
    """ViewSet for automatic investment management."""
    
    serializer_class = AutoInvestmentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """Get auto investments for current user."""
        if getattr(self, 'swagger_fake_view', False):
            return AutoInvestment.objects.none()
        return AutoInvestment.objects.filter(
            user=self.request.user
        ).select_related('property_investment').order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create auto investment with user context."""
        # Set next execution based on start date and frequency
        start_date = serializer.validated_data['start_date']
        serializer.save(
            user=self.request.user,
            next_execution=start_date
        )
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause auto investment."""
        auto_investment = self.get_object()
        
        if auto_investment.status != 'active':
            return Response({
                'success': False,
                'error': 'Auto investment is not active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        auto_investment.status = 'paused'
        auto_investment.save(update_fields=['status'])
        
        return Response({
            'success': True,
            'message': 'Auto investment paused'
        })
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume paused auto investment."""
        auto_investment = self.get_object()
        
        if auto_investment.status != 'paused':
            return Response({
                'success': False,
                'error': 'Auto investment is not paused'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        auto_investment.status = 'active'
        auto_investment.save(update_fields=['status'])
        
        return Response({
            'success': True,
            'message': 'Auto investment resumed'
        })


class InvestmentWithdrawalViewSet(viewsets.ModelViewSet):
    """ViewSet for investment withdrawal management."""
    
    serializer_class = InvestmentWithdrawalSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """Get withdrawals for current user's investments."""
        if getattr(self, 'swagger_fake_view', False):
            return InvestmentWithdrawal.objects.none()
        return InvestmentWithdrawal.objects.filter(
            investment__user=self.request.user
        ).select_related(
            'investment',
            'investment__property_investment'
        ).order_by('-requested_at')
    
    def perform_create(self, serializer):
        """Create withdrawal with calculated values."""
        investment_id = self.request.data.get('investment')
        token_amount = serializer.validated_data['token_amount']
        
        try:
            investment = Investment.objects.get(
                id=investment_id,
                user=self.request.user,
                status='completed'
            )
            
            # Calculate withdrawal value
            withdrawal_calc = InvestmentCalculationService.calculate_withdrawal_value(
                investment, token_amount
            )
            
            serializer.save(
                estimated_amount=withdrawal_calc['estimated_value'],
                processing_fee=withdrawal_calc['processing_fee'],
                estimated_completion=withdrawal_calc['estimated_completion']
            )
            
        except Investment.DoesNotExist:
            raise InvestmentError("Investment not found or not eligible for withdrawal")


class InvestmentRecommendationViewSet(viewsets.ViewSet):
    """ViewSet for investment recommendations."""
    
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get investment recommendations for user."""
        limit = int(request.query_params.get('limit', 5))
        
        try:
            recommendations = InvestmentRecommendationService.get_recommendations_for_user(
                request.user, limit
            )
            serializer = InvestmentRecommendationSerializer(recommendations, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Recommendation error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to get recommendations'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvestmentLimitsViewSet(viewsets.ViewSet):
    """ViewSet for user investment limits."""
    
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get investment limits for current user."""
        user = request.user
        
        # Get KYC status
        kyc_profile = getattr(user, 'kyc_profile', None)
        kyc_level = kyc_profile.verification_level if kyc_profile else 'basic'
        is_verified = kyc_profile.status == 'approved' if kyc_profile else False
        
        # Define limits based on KYC level
        limits = {
            'basic': {'daily': Decimal('1000'), 'monthly': Decimal('5000')},
            'enhanced': {'daily': Decimal('5000'), 'monthly': Decimal('25000')},
            'premium': {'daily': Decimal('25000'), 'monthly': Decimal('100000')},
        }
        
        user_limits = limits.get(kyc_level, limits['basic'])
        
        # Calculate usage
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        
        daily_used = Investment.objects.filter(
            user=user,
            created_at__gte=today_start,
            status__in=['pending', 'processing', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')
        
        monthly_used = Investment.objects.filter(
            user=user,
            created_at__gte=month_start,
            status__in=['pending', 'processing', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')
        
        data = {
            'daily_limit': user_limits['daily'],
            'monthly_limit': user_limits['monthly'],
            'daily_remaining': max(user_limits['daily'] - daily_used, Decimal('0')),
            'monthly_remaining': max(user_limits['monthly'] - monthly_used, Decimal('0')),
            'kyc_level': kyc_level,
            'is_verified': is_verified
        }
        
        serializer = InvestmentLimitsSerializer(data)
        return Response({
            'success': True,
            'data': serializer.data
        })


class CollaborativeInvestmentView(APIView):
    """
    API endpoint for collaborative investment opportunities.
    
    Returns group investment opportunities where multiple users
    can participate together with special benefits.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get collaborative investment opportunities."""
        from properties.models import Property
        from django.utils import timezone
        from datetime import timedelta
        
        # Mock collaborative investment data - would be stored in database
        collaborative_investments = []
        
        # Get some active properties for mock data
        active_properties = Property.objects.filter(
            status__in=['active', 'tokenized']
        )[:3]
        
        for i, prop in enumerate(active_properties):
            collaborative_investments.append({
                'id': f"collab-{prop.id}",
                'title': f"Collaborative Investment - {prop.title}",
                'description': f"Join with other investors to unlock exclusive benefits for {prop.title}",
                'property_id': prop.id,
                'property_title': prop.title,
                'target_amount': prop.total_value * Decimal('0.3'),  # 30% of property value
                'current_amount': prop.total_value * Decimal('0.1') * (i + 1),  # Mock current funding
                'minimum_contribution': Decimal('500.00'),
                'participants_count': (i + 1) * 5,
                'max_participants': 20,
                'start_date': timezone.now() - timedelta(days=i * 2),
                'end_date': timezone.now() + timedelta(days=30 - i * 3),
                'expected_return': prop.expected_return or Decimal('8.5'),
                'special_benefits': [
                    'Reduced platform fees (1.5% instead of 2.5%)',
                    'Priority access to property updates',
                    'Quarterly investor meetups',
                    'Early access to similar properties'
                ],
                'status': 'active',
                'funding_percentage': float((prop.total_value * Decimal('0.1') * (i + 1)) / (prop.total_value * Decimal('0.3')) * 100)
            })
        
        return Response({
            'success': True,
            'data': collaborative_investments
        })


class InvestmentTransactionsView(APIView):
    """
    API endpoint for investment transaction history.
    
    Returns paginated list of all user transactions including
    investments, dividends, and withdrawals.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get paginated transaction history."""
        from django.core.paginator import Paginator
        from django.http import HttpRequest
        
        user = request.user
        transactions = []
        
        # Get investments
        investments = Investment.objects.filter(user=user).select_related('property_investment')
        for investment in investments:
            transactions.append({
                'id': investment.id,
                'type': 'investment',
                'property_title': investment.property_investment.title,
                'property_id': investment.property_investment.id,
                'amount': investment.investment_amount,
                'currency': 'USD',
                'status': investment.status,
                'date': investment.created_at,
                'description': f'Investment in {investment.property_investment.title}',
                'token_amount': investment.token_amount,
                'token_price': investment.property_investment.token_price,
                'transaction_hash': investment.transaction_hash,
                'blockchain_confirmed': investment.blockchain_confirmed,
            })
        
        # Get dividends
        dividends = DividendPayment.objects.filter(investment__user=user).select_related(
            'investment__property_investment'
        )
        for dividend in dividends:
            transactions.append({
                'id': dividend.id,
                'type': 'dividend',
                'property_title': dividend.investment.property_investment.title,
                'property_id': dividend.investment.property_investment.id,
                'amount': dividend.amount,
                'currency': dividend.currency,
                'status': dividend.status,
                'date': dividend.payment_date,
                'description': f'Dividend from {dividend.investment.property_investment.title}',
                'token_amount': None,
                'token_price': None,
                'transaction_hash': None,
                'blockchain_confirmed': True,
            })
        
        # Get withdrawals
        withdrawals = InvestmentWithdrawal.objects.filter(investment__user=user).select_related(
            'investment__property_investment'
        )
        for withdrawal in withdrawals:
            transactions.append({
                'id': withdrawal.id,
                'type': 'withdrawal',
                'property_title': withdrawal.investment.property_investment.title,
                'property_id': withdrawal.investment.property_investment.id,
                'amount': -withdrawal.estimated_amount,  # Negative for withdrawal
                'currency': 'USD',
                'status': withdrawal.status,
                'date': withdrawal.requested_at,
                'description': f'Withdrawal from {withdrawal.investment.property_investment.title}',
                'token_amount': withdrawal.token_amount,
                'token_price': None,
                'transaction_hash': None,
                'blockchain_confirmed': False,
            })
        
        # Sort by date (newest first)
        transactions.sort(key=lambda x: x['date'], reverse=True)
        
        # Apply filters
        transaction_type = request.query_params.get('type')
        if transaction_type:
            transactions = [t for t in transactions if t['type'] == transaction_type]
        
        property_id = request.query_params.get('property_id')
        if property_id:
            transactions = [t for t in transactions if str(t['property_id']) == property_id]
        
        # Pagination
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        page = int(request.query_params.get('page', 1))
        
        paginator = Paginator(transactions, page_size)
        page_obj = paginator.get_page(page)
        
        return Response({
            'count': paginator.count,
            'next': f"{request.build_absolute_uri()}?page={page + 1}" if page_obj.has_next() else None,
            'previous': f"{request.build_absolute_uri()}?page={page - 1}" if page_obj.has_previous() else None,
            'results': list(page_obj.object_list)
        })
