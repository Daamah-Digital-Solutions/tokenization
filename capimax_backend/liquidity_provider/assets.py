"""
The liquidity provider's own assets, for the LP dashboard (client voice notes, Nov 2026).

Shares an LP buys from investors become ordinary holdings of the LP's user
(liquidity_provider/settlement.py → marketplace/share_moves.py), so they used to be
visible only in the investor dashboard. This summarises them per property for the
LP: shares held, what they cost, what they are worth now, how many were bought
from investors, how many are listed for sale, and the ownership certificate.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

ZERO = Decimal('0')


def _q(value) -> str:
    return str(Decimal(value).quantize(Decimal('0.01')))


def _image(prop, request) -> str | None:
    img = prop.images.filter(is_primary=True).first() or prop.images.first()
    if not img or not img.image:
        return None
    return request.build_absolute_uri(img.image.url) if request else img.image.url


def lp_assets(lp, request=None) -> dict:
    from certificates.models import Certificate
    from investments.models import Investment
    from marketplace.models import MarketListing

    from .models import LiquidityTransaction

    user = lp.user
    holdings = (Investment.objects.filter(user=user, status='completed', token_amount__gt=0)
                .select_related('property_investment').order_by('created_at'))
    by_prop: dict = {}
    for inv in holdings:
        row = by_prop.setdefault(inv.property_investment_id, {
            'prop': inv.property_investment, 'shares': 0, 'cost': ZERO, 'since': inv.created_at})
        row['shares'] += inv.token_amount
        row['cost'] += inv.investment_amount or ZERO

    bought = defaultdict(lambda: {'units': 0, 'paid': ZERO, 'count': 0})
    for tx in (LiquidityTransaction.objects.filter(liquidity_provider=lp)
               .select_related('exit_request__investment')):
        investment = getattr(tx.exit_request, 'investment', None)
        if investment is None:
            continue
        b = bought[investment.property_investment_id]
        b['units'] += tx.units_purchased or 0
        b['paid'] += (tx.total_amount or ZERO) + (tx.platform_fee or ZERO)  # what left the LP wallet
        b['count'] += 1

    listed = defaultdict(int)
    for listing in MarketListing.objects.filter(seller=user, listing_type='sell', status='active'):
        listed[listing.property_listing_id] += listing.tokens_remaining or 0

    certificates = {}
    for cert in Certificate.objects.filter(user=user).exclude(status='revoked').order_by('-issue_date'):
        certificates.setdefault(cert.property_ref_id, cert)

    rows, totals = [], {'properties': 0, 'shares': 0, 'cost': ZERO, 'value': ZERO}
    for prop_id, row in by_prop.items():
        prop = row['prop']
        price = Decimal(prop.token_price or 0)
        value = price * row['shares']
        gain = value - row['cost']
        cert = certificates.get(prop_id)
        b = bought.get(prop_id)
        rows.append({
            'property_id': str(prop_id),
            'title': prop.title,
            'city': prop.city,
            'country': prop.country,
            'image': _image(prop, request),
            'shares': row['shares'],
            'total_shares': prop.total_tokens,
            'cost': _q(row['cost']),
            'share_price': _q(price),
            'value': _q(value),
            'gain': _q(gain),
            'gain_pct': _q(gain / row['cost'] * 100) if row['cost'] else '0.00',
            'listed_shares': listed.get(prop_id, 0),
            'available_shares': max(0, row['shares'] - listed.get(prop_id, 0)),
            'bought_from_investors': {'deals': b['count'], 'shares': b['units'], 'paid': _q(b['paid'])} if b else None,
            'certificate': {'id': str(cert.pk), 'number': cert.certificate_id, 'status': cert.status} if cert else None,
            'since': row['since'].isoformat() if row['since'] else None,
        })
        totals['properties'] += 1
        totals['shares'] += row['shares']
        totals['cost'] += row['cost']
        totals['value'] += value
    gain = totals['value'] - totals['cost']
    return {
        'assets': sorted(rows, key=lambda r: Decimal(r['value']), reverse=True),
        'totals': {
            'properties': totals['properties'],
            'shares': totals['shares'],
            'cost': _q(totals['cost']),
            'value': _q(totals['value']),
            'gain': _q(gain),
            'gain_pct': _q(gain / totals['cost'] * 100) if totals['cost'] else '0.00',
            'certificates': sum(1 for r in rows if r['certificate']),
            'listed_shares': sum(r['listed_shares'] for r in rows),
        },
    }
