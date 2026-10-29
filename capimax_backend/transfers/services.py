"""
Transfer rules (Capimax BRX's transfer, on RT's ledger and custody).

create()          sender sends shares of a property or wallet money to an email.
                  Money is debited at once (amount + fee); shares are set aside
                  (they cannot be listed, offered or sent twice).
deliver()         on the delivery date: if the recipient has an account with
                  verified email and identity, the money is credited / the shares
                  move (oldest holdings first, cost basis moves with them) and the
                  tokens move on-chain; otherwise the transfer waits and the
                  recipient is invited, for TRANSFER_CLAIM_DAYS.
release_waiting() runs when someone's identity is approved: their waiting
                  transfers are delivered.
cancel() / expire  the sender gets everything back.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import OPEN, Transfer, TransferAsset, TransferStatus

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
MAX_DAYS_AHEAD = 365


def claim_days() -> int:
    return int(getattr(settings, 'TRANSFER_CLAIM_DAYS', 30))


def fee_percent() -> Decimal:
    return Decimal(str(getattr(settings, 'TRANSFER_FEE_PERCENT', '0')))


class TransferError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def recipient_ready(user) -> bool:
    return bool(user and user.is_active and user.is_verified and user.is_kyc_verified())


def _find_user(email):
    from accounts.models import User
    return User.objects.filter(email__iexact=(email or '').strip()).first()


def unit_cost(user, prop) -> Decimal:
    """The sender's average cost per share of this property (it becomes the recipient's cost basis)."""
    from django.db.models import Sum

    from investments.models import Investment, InvestmentStatus

    agg = Investment.objects.filter(user=user, property_investment=prop, status=InvestmentStatus.COMPLETED,
                                    token_amount__gt=0).aggregate(units=Sum('token_amount'),
                                                                  cost=Sum('investment_amount'))
    if not agg['units']:
        return Decimal('0')
    return (Decimal(agg['cost'] or 0) / Decimal(agg['units'])).quantize(Decimal('0.0001'))


def giftable(user) -> dict:
    """What the user can send right now."""
    from investments.models import Investment, InvestmentStatus
    from marketplace.share_moves import free_shares
    from payments.models import WalletBalance

    props = {}
    for inv in (Investment.objects.filter(user=user, status=InvestmentStatus.COMPLETED, token_amount__gt=0)
                .select_related('property_investment')):
        props[inv.property_investment_id] = inv.property_investment
    rows = []
    for prop in props.values():
        free = free_shares(user, prop)
        if free > 0:
            rows.append({'property_id': str(prop.pk), 'title': prop.title, 'free_units': free,
                         'unit_cost': str(unit_cost(user, prop))})
    wb = WalletBalance.objects.filter(user=user, currency='USD').first()
    return {'properties': rows, 'balance': str(wb.available_balance if wb else Decimal('0.00')),
            'fee_percent': str(fee_percent()), 'claim_days': claim_days()}


def create(sender, *, asset: str, recipient_email: str, recipient_name: str = '', message: str = '',
           deliver_on=None, property_id=None, units: int = 0, amount=None) -> Transfer:
    from marketplace.settlement import TradeSettlementError, _check_custody
    from marketplace.share_moves import free_shares
    from payments.models import WalletBalance
    from properties.models import Property

    today = timezone.localdate()
    deliver_on = deliver_on or today
    email = (recipient_email or '').strip().lower()
    if not sender.is_verified:
        raise TransferError('EMAIL_NOT_VERIFIED', 'Verify your email address before sending a transfer.')
    if not email or '@' not in email:
        raise TransferError('RECIPIENT_REQUIRED', "Enter the recipient's email address.")
    if email == (sender.email or '').lower():
        raise TransferError('SELF_TRANSFER', 'You cannot send a transfer to yourself.')
    if deliver_on < today or deliver_on > today + timedelta(days=MAX_DAYS_AHEAD):
        raise TransferError('BAD_DATE', 'Choose a delivery date between today and one year from now.')

    with transaction.atomic():
        t = Transfer(sender=sender, asset=asset, recipient_email=email, recipient_name=recipient_name[:150],
                     message=(message or '')[:500], deliver_on=deliver_on, recipient=_find_user(email))
        if asset == TransferAsset.UNITS:
            prop = Property.objects.filter(pk=property_id).first() if property_id else None
            if prop is None:
                raise TransferError('PROPERTY_REQUIRED', 'Choose the property whose shares you send.')
            units = int(units or 0)
            if units < 1:
                raise TransferError('UNITS_REQUIRED', 'Enter how many shares to send.')
            # lock the sender's holdings of this property while checking what is free
            from investments.models import Investment
            list(Investment.objects.select_for_update().filter(user=sender, property_investment=prop))
            free = free_shares(sender, prop)
            if units > free:
                raise TransferError('NOT_ENOUGH_SHARES', f'You can send up to {free} share(s) of {prop.title} — '
                                                         f'the rest are listed, offered or already being sent.')
            try:
                _check_custody(sender, prop, units)
            except TradeSettlementError as exc:
                raise TransferError(exc.code, exc.message) from exc
            t.property_ref, t.units = prop, units
            t.amount = (unit_cost(sender, prop) * units).quantize(CENT, rounding=ROUND_HALF_UP)
            t.fee_amount = (t.amount * fee_percent() / 100).quantize(CENT)
            t.save()
            if t.fee_amount > 0:
                _debit(sender, t.fee_amount, t, f'Transfer fee {t.reference}')
        elif asset == TransferAsset.CASH:
            amount = Decimal(str(amount or 0)).quantize(CENT)
            if amount <= 0:
                raise TransferError('AMOUNT_REQUIRED', 'Enter the amount to send.')
            t.amount = amount
            t.fee_amount = (amount * fee_percent() / 100).quantize(CENT)
            t.save()
            _debit(sender, amount + t.fee_amount, t, f'Transfer {t.reference} to {email}')
        else:
            raise TransferError('BAD_ASSET', 'Choose shares or wallet balance.')

        if deliver_on <= today:
            transaction.on_commit(lambda: _deliver_quietly(t.pk))
    return t


def _debit(user, amount, t, description):
    from payments.models import WalletBalance
    try:
        WalletBalance.debit(user, amount, transaction_type='transfer_sent', reference_id=t.pk,
                            description=description)
    except ValueError as exc:
        raise TransferError('INSUFFICIENT_FUNDS', 'Your wallet balance does not cover this transfer.') from exc


def _deliver_quietly(pk) -> None:
    try:
        deliver(Transfer.objects.get(pk=pk))
    except Exception:  # noqa: BLE001 — the hourly task tries again
        logger.exception('Transfer %s could not be delivered now', pk)


def deliver(t: Transfer) -> str:
    """Deliver an open transfer that is due. Returns its status afterwards."""
    from marketplace.share_moves import ShareMoveError, held_shares, move_holdings
    from payments.models import WalletBalance

    with transaction.atomic():
        t = Transfer.objects.select_for_update().select_related('sender', 'property_ref').get(pk=t.pk)
        if t.status not in OPEN or t.deliver_on > timezone.localdate():
            return t.status
        recipient = t.recipient or _find_user(t.recipient_email)
        if recipient is not None and t.recipient_id != recipient.pk:
            t.recipient = recipient
            t.save(update_fields=['recipient', 'updated_at'])
        if recipient is not None and recipient.pk == t.sender_id:
            _close(t, TransferStatus.FAILED, 'The recipient is the sender.')
            return t.status
        if not recipient_ready(recipient):
            if t.status == TransferStatus.SCHEDULED:
                t.status = TransferStatus.WAITING
                t.expires_at = timezone.now() + timedelta(days=claim_days())
                t.save(update_fields=['status', 'expires_at', 'updated_at'])
                transaction.on_commit(lambda: _notices_waiting(t))
            return t.status

        if t.asset == TransferAsset.CASH:
            WalletBalance.credit(recipient, t.amount, transaction_type='transfer_received', reference_id=t.pk,
                                 description=f'Transfer {t.reference} from {t.sender.email}')
        else:
            if held_shares(t.sender, t.property_ref) < t.units:
                _close(t, TransferStatus.FAILED, 'The sender no longer holds these shares.')
                return t.status
            try:
                move_holdings(seller=t.sender, buyer=recipient, prop=t.property_ref, tokens=t.units,
                              buyer_cost=t.amount,
                              payment_method={'type': 'transfer', 'transfer_id': str(t.pk), 'from': t.sender.email})
            except ShareMoveError:
                _close(t, TransferStatus.FAILED, 'The sender no longer holds these shares.')
                return t.status
            from marketplace.chain_transfer import _contract_for
            t.chain_status = 'pending' if _contract_for(t.property_ref) else 'not_required'
        t.status = TransferStatus.DELIVERED
        t.delivered_at = timezone.now()
        t.save(update_fields=['status', 'delivered_at', 'chain_status', 'updated_at'])
        if t.chain_status == 'pending':
            transaction.on_commit(lambda: _queue_chain(t.pk))
        transaction.on_commit(lambda: _notices_delivered(t))
    return t.status


def _close(t: Transfer, status: str, reason: str) -> None:
    """Inside a transaction: end an open transfer and give the sender everything back."""
    from payments.models import WalletBalance

    refund = (t.amount if t.asset == TransferAsset.CASH else Decimal('0')) + t.fee_amount
    if refund > 0:
        WalletBalance.credit(t.sender, refund, transaction_type='transfer_returned', reference_id=t.pk,
                             description=f'Transfer {t.reference} returned ({reason})')
    t.status = status
    t.closed_at = timezone.now()
    t.close_reason = reason[:300]
    t.save(update_fields=['status', 'closed_at', 'close_reason', 'updated_at'])
    transaction.on_commit(lambda: _notices_returned(t))


def cancel(t: Transfer, user) -> Transfer:
    with transaction.atomic():
        t = Transfer.objects.select_for_update().get(pk=t.pk)
        if t.sender_id != user.pk:
            raise TransferError('NOT_YOURS', 'Only the sender can cancel this transfer.')
        if t.status not in OPEN:
            raise TransferError('NOT_OPEN', 'This transfer can no longer be cancelled.')
        _close(t, TransferStatus.CANCELLED, 'Cancelled by the sender')
    return t


def release_waiting(user) -> int:
    """The user's identity was approved: deliver what is waiting for them."""
    if not recipient_ready(user):
        return 0
    n = 0
    for t in Transfer.objects.filter(status__in=OPEN, recipient_email__iexact=user.email,
                                     deliver_on__lte=timezone.localdate()):
        if deliver(t) == TransferStatus.DELIVERED:
            n += 1
    return n


