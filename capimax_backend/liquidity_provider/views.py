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
        # Creating needs an account: approval gives the LP dashboard to it
        if self.action in ['list', 'retrieve', 'approve', 'reject']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    @staticmethod
    def _latest(user):
        return LPApplication.objects.filter(applicant=user).order_by('-created_at').first()

    @classmethod
    def _block(cls, user):
        """``(code, message)`` when this account cannot send a new application, else None."""
        from accounts.models import UserRole
        if user.has_role(UserRole.LIQUIDITY_PROVIDER):
            return 'already_partner', 'This account is already a liquidity provider.'
        latest = cls._latest(user)
        if latest and latest.status in (LPApplicationStatus.PENDING, LPApplicationStatus.UNDER_REVIEW):
            return 'open_application', 'Your liquidity provider application is already under review.'
        return None

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """The signed-in account's LP status: has the role / last application."""
        from accounts.models import UserRole
        app = self._latest(request.user)
        return Response(create_success_response(data={
            'has_role': request.user.has_role(UserRole.LIQUIDITY_PROVIDER),
            'application': None if app is None else {
                'id': str(app.id),
                'status': app.status,
                'submitted_at': app.created_at,
                'reviewed_at': app.reviewed_at,
                'rejection_reason': app.rejection_reason or '',
            },
        }))

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

        blocked = self._block(request.user)
        if blocked:
            return Response(create_error_response(message=blocked[1], details={'code': blocked[0]}),
                            status=status.HTTP_400_BAD_REQUEST)
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
            with db_transaction.atomic():
                application = serializer.save(applicant=request.user)
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
        elif self.action in ['update', 'partial_update', 'my_profile', 'dashboard_stats', 'assets',
                           'statement']:
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

        from .market import open_market
        from .models import ExitOffer, ExitOfferStatus
        stats = {
            'open_market_requests': open_market(lp).count(),
            'open_offers': ExitOffer.objects.filter(liquidity_provider=lp, status=ExitOfferStatus.OPEN,
                                                    expires_at__gt=timezone.now()).count(),
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

    @action(detail=False, methods=['get'])
    def assets(self, request):
        """The shares this LP owns (bought from investors or otherwise), per property."""
        from .assets import lp_assets
        try:
            lp = request.user.liquidity_provider_profile
        except LiquidityProvider.DoesNotExist:
            return Response(
                create_error_response(message='You are not a liquidity provider'),
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(create_success_response(data=lp_assets(lp, request)))

    @action(detail=False, methods=['get'])
    def statement(self, request):
        """The LP's statement for a period (?from=YYYY-MM-DD&to=YYYY-MM-DD, default: this month)."""
        from datetime import date

        from .statement import lp_statement, period
        try:
            lp = request.user.liquidity_provider_profile
        except LiquidityProvider.DoesNotExist:
            return Response(create_error_response(message='You are not a liquidity provider'),
                            status=status.HTTP_404_NOT_FOUND)
        try:
            start = date.fromisoformat(request.query_params['from']) if request.query_params.get('from') else None
            end = date.fromisoformat(request.query_params['to']) if request.query_params.get('to') else None
        except ValueError:
            return Response(create_error_response(message='Dates must look like 2026-11-30.'),
                            status=status.HTTP_400_BAD_REQUEST)
        start, end = period(start, end)
        if (end - start).days > 366:
            return Response(create_error_response(message='Choose a period of one year at most.'),
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(create_success_response(data=lp_statement(lp, start, end)))

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
        """Create a new exit request (investor): to one provider, or to all (no provider)."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            exit_request = serializer.save()
            from .notify import exit_requested, investor_withdrew
            if serializer.withdrawn:  # sent again: the earlier request's providers are told it is withdrawn
                old, offers = serializer.withdrawn
                investor_withdrew(old, declined=False, offers=offers)
            exit_requested(exit_request)
            return Response(
                create_success_response(
                    data={'id': str(exit_request.id)},
                    message=('Sale request sent to all liquidity providers. Their offers will appear here.'
                             if exit_request.is_open_to_all else
                             'Exit request submitted. The liquidity provider will review your request.')
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
            message = 'Offer sent. The investor can accept it until ' \
                      f'{exit_request.expires_at:%Y-%m-%d %H:%M} UTC.'
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
        from .market import accept_offer, close_request, decline_offer
        from .models import ExitOffer
        from .settlement import ExitSettlementError

        if exit_request.is_open_to_all and action in ('accept', 'decline'):
            # Open request: the investor answers one provider's offer
            offer = ExitOffer.objects.filter(pk=serializer.validated_data.get('offer'),
                                             exit_request=exit_request).first()
            if offer is None:
                return Response(create_error_response(message='Choose the offer to answer.'),
                                status=status.HTTP_400_BAD_REQUEST)
            try:
                if action == 'accept':
                    tx = accept_offer(exit_request, offer)
                    return Response(create_success_response(
                        data={'reference': tx.reference_number, 'amount': str(tx.total_amount)},
                        message='Offer accepted. The amount was added to your wallet.'))
                decline_offer(exit_request, offer)
            except ExitSettlementError as exc:
                return Response(create_error_response(message=exc.message, details={'code': exc.code}),
                                status=status.HTTP_400_BAD_REQUEST)
            return Response(create_success_response(message='Offer declined. Your request stays open to the others.'))

        if action == 'cancel':
            if exit_request.status in [ExitRequestStatus.COMPLETED, ExitRequestStatus.CANCELLED,
                                       ExitRequestStatus.REJECTED, ExitRequestStatus.EXPIRED]:
                return Response(
                    create_error_response(message='Cannot cancel completed request'),
                    status=status.HTTP_400_BAD_REQUEST
                )
            offers = close_request(exit_request, ExitRequestStatus.CANCELLED)
            from .notify import investor_withdrew
            investor_withdrew(exit_request, declined=False, offers=offers)
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
            from .settlement import settle_exit
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

    # ---- the liquidity market: requests open to all providers (round 5) ----

    def _provider(self, request):
        return getattr(request.user, 'liquidity_provider_profile', None)

    @action(detail=False, methods=['get'])
    def market(self, request):
        """Requests open to all providers that this provider can offer on (with its own offer, if any)."""
        from .market import open_market
        lp = self._provider(request)
        if lp is None:
            return Response(create_error_response(message='You are not a liquidity provider'),
                            status=status.HTTP_403_FORBIDDEN)
        serializer = ExitRequestSerializer(open_market(lp), many=True, context={'request': request})
        return Response(create_success_response(data=serializer.data))

    @action(detail=False, methods=['get'])
    def my_offers(self, request):
        """Every offer this provider made on open requests, newest first."""
        from .models import ExitOffer
        from .serializers import ExitOfferSerializer
        lp = self._provider(request)
        if lp is None:
            return Response(create_error_response(message='You are not a liquidity provider'),
                            status=status.HTTP_403_FORBIDDEN)
        offers = (ExitOffer.objects.filter(liquidity_provider=lp)
                  .select_related('liquidity_provider', 'exit_request__investment__property_investment')
                  .order_by('-created_at')[:200])
        rows = []
        for offer in offers:
            row = dict(ExitOfferSerializer(offer).data)
            er = offer.exit_request
            row.update({'exit_request': str(er.pk), 'property_name': er.investment.property_investment.title,
                        'units_requested': er.units_requested,
                        'requested_price_per_unit': str(er.requested_price_per_unit),
                        'request_status': er.status})
            rows.append(row)
        return Response(create_success_response(data=rows))

    @action(detail=True, methods=['post'])
    def make_offer(self, request, pk=None):
        """A provider sends (or improves) its offer on a request open to all providers."""
        from .market import make_offer
        from .serializers import ExitOfferCreateSerializer, ExitOfferSerializer
        from .settlement import ExitSettlementError
        lp = self._provider(request)
        if lp is None:
            return Response(create_error_response(message='You are not a liquidity provider'),
                            status=status.HTTP_403_FORBIDDEN)
        er = ExitRequest.objects.filter(pk=pk, liquidity_provider__isnull=True).first()
        if er is None:
            return Response(create_error_response(message='This request is not in the liquidity market.'),
                            status=status.HTTP_404_NOT_FOUND)
        data = ExitOfferCreateSerializer(data=request.data)
        if not data.is_valid():
            return Response(create_error_response(message='Validation failed', details=data.errors),
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            offer = make_offer(lp, er, data.validated_data['price_per_unit'], data.validated_data.get('notes', ''))
        except ExitSettlementError as exc:
            return Response(create_error_response(message=exc.message, details={'code': exc.code}),
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(create_success_response(
            data=ExitOfferSerializer(offer).data,
            message=f'Offer sent. The investor can accept it until {offer.expires_at:%Y-%m-%d %H:%M} UTC.'),
            status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def withdraw_offer(self, request, pk=None):
        """A provider takes back its open offer on a request."""
        from .market import withdraw_offer
        from .models import ExitOffer, ExitOfferStatus
        from .settlement import ExitSettlementError
        lp = self._provider(request)
        offer = (ExitOffer.objects.filter(exit_request_id=pk, liquidity_provider=lp, status=ExitOfferStatus.OPEN)
                 .first() if lp else None)
        if offer is None:
            return Response(create_error_response(message='You have no open offer on this request.'),
                            status=status.HTTP_404_NOT_FOUND)
        try:
            withdraw_offer(lp, offer)
        except ExitSettlementError as exc:
            return Response(create_error_response(message=exc.message, details={'code': exc.code}),
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(create_success_response(message='Offer withdrawn.'))


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
