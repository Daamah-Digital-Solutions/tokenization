"""
Rent distributions, the PropShare way.

The admin records the rent actually collected for a property and a period
(RentDistribution, draft). Paying it:

  * splits the gross by the shares each owner holds — completed purchases
    (incl. shares bought on the secondary market) and fully paid installment
    plans — to the cent, the remainder cents going to the largest fractions;
  * takes the management fee from each owner's part: a yearly % (fixed on
    each purchase; the current admin rate when a holding has none) of the
    value they hold, for the length of the period (days / 365), never more
    than their part;
  * credits the net to each owner's wallet as a rental return ("dividend"
    ledger line — it can be reinvested at the discount) and tells them.

The fee is recorded as platform revenue on the distribution. A distribution
is paid once; it is recomputed at payment time so it uses who holds what then.
"""

from __future__ import annotations

import logging
from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
HUNDRED = Decimal('100')


class DistributionError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def holdings(prop) -> dict:
    """{user_id: {'shares': int, 'fee_base': yearly management fee in USD}} for the owners of a property."""
    from investments.models import Investment, InvestmentStatus
    from payments.models import PlatformFeeSettings
    from properties.models import ConstructionInstallment

    current = Decimal(PlatformFeeSettings.current().management_fee_pct)
    out: dict = {}

    def add(user_id, shares, value, rate):
        row = out.setdefault(user_id, {'shares': 0, 'fee_base': Decimal('0')})
        row['shares'] += int(shares)
        row['fee_base'] += Decimal(value or 0) * Decimal(rate) / HUNDRED

    for inv in Investment.objects.filter(property_investment=prop, status=InvestmentStatus.COMPLETED,
                                         token_amount__gt=0):
        rate = inv.management_fee_rate if inv.management_fee_rate is not None else current
        add(inv.user_id, inv.token_amount, inv.investment_amount, rate)
    # Fully paid installment plans own their shares (no Investment row for them).
    for plan in ConstructionInstallment.objects.filter(property_investment=prop, status='completed'):
        add(plan.investor_id, plan.token_allocation, plan.total_investment_amount, current)
    return out


def _split_cents(gross: Decimal, weights: dict) -> dict:
    """Split gross pro rata to the cent (largest remainder); the parts add up to gross exactly."""
    total_cents = int((gross * 100).to_integral_value(rounding=ROUND_DOWN))
    total_weight = sum(weights.values())
    raw = {k: Decimal(total_cents) * w / total_weight for k, w in weights.items()}
    parts = {k: int(v) for k, v in raw.items()}
    left = total_cents - sum(parts.values())
    for k in sorted(raw, key=lambda k: (raw[k] - parts[k], str(k)), reverse=True)[:left]:
        parts[k] += 1
    return {k: (Decimal(c) / 100).quantize(CENT) for k, c in parts.items()}


def build(dist) -> None:
    """(Re)compute the owners' parts of a draft distribution."""
    from properties.models import RentDistributionItem

    if dist.status == 'paid':
        raise DistributionError('ALREADY_PAID', 'This distribution was already paid.')
    owners = holdings(dist.property_investment)
    owners = {u: h for u, h in owners.items() if h['shares'] > 0}
    if not owners:
        raise DistributionError('NO_OWNERS', 'Nobody owns shares of this property yet.')
    gross_parts = _split_cents(Decimal(dist.gross_amount), {u: h['shares'] for u, h in owners.items()})
    fraction = Decimal(dist.period_days) / Decimal(365)

    dist.items.all().delete()
    total_fee = total_net = Decimal('0.00')
    for user_id, h in owners.items():
        gross = gross_parts[user_id]
        fee = min(gross, (h['fee_base'] * fraction).quantize(CENT, rounding=ROUND_HALF_UP))
        net = gross - fee
        RentDistributionItem.objects.create(distribution=dist, user_id=user_id, shares=h['shares'],
                                            gross_amount=gross, management_fee=fee, net_amount=net)
        total_fee += fee
        total_net += net
    dist.total_management_fee = total_fee
    dist.total_net = total_net
    dist.shares_counted = sum(h['shares'] for h in owners.values())
    dist.save(update_fields=['total_management_fee', 'total_net', 'shares_counted'])


def pay(dist, by=None):
    """Pay a draft distribution: recompute, credit every owner's net, mark it paid. Once only."""
    from payments.models import WalletBalance
    from properties.models import RentDistribution

    with transaction.atomic():
        dist = RentDistribution.objects.select_for_update().select_related('property_investment').get(pk=dist.pk)
        if dist.status == 'paid':
            raise DistributionError('ALREADY_PAID', 'This distribution was already paid.')
        build(dist)
        title = dist.property_investment.title
        period = f'{dist.period_start:%d %b %Y} – {dist.period_end:%d %b %Y}'
        paid = []
        for item in dist.items.select_related('user'):
            if item.net_amount > 0:
                WalletBalance.credit(item.user, item.net_amount, transaction_type='dividend', reference_id=dist.id,
                                     description=f'Rental income — {title} ({period})')
            item.paid = True
            item.save(update_fields=['paid'])
            paid.append(item)
        dist.status = 'paid'
        dist.paid_at = timezone.now()
        if by is not None and dist.created_by_id is None:
            dist.created_by = by
        dist.save(update_fields=['status', 'paid_at', 'created_by'])

        def tell():
            from notifications.services import NotificationService
            for item in paid:
                try:
                    NotificationService.create_notification(
                        user=item.user, title='Rental income received',
                        message=(f'${item.net_amount:,.2f} of rental income from {title} ({period}) was added to '
                                 f'your wallet: ${item.gross_amount:,.2f} for your {item.shares} shares, less the '
                                 f'${item.management_fee:,.2f} management fee. You can withdraw it or reinvest it '
                                 'at a discount.'),
                        notification_type='payment', send_email=True)
                except Exception:  # noqa: BLE001
                    logger.exception('Rent notice failed for %s', item.user_id)
        transaction.on_commit(tell)
    return dist