def process_due() -> dict:
    """Hourly: deliver what is due, remind waiting recipients 3 days before, return unclaimed transfers."""
    stats = {'delivered': 0, 'waiting': 0, 'expired': 0, 'reminded': 0}
    today, now = timezone.localdate(), timezone.now()
    for t in Transfer.objects.filter(status__in=OPEN, deliver_on__lte=today).order_by('created_at'):
        if t.status == TransferStatus.WAITING and t.expires_at and t.expires_at <= now:
            with transaction.atomic():
                locked = Transfer.objects.select_for_update().get(pk=t.pk)
                if locked.status == TransferStatus.WAITING:
                    _close(locked, TransferStatus.EXPIRED, f'Not claimed within {claim_days()} days')
                    stats['expired'] += 1
            continue
        status = deliver(t)
        stats['delivered' if status == TransferStatus.DELIVERED else 'waiting'] += 1
    for t in Transfer.objects.filter(status=TransferStatus.WAITING, reminded_at__isnull=True,
                                     expires_at__lte=now + timedelta(days=3), expires_at__gt=now):
        _invite(t, reminder=True)
        Transfer.objects.filter(pk=t.pk).update(reminded_at=now)
        stats['reminded'] += 1
    return stats


def _queue_chain(pk) -> None:
    try:
        from .tasks import transfer_tokens
        transfer_tokens.delay(str(pk))
    except Exception:  # noqa: BLE001 — the reconcile job picks it up
        logger.warning('Could not queue the on-chain move of transfer %s', pk, exc_info=True)


