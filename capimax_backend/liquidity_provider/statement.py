"""
The liquidity provider's statement for a period (client voice notes, round 5):
what it bought from investors, what it sold on the secondary market, money in
and out of its wallet, and the opening / closing balance — shown and downloaded
from its own dashboard.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.utils import timezone

ZERO = Decimal('0')
CENT = Decimal('0.01')


def _m(value) -> str:
    return str(Decimal(value or 0).quantize(CENT))


def period(start: date | None, end: date | None) -> tuple[date, date]:
    """Default: the current month up to today."""
    today = timezone.localdate()
    end = end or today
    start = start or end.replace(day=1)
    if start > end:
        start, end = end, start
    return start, end


def lp_statement(lp, start: date, end: date) -> dict:
    from marketplace.models import TradeTransaction, TransactionStatus
    from payments.models import WalletTransaction

    from .models import LiquidityTransaction

    tz = timezone.get_current_timezone()
    since = timezone.make_aware(datetime.combine(start, time.min), tz)
    until = timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), tz)
    user = lp.user

    ledger = (WalletTransaction.objects.filter(user=user, currency='USD', created_at__gte=since, created_at__lt=until)
              .order_by('created_at')) if user else WalletTransaction.objects.none()
    before = (WalletTransaction.objects.filter(user=user, currency='USD', created_at__lt=since)
              .order_by('-created_at').first()) if user else None
    lines = list(ledger)
    opening = before.balance_after if before else (lines[0].balance_before if lines else ZERO)
    closing = lines[-1].balance_after if lines else opening

    money = {'deposits': ZERO, 'withdrawals': ZERO, 'rent': ZERO, 'fees': ZERO}
    for row in lines:
        kind = row.transaction_type
        if kind == 'deposit':
            money['deposits'] += row.amount
        elif kind == 'withdrawal':
            money['withdrawals'] += -row.amount if row.amount < 0 else row.amount
        elif kind == 'dividend':
            money['rent'] += row.amount
        elif kind == 'fee':
            money['fees'] += -row.amount if row.amount < 0 else row.amount

    bought = [{
        'date': tx.completed_at,
        'reference': tx.reference_number,
        'property': tx.exit_request.investment.property_investment.title,
        'shares': tx.units_purchased,
        'price': _m(tx.price_per_unit),
        'total': _m(tx.total_amount),
        'fee': _m(tx.platform_fee),
    } for tx in (LiquidityTransaction.objects.filter(liquidity_provider=lp, completed_at__gte=since,
                                                     completed_at__lt=until)
                 .select_related('exit_request__investment__property_investment').order_by('completed_at'))]

    from properties.models import PositionListing
    bought += [{
        'date': pl.sold_at,
        'reference': str(pl.pk)[:8].upper(),
        'property': f'{pl.plan.property_investment.title} (installment position)',
        'shares': pl.plan.token_allocation,
        'price': _m(pl.sold_price_per_share),
        'total': _m(pl.seller_cash),
        'fee': _m(pl.buyer_fee),
    } for pl in (PositionListing.objects.filter(buyer=user, status='sold', sold_at__gte=since, sold_at__lt=until)
                 .select_related('plan__property_investment').order_by('sold_at'))] if user else []
    bought.sort(key=lambda r: r['date'])

    sold = [{
        'date': t.completed_at or t.created_at,
        'reference': str(t.pk)[:8].upper(),
        'property': t.property_traded.title,
        'shares': t.tokens_traded,
        'price': _m(t.price_per_token),
        'total': _m(t.total_amount),
    } for t in (TradeTransaction.objects.filter(seller=user, status=TransactionStatus.COMPLETED,
                                                created_at__gte=since, created_at__lt=until)
                .select_related('property_traded').order_by('created_at'))] if user else []
    sold += [{
        'date': pl.sold_at,
        'reference': str(pl.pk)[:8].upper(),
        'property': f'{pl.plan.property_investment.title} (installment position)',
        'shares': pl.plan.token_allocation,
        'price': _m(pl.sold_price_per_share),
        'total': _m(pl.seller_cash),
    } for pl in (PositionListing.objects.filter(seller=user, status='sold', sold_at__gte=since, sold_at__lt=until)
                 .select_related('plan__property_investment').order_by('sold_at'))] if user else []
    sold.sort(key=lambda r: r['date'])

    return {
        'provider': lp.legal_entity_name,
        'from': start.isoformat(),
        'to': end.isoformat(),
        'opening_balance': _m(opening),
        'closing_balance': _m(closing),
        'summary': {
            'bought_deals': len(bought),
            'bought_shares': sum(r['shares'] for r in bought),
            'bought_paid': _m(sum((Decimal(r['total']) + Decimal(r['fee']) for r in bought), ZERO)),
            'sold_deals': len(sold),
            'sold_shares': sum(r['shares'] for r in sold),
            'sold_received': _m(sum((Decimal(r['total']) for r in sold), ZERO)),
            'deposits': _m(money['deposits']),
            'withdrawals': _m(money['withdrawals']),
            'rent': _m(money['rent']),
            'fees': _m(money['fees']),
        },
        'bought': bought,
        'sold': sold,
        'lines': [{
            'date': row.created_at,
            'type': row.transaction_type,
            'description': row.description,
            'amount': _m(row.amount),
            'balance': _m(row.balance_after),
        } for row in lines],
    }
