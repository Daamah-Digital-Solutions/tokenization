"""
Views for Liquidity Provider module.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
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

    def has_object_permission(self, request, view, obj):
        # An LP may only change its OWN provider record (PATCH providers/<id>/
        # used to accept any id).
        if isinstance(obj, LiquidityProvider):
            return obj.user_id == request.user.pk
        return True


# ============================================================================
# LP Application Views
# ============================================================================

class LPApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for LP applications."""

    queryset = LPApplication.objects.all()
    serializer_class = LPApplicationSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # documents (client round 4, #14)

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
        """Submit a new LP application, with its documents, linked to the signed-in account."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import transaction as db_transaction

        from core.partner_documents import collect, fingerprint

        from .models import LPApplicationDocument
        from .notify import application_received

        try:
            files = collect(request)
        except DjangoValidationError as exc:
            return Response(create_error_response(message=' '.join(exc.messages),
                                                  details={'documents': exc.messages}),
                            status=status.HTTP_400_BAD_REQUEST)
        data = request.data
        if hasattr(data, 'getlist'):  # multipart: lists arrive as repeated keys
            data = {k: (data.getlist(k) if k == 'preferred_currencies' else data.get(k)) for k in data.keys()}
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            user = request.user if request.user.is_authenticated else None
            with db_transaction.atomic():
                application = serializer.save(applicant=user)
                for doc_type, f in files:
                    LPApplicationDocument.objects.create(
                        application=application, document_type=doc_type, file=f,
                        original_name=f.name[:255], size=f.size or 0, sha256=fingerprint(f))
            application_received(application)
            return Response(
                create_success_response(
                    data={'id': str(application.id)},
                    message='Application submitted successfully. We will review and contact you.'
                ),
                status=status.HTTP_201_CREATED
            )
        return Response(
            create_error_response(message='Validation failed', details=serializer.errors),
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

        if application.status not in (LPApplicationStatus.PENDING, LPApplicationStatus.UNDER_REVIEW):
            return Response(
                create_error_response(message='Application is not pending'),
                status=status.HTTP_400_BAD_REQUEST
            )
        from .notify import application_decided, missing_documents
        missing = missing_documents(application)
        if missing:
            return Response(create_error_response(
                message='Required documents are missing: ' + ', '.join(missing)), status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('notes', '')
        lp = application.approve(reviewer=request.user, notes=notes)
        application_decided(application)

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

        if application.status not in (LPApplicationStatus.PENDING, LPApplicationStatus.UNDER_REVIEW):
            return Response(
                create_error_response(message='Application is not pending'),
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        application.reject(reviewer=request.user, reason=reason)
        from .notify import application_decided
        application_decided(application)

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
        queryset = self.get_queryset().filter(status=LPStatus.ACTIVE, user__isnull=False).exclude(
            user=request.user)
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
        if getattr(self, 'swagger_fake_view', False):
            return ExitRequest.objects.none()
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
            from .notify import exit_requested
            exit_requested(exit_request)
            return Response(
                create_success_response(
                    data={'id': str(exit_request.id)},
                    message='Exit request submitted. The liquidity provider will review your request.'
                ),
                status=status.HTTP_201_CREATED
            )
        return Response(
            create_error_response(message='Validation failed', details=serializer.errors),
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
                create_error_response(message='Validation failed', details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )

        action = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')

        from .notify import offer_made, request_declined
        from .settlement import lp_can_pay
        if action == 'approve':
            offered_price = serializer.validated_data['offered_price_per_unit']
            total = offered_price * exit_request.units_requested
            if not lp.check_transaction_limit(total) or not lp.check_monthly_limit(total):
                return Response(create_error_response(
                    message='This offer is above your per-transaction or monthly limit.'),
                    status=status.HTTP_400_BAD_REQUEST)
            if not lp_can_pay(lp, total):
                return Response(create_error_response(
                    message='Your wallet balance does not cover this offer and its fee. Add funds first.',
                    details={'code': 'LP_INSUFFICIENT_FUNDS'}), status=status.HTTP_400_BAD_REQUEST)
            exit_request.approve(offered_price_per_unit=offered_price, notes=notes)
            offer_made(exit_request)
            message = 'Offer sent. The investor has 48 hours to accept it.'
        else:
            exit_request.reject(notes=notes)
            request_declined(exit_request)
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
                create_error_response(message='Validation failed', details=serializer.errors),
                status=status.HTTP_400_BAD_REQUEST
            )

        action = serializer.validated_data['action']

        if action == 'cancel':
            if exit_request.status in [ExitRequestStatus.COMPLETED, ExitRequestStatus.CANCELLED,
                                       ExitRequestStatus.REJECTED, ExitRequestStatus.EXPIRED]:
                return Response(
                    create_error_response(message='Cannot cancel completed request'),
                    status=status.HTTP_400_BAD_REQUEST
                )
            exit_request.cancel()
            from .notify import investor_withdrew
            investor_withdrew(exit_request, declined=False)
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

            # Money, shares and (then) tokens move now (client round 4, #13)
            from .settlement import ExitSettlementError, settle_exit
            try:
                tx = settle_exit(exit_request)
            except ExitSettlementError as exc:
                return Response(create_error_response(message=exc.message, details={'code': exc.code}),
                                status=status.HTTP_400_BAD_REQUEST)
            return Response(create_success_response(
                data={'reference': tx.reference_number, 'amount': str(tx.total_amount)},
                message='Offer accepted. The amount was added to your wallet.'))

        elif action == 'decline':
            if exit_request.status != ExitRequestStatus.APPROVED:
                return Response(
                    create_error_response(message='No offer to decline'),
                    status=status.HTTP_400_BAD_REQUEST
                )
            exit_request.decline_offer()
            from .notify import investor_withdrew
            investor_withdrew(exit_request, declined=True)
            message = 'Offer declined. Exit request cancelled.'

        return Response(create_success_response(message=message))

# ============================================================================
# Transaction Views
# ============================================================================

class LiquidityTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing liquidity transactions."""

    queryset = LiquidityTransaction.objects.all()
    serializer_class = LiquidityTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return LiquidityTransaction.objects.none()
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