# ---------------------------------------------------------------- notices

def _what(t: Transfer) -> str:
    if t.asset == TransferAsset.UNITS:
        return f'{t.units} share(s) of {t.property_ref.title}'
    return f'${t.amount:,.2f}'


def _notice(user, title, message, url='/dashboard?view=transfers'):
    if user is None:
        return
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='investment', action_url=url,
                                                action_label='Transfers', send_email=True)
    except Exception:  # noqa: BLE001
        logger.warning('Transfer notice failed: %s', title, exc_info=True)


def _invite(t: Transfer, reminder: bool = False) -> None:
    """Tell the recipient what they must do to receive it."""
    site = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
    sender = t.sender.get_full_name() or t.sender.email
    note = f'\nMessage: "{t.message}"' if t.message else ''
    if t.recipient is None:
        from support.notify import _send
        _send(t.recipient_email, f'{"Reminder: " if reminder else ""}{sender} sent you {_what(t)} on Capimax RT',
              f'Hello{" " + t.recipient_name if t.recipient_name else ""},\n\n'
              f'{sender} sent you {_what(t)} on Capimax RT.{note}\n\n'
              f'To receive it, create your account with this email ({t.recipient_email}) and complete identity '
              f'verification before {t.expires_at:%d %b %Y}: {site}/register\n'
              f'After that date the transfer goes back to the sender.\n\nCapimax RT')
    else:
        _notice(t.recipient, f'{"Reminder: " if reminder else ""}{sender} sent you {_what(t)}',
                f'To receive it, complete your identity verification before {t.expires_at:%d %b %Y}. '
                f'After that date the transfer goes back to the sender.{note}', url='/kyc')


def _notices_waiting(t: Transfer) -> None:
    _invite(t)
    _notice(t.sender, 'Transfer waiting for the recipient',
            f'{_what(t)} to {t.recipient_email} ({t.reference}) waits until the recipient has a verified account. '
            f'If it is not claimed by {t.expires_at:%d %b %Y}, it comes back to you.')


def _notices_delivered(t: Transfer) -> None:
    sender = t.sender.get_full_name() or t.sender.email
    note = f'\nMessage: "{t.message}"' if t.message else ''
    _notice(t.recipient, 'You received a transfer',
            f'{sender} sent you {_what(t)} ({t.reference}).{note}',
            url='/dashboard?view=my-properties' if t.asset == TransferAsset.UNITS else '/dashboard?view=wallet')
    _notice(t.sender, 'Transfer delivered', f'{_what(t)} was delivered to {t.recipient_email} ({t.reference}).')


def _notices_returned(t: Transfer) -> None:
    _notice(t.sender, 'Transfer returned' if t.status != TransferStatus.CANCELLED else 'Transfer cancelled',
            f'{_what(t)} to {t.recipient_email} ({t.reference}) is back with you: {t.close_reason}.')
