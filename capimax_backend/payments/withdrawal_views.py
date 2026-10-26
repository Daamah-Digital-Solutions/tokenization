"""
Saved payout accounts, withdrawals to them, and a receipt for every wallet
ledger row (PropShare model).

  GET/POST     payout-accounts/                 list / save a bank account or crypto wallet
  PATCH/DELETE payout-accounts/<id>/            make default / delete
  GET/POST     withdrawals/                     my requests / ask (Idempotency-Key)
  GET          wallet/transactions/<id>/receipt/ the data of that row's receipt (PDF drawn on the site)
"""

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import create_error_response, create_success_response

from .models import BankWithdrawalRequest, PayoutAccount, WalletTransaction
from .serializers import BankWithdrawalRequestSerializer, PayoutAccountSerializer
from .withdrawals import WithdrawalError, request_withdrawal


def _error(exc: WithdrawalError) -> Response:
    body = create_error_response(exc.message, status_code=exc.status)
    body['error']['code'] = exc.code
    return Response(body, status=exc.status)


class PayoutAccountListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = PayoutAccount.objects.filter(user=request.user)
        return Response(create_success_response(data={'accounts': PayoutAccountSerializer(qs, many=True).data}))

    def post(self, request):
        serializer = PayoutAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(create_error_response('Check the account details.', status_code=422,
                                                  details=serializer.errors), status=422)
        kind = serializer.validated_data['kind']
        first = not PayoutAccount.objects.filter(user=request.user, kind=kind).exists()
        account = serializer.save(user=request.user, is_default=first)
        return Response(create_success_response(data=PayoutAccountSerializer(account).data),
                        status=status.HTTP_201_CREATED)


class PayoutAccountDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        account = get_object_or_404(PayoutAccount, pk=pk, user=request.user)
        if request.data.get('is_default'):
            with transaction.atomic():
                PayoutAccount.objects.filter(user=request.user, kind=account.kind).update(is_default=False)
                account.is_default = True
                account.save(update_fields=['is_default'])
        if 'label' in request.data:
            account.label = (request.data.get('label') or '').strip()[:100]
            account.save(update_fields=['label'])
        return Response(create_success_response(data=PayoutAccountSerializer(account).data))

    def delete(self, request, pk):
        account = get_object_or_404(PayoutAccount, pk=pk, user=request.user)
        was_default, kind = account.is_default, account.kind
        account.delete()  # open requests keep their own copy of the account
        if was_default:
            nxt = PayoutAccount.objects.filter(user=request.user, kind=kind).order_by('-created_at').first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=['is_default'])
        return Response(create_success_response(data={'deleted': str(pk)}))


class WithdrawalListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = BankWithdrawalRequest.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(create_success_response(data={
            'requests': BankWithdrawalRequestSerializer(qs, many=True).data}))

    def post(self, request):
        try:
            wd = request_withdrawal(
                request.user,
                payout_account_id=request.data.get('payout_account_id'),
                amount=request.data.get('amount'),
                idempotency_key=request.headers.get('Idempotency-Key') or request.data.get('idempotency_key'),
                notes=request.data.get('notes') or '',
            )
        except WithdrawalError as exc:
            return _error(exc)
        return Response(create_success_response(data=BankWithdrawalRequestSerializer(wd).data),
                        status=status.HTTP_201_CREATED)


def receipt_number(row) -> str:
    return f'RC-{row.created_at:%Y%m%d}-{row.pk.hex[:8].upper()}'


class WalletReceiptView(APIView):
    """The numbered receipt of one wallet ledger row (the site draws the PDF)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from documents.statements import holder_for

        row = get_object_or_404(WalletTransaction, pk=pk, user=request.user)
        data = {
            'number': receipt_number(row),
            'id': str(row.pk),
            'type': row.transaction_type,
            'amount': str(row.amount),
            'currency': row.currency,
            'balance_before': str(row.balance_before),
            'balance_after': str(row.balance_after),
            'description': row.description,
            'created_at': row.created_at.isoformat(),
            'reference_id': str(row.reference_id) if row.reference_id else None,
            'holder': holder_for(request.user),
            'related': _related(row),
        }
        return Response(create_success_response(data=data))


def _related(row) -> dict:
    """What the row was for, when we can tell: a withdrawal, a payment, a purchase."""
    if not row.reference_id:
        return {}
    wd = BankWithdrawalRequest.objects.filter(pk=row.reference_id, user=row.user).first()
    if wd is not None:
        return {'kind': 'withdrawal', 'reference': wd.reference or str(wd.pk)[:8],
                'destination': wd.destination_label or wd.bank_name, 'status': wd.status,
                'transfer_reference': wd.transfer_reference}
    from investments.models import Investment

    from .models import Payment
    inv = Investment.objects.filter(pk=row.reference_id, user=row.user).select_related('property_investment').first()
    payment = None
    if inv is None:
        payment = Payment.objects.filter(pk=row.reference_id, user=row.user).first()
        inv = payment.investment if payment and payment.investment_id else None
    out = {}
    if payment is not None:
        out.update({'kind': 'payment', 'payment_method': payment.payment_method,
                    'reference': str(payment.pk)[:8].upper()})
    if inv is not None:
        out.update({'kind': out.get('kind', 'investment'), 'property': inv.property_investment.title,
                    'shares': inv.token_amount})
    return out
