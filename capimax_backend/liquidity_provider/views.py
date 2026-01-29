"""
Views for Liquidity Provider module.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal

from core.utils import create_success_response, create_error_response
from .models import (
    LPApplication, LiquidityProvider, ExitRequest, LiquidityTransaction,
    LPApplicationStatus, LPStatus, ExitRequestStatus
)
from .serializers import (
    LPApplicationCreateSerializer, LPApplicationSerializer, LPApplicationAdminSerializer,
    LiquidityProviderSerializer, LiquidityProviderUpdateSerializer, LiquidityProviderPublicSerializer,
    ExitRequestCreateSerializer, ExitRequestSerializer, ExitRequestLPActionSerializer,
    ExitRequestInvestorActionSerializer, LiquidityTransactionSerializer, LPDashboardStatsSerializer
)


class IsAdmin(permissions.BasePermission):
    """Permission check for admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.role == 'admin'
        )


class IsLiquidityProvider(permissions.BasePermission):
    """Permission check for liquidity provider users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'liquidity_provider_profile') and \
               request.user.liquidity_provider_profile is not None


# ============================================================================
# LP Application Views
# ============================================================================

class LPApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for LP applications."""

    queryset = LPApplication.objects.all()
    serializer_class = LPApplicationSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        elif self.action in ['list', 'retrieve', 'approve', 'reject']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return LPApplicationCreateSerializer
        elif self.action in ['list', 'retrieve', 'approve', 'reject']:
            return LPApplicationAdminSerializer
        return LPApplicationSerializer

    def create(self, request, *args, **kwargs):
        """Submit a new LP application."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            application = serializer.save()
            return Response(
                create_success_response(
                    data={'id': str(application.id)},
                    message='Application submitted successfully. We will review and contact you.'
                ),
                status=status.HTTP_201_CREATED
            )
        return Response(
            create_error_response(message='Validation failed', errors=serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )

    def list(self, request, *args, **kwargs):
        """List all LP applications (admin only)."""
        queryset = self.get_queryset()

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an LP application (admin only)."""
        application = self.get_object()

        if application.status != LPApplicationStatus.PENDING:
            return Response(
                create_error_response(message='Application is not pending'),
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get('notes', '')
        lp = application.approve(reviewer=request.user, notes=notes)

        return Response(
            create_success_response(
                data={'lp_id': str(lp.id)},
                message='Application approved. Liquidity Provider created.'
            )
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an LP application (admin only)."""
        application = self.get_object()

        if application.status != LPApplicationStatus.PENDING:
            return Response(
                create_error_response(message='Application is not pending'),
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        application.reject(reviewer=request.user, reason=reason)

        return Response(
            create_success_response(message='Application rejected.')
        )


# ============================================================================
# Liquidity Provider Views
# ============================================================================

class LiquidityProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for Liquidity Providers."""

    queryset = LiquidityProvider.objects.all()
    serializer_class = LiquidityProviderSerializer

    def get_permissions(self):
        if self.action == 'list_active':
            return [permissions.IsAuthenticated()]
        elif self.action in ['activate', 'suspend', 'deactivate']:
            return [IsAdmin()]
        elif self.action in ['update', 'partial_update', 'my_profile', 'dashboard_stats']:
            return [IsLiquidityProvider()]
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.action == 'list_active':
            return LiquidityProviderPublicSerializer
        elif self.action in ['update', 'partial_update']:
            return LiquidityProviderUpdateSerializer
        return LiquidityProviderSerializer

    @action(detail=False, methods=['get'])
    def list_active(self, request):
        """List active LPs for investors to choose from."""
        queryset = self.get_queryset().filter(status=LPStatus.ACTIVE)
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))

    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        """Get the current user's LP profile."""
        try:
            lp = request.user.liquidity_provider_profile
            serializer = LiquidityProviderSerializer(lp)
            return Response(create_success_response(data=serializer.data))
        except LiquidityProvider.DoesNotExist:
            return Response(
                create_error_response(message='You are not a liquidity provider'),
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for LP."""
        try:
            lp = request.user.liquidity_provider_profile
        except LiquidityProvider.DoesNotExist:
            return Response(
                create_error_response(message='You are not a liquidity provider'),
                status=status.HTTP_404_NOT_FOUND
            )

        exit_requests = ExitRequest.objects.filter(liquidity_provider=lp)
        transactions = LiquidityTransaction.objects.filter(liquidity_provider=lp)

        stats = {
            'total_exit_requests': exit_requests.count(),
            'pending_requests': exit_requests.filter(status=ExitRequestStatus.PENDING).count(),
            'approved_requests': exit_requests.filter(status=ExitRequestStatus.APPROVED).count(),
            'completed_requests': exit_requests.filter(status=ExitRequestStatus.COMPLETED).count(),
            'rejected_requests': exit_requests.filter(status=ExitRequestStatus.REJECTED).count(),
            'total_units_purchased': transactions.aggregate(
                total=Sum('units_purchased'))['total'] or 0,
            'total_amount_spent': transactions.aggregate(
                total=Sum('total_amount'))['total'] or Decimal('0'),
            'current_month_volume': lp.current_month_total,
            'remaining_monthly_capacity': lp.remaining_monthly_capacity
        }

        serializer = LPDashboardStatsSerializer(stats)
        return Response(create_success_response(data=serializer.data))

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a liquidity provider (admin only)."""
        lp = self.get_object()
        lp.activate()
        return Response(create_success_response(message='Liquidity Provider activated.'))

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a liquidity provider (admin only)."""
        lp = self.get_object()
        reason = request.data.get('reason', '')
        lp.suspend(reason=reason)
        return Response(create_success_response(message='Liquidity Provider suspended.'))

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a liquidity provider (admin only)."""
        lp = self.get_object()
        lp.deactivate()
        return Response(create_success_response(message='Liquidity Provider deactivated.'))


# ============================================================================
# Exit Request Views
# ============================================================================

class ExitRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for Exit Requests."""

    queryset = ExitRequest.objects.all()
    serializer_class = ExitRequestSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # LP sees their exit requests
        if hasattr(user, 'liquidity_provider_profile') and user.liquidity_provider_profile:
            lp = user.liquidity_provider_profile
            if self.action in ['list', 'lp_pending', 'lp_action']:
                return ExitRequest.objects.filter(liquidity_provider=lp)

        # Admin sees all
        if user.is_staff or user.role == 'admin':
            return ExitRequest.objects.all()

        # Regular user sees their own
        return ExitRequest.objects.filter(investor=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ExitRequestCreateSerializer
        return ExitRequestSerializer

    def create(self, request, *args, **kwargs):
        """Create a new exit request (investor)."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            exit_request = serializer.save()
            return Response(
                create_success_response(
                    data={'id': str(exit_request.id)},
                    message='Exit request submitted. The liquidity provider will review your request.'
                ),
                status=status.HTTP_201_CREATED
            )
        return Response(
            create_error_response(message='Validation failed', errors=serializer.errors),
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's exit requests."""
        queryset = ExitRequest.objects.filter(investor=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))

    @action(detail=False, methods=['get'])
    def lp_pending(self, request):
        """Get pending exit requests for LP."""
        if not hasattr(request.user, 'liquidity_provider_profile'):
            return Response(
                create_error_response(message='You are not a liquidity provider'),
                status=status.HTTP_403_FORBIDDEN
            )

        lp = request.user.liquidity_provider_profile
        queryset = ExitRequest.objects.filter(
            liquidity_provider=lp,
            status__in=[ExitRequestStatus.PENDING, ExitRequestStatus.UNDER_REVIEW]
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))

    @action(detail=True, methods=['post'])
    def lp_action(self, request, pk=None):
        """LP action on exit request (approve/reject)."""
        exit_request = self.get_object()

        # Verify LP owns this request
        if not hasattr(request.user, 'liquidity_provider_profile'):
            return Response(
                create_error_response(message='You are not a liquidity provider'),
                status=status.HTTP_403_FORBIDDEN
            )

        lp = request.user.liquidity_provider_profile
        if exit_request.liquidity_provider != lp:
            return Response(
                create_error_response(message='This is not your exit request'),
                status=status.HTTP_403_FORBIDDEN
            )

        if exit_request.status not in [ExitRequestStatus.PENDING, ExitRequestStatus.UNDER_REVIEW]:
            return Response(
                create_error_response(message='Exit request is not pending'),
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ExitRequestLPActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response(message='Validation failed', errors=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )

        action = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')

        if action == 'approve':
            offered_price = serializer.validated_data['offered_price_per_unit']
            exit_request.approve(offered_price_per_unit=offered_price, notes=notes)
            message = 'Exit request approved. Waiting for investor to accept the offer.'
        else:
            exit_request.reject(notes=notes)
            message = 'Exit request rejected.'

        return Response(create_success_response(message=message))

    @action(detail=True, methods=['post'])
    def investor_action(self, request, pk=None):
        """Investor action on exit request (accept/decline/cancel)."""
        exit_request = self.get_object()

        # Verify investor owns this request
        if exit_request.investor != request.user:
            return Response(
                create_error_response(message='This is not your exit request'),
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ExitRequestInvestorActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                create_error_response(message='Validation failed', errors=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )

        action = serializer.validated_data['action']

        if action == 'cancel':
            if exit_request.status in [ExitRequestStatus.COMPLETED]:
                return Response(
                    create_error_response(message='Cannot cancel completed request'),
                    status=status.HTTP_400_BAD_REQUEST
                )
            exit_request.cancel()
            message = 'Exit request cancelled.'

        elif action == 'accept':
            if exit_request.status != ExitRequestStatus.APPROVED:
                return Response(
                    create_error_response(message='No offer to accept'),
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check expiry
            if exit_request.expires_at and exit_request.expires_at < timezone.now():
                exit_request.status = ExitRequestStatus.EXPIRED
                exit_request.save()
                return Response(
                    create_error_response(message='Offer has expired'),
                    status=status.HTTP_400_BAD_REQUEST
                )

            exit_request.accept_offer()

            # Create the transaction
            self._complete_exit_transaction(exit_request)
            message = 'Offer accepted. Transaction completed.'

        elif action == 'decline':
            if exit_request.status != ExitRequestStatus.APPROVED:
                return Response(
                    create_error_response(message='No offer to decline'),
                    status=status.HTTP_400_BAD_REQUEST
                )
            exit_request.decline_offer()
            message = 'Offer declined. Exit request cancelled.'

        return Response(create_success_response(message=message))

    def _complete_exit_transaction(self, exit_request):
        """Complete the exit transaction after investor accepts offer."""
        lp = exit_request.liquidity_provider

        # Calculate fee (e.g., 1% platform fee)
        platform_fee_rate = Decimal('0.01')
        platform_fee = exit_request.total_offered_amount * platform_fee_rate
        net_to_investor = exit_request.total_offered_amount - platform_fee

        # Create transaction record
        transaction = LiquidityTransaction.objects.create(
            exit_request=exit_request,
            liquidity_provider=lp,
            investor=exit_request.investor,
            units_purchased=exit_request.units_requested,
            price_per_unit=exit_request.offered_price_per_unit,
            total_amount=exit_request.total_offered_amount,
            platform_fee=platform_fee,
            net_amount_to_investor=net_to_investor
        )

        # Update exit request status
        exit_request.status = ExitRequestStatus.COMPLETED
        exit_request.save()

        # Update LP monthly total
        lp.current_month_total += exit_request.total_offered_amount
        lp.save()

        # Update investment (reduce tokens)
        investment = exit_request.investment
        investment.token_amount -= exit_request.units_requested
        if investment.token_amount <= 0:
            investment.status = 'exited'
        investment.save()

        return transaction


# ============================================================================
# Transaction Views
# ============================================================================

class LiquidityTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing liquidity transactions."""

    queryset = LiquidityTransaction.objects.all()
    serializer_class = LiquidityTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # LP sees their transactions
        if hasattr(user, 'liquidity_provider_profile') and user.liquidity_provider_profile:
            return LiquidityTransaction.objects.filter(
                liquidity_provider=user.liquidity_provider_profile
            )

        # Admin sees all
        if user.is_staff or user.role == 'admin':
            return LiquidityTransaction.objects.all()

        # Regular user sees their own
        return LiquidityTransaction.objects.filter(investor=user)

    @action(detail=False, methods=['get'])
    def my_transactions(self, request):
        """Get current user's LP transactions (as investor)."""
        queryset = LiquidityTransaction.objects.filter(investor=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(data=serializer.data))
