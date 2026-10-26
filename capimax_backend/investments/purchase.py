"""
One purchase path for every payment method (PropShare model).

  * The server prices the purchase. The client sends the property, the
    amount, the method and the share price it showed; a different price now
    is refused with PRICE_CHANGED so nobody buys at a price they didn't see.
  * Shares = floor(amount / share price), and they must be worth at least the
    property's minimum investment.
  * Purchase fee (admin setting, snapshotted) is paid by the buyer on top.
  * Wallet: one atomic step — shares + fee debited, the purchase completed.
  * Card / Pronova / crypto: the shares are held for 30 minutes while the
    buyer pays on the provider's page; only the provider's confirmation
    completes it (payments.settlement). Pronova is charged on card with the
    Pronova discount (platform-funded; the property books the full price).
  * Bank transfer / Nova Sukuk: the shares are held with no time limit until
    an admin reviews the transfer / certificate.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal
from typing import Optional

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

CENT = Decimal('0.01')
HUNDRED = Decimal('100')
RESERVATION_TTL = timedelta(minutes=30)
# Bank transfer / Nova Sukuk: time to upload the document; once it is in,
# the shares stay held until an admin reviews it.
DOCUMENT_TTL = timedelta(hours=24)

WALLET = 'wallet'
# Reinvest (PropShare model): rental returns in the wallet buy shares at a
# discount on the share price (admin setting, 5% by default), no purchase fee.
REINVEST = 'reinvest'
WALLET_METHODS = (WALLET, REINVEST)
DIRECT_METHODS = ('card', 'crypto', 'pronova')
REVIEW_METHODS = ('bank', 'nova_sukuk')
ALL_METHODS = WALLET_METHODS + DIRECT_METHODS + REVIEW_METHODS

# Purchase method → Payment.payment_method
PAYMENT_METHOD_CODE = {
    'wallet': 'wallet',
    'reinvest': 'wallet',
    'card': 'credit_card',
    'pronova': 'pronova',
    'crypto': 'cryptocurrency',
    'bank': 'bank_transfer',
    'nova_sukuk': 'nova_sukuk',
}


class PurchaseError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: Optional[dict] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}


def _q(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------- availability
def reserved_shares(prop, exclude_investment=None) -> int:
    """Shares held for purchases that are still being paid / reviewed."""
    from .models import TokenReservation

    now = timezone.now()
    qs = TokenReservation.objects.filter(property_investment=prop, released=False).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now))
    if exclude_investment is not None:
        qs = qs.exclude(investment=exclude_investment)
    return qs.aggregate(n=Sum('token_amount'))['n'] or 0


def available_shares(prop, exclude_investment=None) -> int:
    return max(0, int(prop.total_tokens) - int(prop.tokens_sold) - reserved_shares(prop, exclude_investment))


# --------------------------------------------------------------------- quote
@dataclass
class Quote:
    shares: int
    unit_price: Decimal
    subtotal: Decimal
    platform_fee: Decimal
    platform_fee_pct: Decimal
    discount: Decimal
    discount_pct: Decimal
    total: Decimal

    def as_dict(self) -> dict:
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in self.__dict__.items()}


def minimum_error(prop) -> PurchaseError:
    unit = Decimal(prop.token_price)
    minimum = max(Decimal(prop.minimum_investment or 0), unit)
    min_shares = int((minimum / unit).to_integral_value(rounding=ROUND_CEILING))
    return PurchaseError(
        'AMOUNT_TOO_LOW',
        f'The minimum for this property is ${unit * min_shares:,.2f} '
        f'({min_shares} whole share{"" if min_shares == 1 else "s"} at ${unit:,.2f} each). '
        'Amounts are rounded down to whole shares.',
        status=422,
        details={'minimum_amount': str(unit * min_shares), 'unit_price': str(unit), 'minimum_shares': min_shares},
    )


def price_quote(prop, amount, method: str, rates: Optional[dict] = None) -> Quote:
    """Server-side money math from the amount the buyer entered."""
    from payments.models import PlatformFeeSettings

    rates = rates or PlatformFeeSettings.current().rates()
    unit = Decimal(prop.token_price)
    if unit <= 0:
        raise PurchaseError('INVALID_PROPERTY', 'This property has no share price.', 409)
    amount = _q(Decimal(str(amount)))
    if method == REINVEST:
        pct = Decimal(rates['reinvest_discount_pct'])
        effective = _q(unit * (HUNDRED - pct) / HUNDRED)
        shares = int(amount // effective) if effective > 0 else 0
        if shares < 1 or unit * shares < Decimal(prop.minimum_investment or 0):
            raise minimum_error(prop)
        subtotal = _q(unit * shares)
        total = _q(effective * shares)
        return Quote(shares=shares, unit_price=unit, subtotal=subtotal, platform_fee=Decimal('0.00'),
                     platform_fee_pct=Decimal('0'), discount=_q(subtotal - total), discount_pct=pct, total=total)
    shares = int(amount // unit)
    if shares < 1 or unit * shares < Decimal(prop.minimum_investment or 0):
        raise minimum_error(prop)
    subtotal = _q(unit * shares)
    fee_pct = Decimal(rates['platform_fee_pct'])
    fee = _q(subtotal * fee_pct / HUNDRED)
    total = _q(subtotal + fee)
    discount_pct = Decimal(rates['pronova_discount_pct']) if method == 'pronova' else Decimal('0')
    discount = _q(total * discount_pct / HUNDRED) if discount_pct else Decimal('0.00')
    return Quote(shares=shares, unit_price=unit, subtotal=subtotal, platform_fee=fee,
                 platform_fee_pct=fee_pct, discount=discount, discount_pct=discount_pct,
                 total=_q(total - discount))


def reinvestable_returns(user, exclude_investment=None) -> Decimal:
    """
    Returns the member can still reinvest at the discount: rental returns
    credited to the wallet, less what was already reinvested, never more than
    the wallet balance. Deposited money does not qualify.
    """
    from django.db.models import Sum

    from payments.models import WalletBalance, WalletTransaction

    from .models import Investment

    earned = WalletTransaction.objects.filter(user=user, transaction_type='dividend', amount__gt=0)         .aggregate(s=Sum('amount'))['s'] or Decimal('0')
    used_qs = Investment.objects.filter(user=user, purchase_method=REINVEST).exclude(
        status__in=['failed', 'cancelled', 'refunded', 'expired'])
    if exclude_investment is not None:
        used_qs = used_qs.exclude(pk=exclude_investment.pk)
    used = used_qs.aggregate(s=Sum('total_charged'))['s'] or Decimal('0')
    wallet = WalletBalance.objects.filter(user=user, currency='USD').first()
    available = wallet.available_balance if wallet else Decimal('0')
    return _q(max(Decimal('0'), min(Decimal(earned) - Decimal(used), available)))


def check_open(prop, expected_unit_price=None) -> None:
    from properties.payment_plan import allows_cash

    if not prop.is_published or prop.status not in ('active', 'tokenized'):
        raise PurchaseError('PROPERTY_NOT_OPEN', 'This property is not open for ownership.', 409)
    if not allows_cash(prop):
        raise PurchaseError('INSTALLMENTS_ONLY',
                            'This property is bought through its installment plan, not paid in full.', 409)
    if expected_unit_price not in (None, ''):
        try:
            seen = _q(Decimal(str(expected_unit_price)))
        except Exception:  # noqa: BLE001
            seen = None
        now = _q(Decimal(prop.token_price))
        if seen != now:
            raise PurchaseError(
                'PRICE_CHANGED',
                f'The share price of this property is now ${now:,.2f}. Review the new amounts and confirm again.',
                409, {'unit_price': str(now)})


def quote_for(prop, amount, method: str, expected_unit_price=None) -> Quote:
    """Quote shown before confirming (no locks, nothing held)."""
    if method not in ALL_METHODS:
        raise PurchaseError('INVALID_METHOD', 'Choose a payment method.', 422)
    check_open(prop, expected_unit_price)
    quote = price_quote(prop, amount, method)
    available = available_shares(prop)
    if quote.shares > available:
        raise PurchaseError('INSUFFICIENT_SHARES', 'Not enough shares remain for this amount.', 409,
                            {'available_shares': available, 'requested': quote.shares})
    return quote


# -------------------------------------------------------------------- create
def create_purchase(user, *, property_id, amount, method: str, expected_unit_price=None,
                    idempotency_key: Optional[str] = None, extra_metadata: Optional[dict] = None) -> dict:
    """
    Create a purchase. Returns {'investment', 'payment', 'quote', 'next'} where
    next is 'done' (wallet), 'checkout' (card / Pronova / crypto) or 'review'
    (bank transfer / Nova Sukuk).
    """
    from payments.models import Payment, PlatformFeeSettings, WalletBalance
    from properties.models import Property

    from .models import Investment, InvestmentStatus, TokenReservation
    from .services import InvestmentProcessingService

    if method not in ALL_METHODS:
        raise PurchaseError('INVALID_METHOD', 'Choose a payment method.', 422)

    if idempotency_key:
        existing = Investment.objects.filter(idempotency_key=idempotency_key, user=user).first()
        if existing is not None:
            payment = Payment.objects.filter(investment=existing).order_by('-created_at').first()
            return {'investment': existing, 'payment': payment, 'quote': None,
                    'next': 'done' if existing.status == InvestmentStatus.COMPLETED else
                    ('review' if existing.purchase_method in REVIEW_METHODS else 'checkout')}

    if method in DIRECT_METHODS:
        from payments.providers import provider_configured
        if not provider_configured(method):
            raise PurchaseError('PAYMENTS_NOT_CONFIGURED', 'This payment method is not available right now.', 503)

    with transaction.atomic():
        try:
            prop = Property.objects.select_for_update().get(pk=property_id)
        except Property.DoesNotExist:
            raise PurchaseError('NOT_FOUND', 'Property not found.', 404)
        check_open(prop, expected_unit_price)
        fee_settings = PlatformFeeSettings.current()
        rates = fee_settings.rates()
        quote = price_quote(prop, amount, method, rates)
        available = available_shares(prop)
        if quote.shares > available:
            raise PurchaseError('INSUFFICIENT_SHARES', 'Not enough shares remain for this amount.', 409,
                                {'available_shares': available, 'requested': quote.shares})

        snapshot = {
            'platform_fee_pct': str(rates['platform_fee_pct']),
            'management_fee_pct': str(rates['management_fee_pct']),
        }
        if quote.discount:
            snapshot.update({'pronova_discount_pct': str(quote.discount_pct),
                             'pronova_discount_amount': str(quote.discount)})

        inv = Investment.objects.create(
            user=user,
            property_investment=prop,
            token_amount=quote.shares,
            investment_amount=quote.subtotal,
            status=InvestmentStatus.PENDING,
            purchase_method=method,
            unit_price_snapshot=quote.unit_price,
            platform_fee_amount=quote.platform_fee,
            platform_fee_rate=rates['platform_fee_pct'],
            management_fee_rate=rates['management_fee_pct'],
            total_charged=quote.total,
            fee_settings_snapshot=snapshot,
            idempotency_key=idempotency_key or None,
            payment_method={'type': method},
        )

        if method in WALLET_METHODS:
            WalletBalance.objects.get_or_create(user=user, currency='USD',
                                                defaults={'available_balance': Decimal('0.00')})
            wallet = WalletBalance.objects.select_for_update().get(user=user, currency='USD')
            if method == REINVEST:
                returns = reinvestable_returns(user, exclude_investment=inv)
                if returns < quote.total:
                    raise PurchaseError(
                        'NOT_ENOUGH_RETURNS',
                        f'You have ${returns:,.2f} of returns to reinvest; this costs ${quote.total:,.2f}.',
                        409, {'returns': str(returns), 'required': str(quote.total)})
            if wallet.available_balance < quote.total:
                raise PurchaseError(
                    'INSUFFICIENT_FUNDS',
                    f'Your wallet balance is ${wallet.available_balance:,.2f}; this purchase costs '
                    f'${quote.total:,.2f}. Add funds or choose another payment method.',
                    409, {'required': str(quote.total), 'available': str(wallet.available_balance)})
            if method == REINVEST:
                WalletBalance.debit(user, quote.total, transaction_type='investment', reference_id=inv.id,
                                    description=f'Reinvest — {quote.shares} shares of {prop.title} '
                                                f'({quote.discount_pct}% off)')
            else:
                WalletBalance.debit(user, quote.subtotal, transaction_type='investment', reference_id=inv.id,
                                    description=f'{quote.shares} shares of {prop.title}')
            if quote.platform_fee:
                WalletBalance.debit(user, quote.platform_fee, transaction_type='fee', reference_id=inv.id,
                                    description=f'Purchase fee ({quote.platform_fee_pct}%) — {prop.title}')
            payment = Payment.objects.create(
                user=user, investment=inv, amount=quote.total,
                net_amount=quote.total if method == REINVEST else quote.subtotal,
                processing_fee=quote.platform_fee, currency='USD', payment_method='wallet',
                status='completed', completed_at=timezone.now(),
                metadata={'purpose': 'investment', 'quote': quote.as_dict(), **(extra_metadata or {})},
            )
            inv.payment_method = {'type': method, 'payment_id': str(payment.id)}
            inv.save(update_fields=['payment_method'])
            InvestmentProcessingService.process_investment(inv, payment)
            inv.refresh_from_db()
            return {'investment': inv, 'payment': payment, 'quote': quote, 'next': 'done'}

        # Direct pay / review: hold the shares.
        expires = timezone.now() + (RESERVATION_TTL if method in DIRECT_METHODS else DOCUMENT_TTL)
        TokenReservation.objects.create(user=user, property_investment=prop, token_amount=quote.shares,
                                        expires_at=expires, investment=inv)
        inv.reserved_until = expires
        inv.save(update_fields=['reserved_until'])
        payment = Payment.objects.create(
            user=user, investment=inv, amount=quote.total, net_amount=quote.total,
            currency='USD', payment_method=PAYMENT_METHOD_CODE[method], status='pending',
            metadata={'purpose': 'investment', 'quote': quote.as_dict(), 'investment_id': str(inv.id),
                      'provider': 'stripe' if method in ('card', 'pronova') else
                      ('nowpayments' if method == 'crypto' else 'manual'),
                      **(extra_metadata or {})},
        )
        inv.payment_method = {'type': method, 'payment_id': str(payment.id)}
        inv.save(update_fields=['payment_method'])
        return {'investment': inv, 'payment': payment, 'quote': quote,
                'next': 'checkout' if method in DIRECT_METHODS else 'review'}


# ------------------------------------------------------------------- holds
def release_hold(inv, *, status: str) -> None:
    """Return the held shares to sale and close the purchase (expired / rejected)."""
    inv.reservations.filter(released=False).update(released=True)
    if inv.status not in ('completed', 'pending_mint', 'minting', 'payment_confirmed'):
        inv.status = status
        inv.save(update_fields=['status', 'updated_at'])


def expire_reservations(now=None) -> int:
    """Purchases not paid (card / Pronova / crypto) or with no document sent (bank / Sukuk) in time."""
    from payments.models import Payment

    from .models import Investment, InvestmentStatus

    now = now or timezone.now()
    count = 0
    for inv in Investment.objects.filter(status=InvestmentStatus.PENDING, reserved_until__lte=now,
                                         purchase_method__in=DIRECT_METHODS + REVIEW_METHODS):
        with transaction.atomic():
            locked = Investment.objects.select_for_update().get(pk=inv.pk)
            if locked.status != InvestmentStatus.PENDING:
                continue
            release_hold(locked, status=InvestmentStatus.EXPIRED)
            Payment.objects.filter(investment=locked, status='pending').update(status='cancelled')
            count += 1
    return count


def late_payment(inv, payment) -> str:
    """
    A payment that arrived after the hold expired. Re-take the shares if they
    are still free at the same price; otherwise refund the money to the wallet.
    Returns 'completed' or 'refunded'.
    """
    from payments.models import WalletBalance
    from properties.models import Property

    from .models import InvestmentStatus, TokenReservation
    from .services import InvestmentProcessingService

    prop = Property.objects.select_for_update().get(pk=inv.property_investment_id)
    same_price = inv.unit_price_snapshot is None or _q(prop.token_price) == _q(inv.unit_price_snapshot)
    if same_price and available_shares(prop, exclude_investment=inv) >= inv.token_amount:
        TokenReservation.objects.create(user=inv.user, property_investment=prop,
                                        token_amount=inv.token_amount, expires_at=None, investment=inv)
        inv.status = InvestmentStatus.PENDING
        inv.save(update_fields=['status', 'updated_at'])
        InvestmentProcessingService.process_investment(inv, payment)
        inv.reservations.filter(released=False).update(released=True)
        return 'completed'
    WalletBalance.credit(inv.user, payment.amount, transaction_type='refund', reference_id=payment.id,
                         description=f'Refund: payment for {prop.title} arrived after the shares were released')
    inv.status = InvestmentStatus.REFUNDED
    inv.save(update_fields=['status', 'updated_at'])
    return 'refunded'
