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
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.permissions import IsOwnerOrReadOnly, CanInvestWithKYC, IsNotSuspended
from core.utils import create_success_response, create_error_response
from core.exceptions import InvestmentError
from payments.models import Payment, PaymentMethod, PaymentStatus, NovaSukukPayment, PronovaPayment
from payments.serializers import (
    NovaSukukCreateSerializer, NovaSukukDetailSerializer,
    PronovaCreateSerializer, PronovaConfirmSerializer, PronovaDetailSerializer
)
from properties.models import Property
from notifications.services import NotificationService

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
        if self.action in ['create', 'wallet_invest', 'validate_wallet_investment',
                          'nova_sukuk_invest', 'pronova_invest', 'confirm_pronova']:
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
    
    def create(self, request, *args, **kwargs):
        """
        Create investment with full pre-flight compliance enforcement.

        Checks (in order, all must pass):
          1. User has verified, non-expired KYC.
          2. No outstanding compliance hits (PEP / sanctions / adverse media).
          3. Cumulative annual investment within KYC investment_limit.
          4. Accreditation status if the property requires it.
          5. Investor's jurisdiction allowed by the SPV (if SPV is linked).
        """
        self._enforce_compliance_gate(request)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        investment = serializer.save()

        # Snapshot the investor's compliance state at creation time so we
        # have audit evidence the gate was honoured.
        self._record_compliance_snapshot(investment, request.user)

        # Create the subscription agreement (pending_signature). The frontend
        # then prompts the investor to sign before the payment is captured.
        try:
            from legal.services import SubscriptionAgreementService
            SubscriptionAgreementService.create_for_investment(investment)
        except Exception as exc:
            # Legal app may not yet be wired for older properties without an
            # SPV. Log but don't block the investment creation.
            import logging
            logging.getLogger(__name__).warning(
                "Could not create SubscriptionAgreement",
                extra={'investment_id': str(investment.id), 'error': str(exc)},
            )

        return Response(
            create_success_response(
                data=InvestmentSerializer(serializer.instance).data,
                message="Investment created successfully"
            ),
            status=status.HTTP_201_CREATED
        )

    # ---------------------------------------------------------------
    # Compliance gate helpers
    # ---------------------------------------------------------------
    def _enforce_compliance_gate(self, request) -> None:
        from rest_framework.exceptions import PermissionDenied, ValidationError
        from decimal import Decimal

        user = request.user
        property_id = request.data.get('property_id') or request.data.get('property')
        amount = Decimal(str(request.data.get('investment_amount') or 0))

        kyc = getattr(user, 'kyc_profile', None)
        if not kyc or not kyc.is_verified():
            raise PermissionDenied("A verified KYC profile is required to invest.")

        # PEP / sanctions / adverse media hits block investing entirely.
        # ComplianceCheck links directly to User, not to KYCProfile.
        try:
            from kyc.models import ComplianceCheck
            if ComplianceCheck.objects.filter(user=user, result='hit').exists():
                raise PermissionDenied(
                    "Your account has an unresolved compliance review. "
                    "Contact support to invest."
                )
        except ImportError:
            pass

        # Annual investment cap enforced by KYC tier.
        if getattr(kyc, 'investment_limit', None):
            from datetime import timedelta
            from django.utils import timezone
            from django.db.models import Sum
            from .models import Investment, InvestmentStatus

            year_ago = timezone.now() - timedelta(days=365)
            ytd_total = (
                Investment.objects
                .filter(
                    user=user,
                    created_at__gte=year_ago,
                )
                .exclude(status__in=[
                    InvestmentStatus.CANCELLED,
                    InvestmentStatus.FAILED,
                    InvestmentStatus.REFUNDED,
                ])
                .aggregate(s=Sum('investment_amount'))['s'] or Decimal('0')
            )
            if ytd_total + amount > Decimal(str(kyc.investment_limit)):
                raise ValidationError({
                    'investment_amount': (
                        f"This investment would exceed your annual limit of "
                        f"${kyc.investment_limit}. Current YTD: ${ytd_total}."
                    )
                })

        # Property-level gates
        if not property_id:
            return
        try:
            from properties.models import Property
            property_obj = Property.objects.get(pk=property_id)
        except Exception:
            return  # serializer will reject in the next step

        requires_accredited = (
            getattr(property_obj, 'requires_accredited_investors', False)
            or (
                getattr(property_obj, 'spv_entity', None)
                and getattr(property_obj.spv_entity, 'requires_accredited_investors', False)
            )
        )
        if requires_accredited and not getattr(kyc, 'is_accredited', False):
            raise PermissionDenied(
                "This property is restricted to accredited investors."
            )

        spv = getattr(property_obj, 'spv_entity', None)
        if spv:
            country = (getattr(kyc, 'country_of_residence', '') or '').upper()
            if not spv.jurisdiction_allowed(country):
                raise PermissionDenied(
                    "Your country of residence is not eligible to "
                    "participate in this offering."
                )

    def _record_compliance_snapshot(self, investment, user) -> None:
        """Snapshot accreditation + jurisdiction onto the investment."""
        kyc = getattr(user, 'kyc_profile', None)
        if not kyc:
            return
        investment.accredited_at_investment_time = bool(
            getattr(kyc, 'is_accredited', False)
        )
        investment.jurisdiction_at_investment_time = (
            (getattr(kyc, 'country_of_residence', '') or '').upper()[:2]
        )
        investment.save(update_fields=[
            'accredited_at_investment_time',
            'jurisdiction_at_investment_time',
        ])

    def list(self, request, *args, **kwargs):
        """List investments and return wrapped response."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginator = self.paginator
            return Response(create_success_response(data={
                'investments': serializer.data,
                'pagination': {
                    'page': paginator.page.number,
                    'limit': paginator.page_size,
                    'total': paginator.page.paginator.count,
                    'pages': paginator.page.paginator.num_pages,
                }
            }))
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            create_success_response(data={'investments': serializer.data})
        )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve single investment and return wrapped response."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            create_success_response(data=serializer.data)
        )

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
        """
        Cancel a pending investment.

        Only `PENDING` is cancellable by the user via this endpoint. Once a
        payment is initiated (`PROCESSING`), the user must wait for the
        payment provider to settle and follow the refund flow. This prevents
        the refund-plus-keep-tokens race.
        """
        from .models import InvestmentStatus

        # Re-fetch under row lock; the cached instance from get_object()
        # cannot be trusted because the state may have changed during a
        # concurrent payment webhook.
        with transaction.atomic():
            try:
                investment = (
                    Investment.objects
                    .select_for_update()
                    .get(pk=pk, user=request.user)
                )
            except Investment.DoesNotExist:
                return Response(
                    {'success': False, 'error': 'Investment not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            cancellable = {InvestmentStatus.PENDING}
            if investment.status not in cancellable:
                return Response({
                    'success': False,
                    'error': (
                        f'Cannot cancel investment in status "{investment.status}". '
                        'If a payment has been completed, contact support to '
                        'request a refund.'
                    ),
                }, status=status.HTTP_400_BAD_REQUEST)

            investment.status = InvestmentStatus.CANCELLED
            investment.save(update_fields=['status'])

            TokenReservation.objects.filter(
                user=investment.user,
                property_investment=investment.property_investment,
                released=False,
            ).update(released=True)

        return Response({
            'success': True,
            'message': 'Investment cancelled successfully',
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


    # --- Nova Sukuk Investment ---

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def nova_sukuk_invest(self, request):
        """Create an investment paid via Nova Sukuk (manual PDF review)."""
        serializer = NovaSukukCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            property_obj = Property.objects.get(
                id=data['property_id'], status__in=['active', 'tokenized']
            )
        except Property.DoesNotExist:
            return Response(create_error_response(
                message="Property not found or not available for investment",
                status_code=404
            ), status=status.HTTP_404_NOT_FOUND)

        available = property_obj.total_tokens - property_obj.tokens_sold
        if data['token_amount'] > available:
            return Response(create_error_response(
                message=f"Only {available} tokens available",
                status_code=400
            ), status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            investment = Investment.objects.create(
                user=request.user,
                property_investment=property_obj,
                token_amount=data['token_amount'],
                investment_amount=data['investment_amount'],
                status='pending',
            )

            payment = Payment.objects.create(
                user=request.user,
                investment=investment,
                amount=data['investment_amount'],
                payment_method=PaymentMethod.NOVA_SUKUK,
                status=PaymentStatus.PENDING,
            )

            sukuk = NovaSukukPayment.objects.create(
                investment=investment,
                payment=payment,
                sukuk_pdf=data['sukuk_pdf'],
                sukuk_reference_number=data['sukuk_reference_number'],
            )

        return Response(create_success_response(
            data={
                'investment_id': str(investment.id),
                'sukuk_payment_id': str(sukuk.id),
                'status': 'pending',
                'message': 'Your Nova Sukuk payment has been submitted for admin review.'
            },
            message="Nova Sukuk investment submitted successfully"
        ), status=status.HTTP_201_CREATED)

    # --- Pronova Crypto Investment ---

    @action(detail=False, methods=['post'])
    def pronova_invest(self, request):
        """Create an investment paid via Pronova crypto (5% discount)."""
        serializer = PronovaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            property_obj = Property.objects.get(
                id=data['property_id'], status__in=['active', 'tokenized']
            )
        except Property.DoesNotExist:
            return Response(create_error_response(
                message="Property not found or not available for investment",
                status_code=404
            ), status=status.HTTP_404_NOT_FOUND)

        available = property_obj.total_tokens - property_obj.tokens_sold
        if data['token_amount'] > available:
            return Response(create_error_response(
                message=f"Only {available} tokens available",
                status_code=400
            ), status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings as django_settings
        pronova_config = getattr(django_settings, 'PRONOVA_CONFIG', {})
        platform_wallet = pronova_config.get('PLATFORM_WALLET_ADDRESS', '')
        discount_pct = pronova_config.get('DISCOUNT_PERCENTAGE', Decimal('5.00'))

        original_amount = data['investment_amount']
        discounted_amount = original_amount * (Decimal('1') - discount_pct / Decimal('100'))

        with transaction.atomic():
            investment = Investment.objects.create(
                user=request.user,
                property_investment=property_obj,
                token_amount=data['token_amount'],
                investment_amount=original_amount,
                status='pending',
            )

            payment = Payment.objects.create(
                user=request.user,
                investment=investment,
                amount=discounted_amount,
                payment_method=PaymentMethod.PRONOVA,
                status=PaymentStatus.PENDING,
            )

            pronova = PronovaPayment.objects.create(
                investment=investment,
                payment=payment,
                pronova_amount=Decimal('0'),  # Set when user confirms tx
                usd_equivalent=original_amount,
                discount_applied=discount_pct,
                discounted_amount=discounted_amount,
                platform_wallet_address=platform_wallet,
            )

        return Response(create_success_response(
            data={
                'investment_id': str(investment.id),
                'pronova_payment_id': str(pronova.id),
                'platform_wallet_address': platform_wallet,
                'original_amount': str(original_amount),
                'discounted_amount': str(discounted_amount),
                'discount_percentage': str(discount_pct),
                'status': 'pending',
            },
            message="Pronova investment created. Send payment to the platform wallet address."
        ), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm_pronova(self, request, pk=None):
        """Confirm a Pronova payment by providing the on-chain tx_hash."""
        investment = self.get_object()
        serializer = PronovaConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            pronova = PronovaPayment.objects.get(investment=investment, status='pending')
        except PronovaPayment.DoesNotExist:
            return Response(create_error_response(
                message="No pending Pronova payment found for this investment",
                status_code=404
            ), status=status.HTTP_404_NOT_FOUND)

        pronova.tx_hash = serializer.validated_data['tx_hash']
        pronova.sender_wallet_address = serializer.validated_data['sender_wallet_address']
        pronova.status = 'confirming'
        pronova.save(update_fields=['tx_hash', 'sender_wallet_address', 'status', 'updated_at'])

        # Trigger async verification task
        from payments.tasks import verify_pronova_transaction
        verify_pronova_transaction.delay(str(pronova.id))

        return Response(create_success_response(
            data=PronovaDetailSerializer(pronova).data,
            message="Transaction hash submitted. Verification in progress."
        ))


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
            ).select_related('property_investment')

            # Calculate portfolio metrics
            total_invested = investments.filter(status='active').aggregate(
                total=Sum('investment_amount')
            )['total'] or 0

            properties_count = investments.values('property_investment').distinct().count()

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
            data = dict(serializer.data)
            # Compute estimated monthly rental income (same as DashboardStatsView)
            investments = Investment.objects.filter(
                user=request.user,
                status='completed'
            ).select_related('property_investment')

            estimated_monthly_rental = Decimal('0')
            for inv in investments:
                prop = inv.property_investment
                if prop.monthly_rental_income and prop.monthly_rental_income > 0:
                    ownership_pct = inv.ownership_percentage / Decimal('100') if inv.ownership_percentage else Decimal('0')
                    estimated_monthly_rental += prop.monthly_rental_income * ownership_pct

            total_dividends = Decimal(str(data.get('total_dividends', 0)))
            monthly_income = float(total_dividends + estimated_monthly_rental)

            # Add frontend-expected aliases
            data['monthly_dividends'] = monthly_income
            data['total_returns'] = data.get('total_return', 0)

            allocation_map = {}
            total_invested = Decimal('0')
            for inv in investments:
                ptype = inv.property_investment.property_type or 'other'
                allocation_map[ptype] = allocation_map.get(ptype, Decimal('0')) + inv.investment_amount
                total_invested += inv.investment_amount

            asset_allocation = []
            if total_invested > 0:
                for ptype, amount in allocation_map.items():
                    asset_allocation.append({
                        'property_type': ptype,
                        'amount': float(amount),
                        'percentage': float((amount / total_invested * 100).quantize(Decimal('0.1'))),
                    })

            data['asset_allocation'] = asset_allocation

            return Response({
                'success': True,
                'data': data
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

        search = request.query_params.get('search', '').strip().lower()
        if search:
            transactions = [
                t for t in transactions
                if search in t.get('description', '').lower()
                or search in t.get('type', '').lower()
                or search in t.get('property_title', '').lower()
                or search in t.get('status', '').lower()
            ]
        
        # Pagination
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        page = int(request.query_params.get('page', 1))
        
        paginator = Paginator(transactions, page_size)
        page_obj = paginator.get_page(page)
        
        return Response(create_success_response(
            data={
                'count': paginator.count,
                'next': f"{request.build_absolute_uri()}?page={page + 1}" if page_obj.has_next() else None,
                'previous': f"{request.build_absolute_uri()}?page={page - 1}" if page_obj.has_previous() else None,
                'results': list(page_obj.object_list)
            }
        ))
