"""
Money reconciliation (PropShare model): checks that should always hold.
Read-only — it reports, the team fixes. Shown in the admin (Fees &
reconciliation) and run daily; findings are emailed to the support inbox.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import F, Max, Sum
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')


def _finding(check: str, message: str, ref: str = '') -> dict:
    return {'check': check, 'message': message, 'ref': ref}


def wallets_match_ledger() -> list:
    """Each wallet's available balance equals the balance after its latest ledger line."""
    from .models import WalletBalance, WalletTransaction

    out = []
    for wb in WalletBalance.objects.select_related('user'):
        last = (WalletTransaction.objects.filter(user=wb.user, currency=wb.currency)
                .order_by('-created_at').values_list('balance_after', flat=True).first())
        if last is None:
            if wb.available_balance != 0:
                out.append(_finding('wallet_ledger', f'{wb.user.email}: balance ${wb.available_balance} with no ledger line',
                                    str(wb.pk)))
            continue
        if Decimal(last).quantize(CENT) != Decimal(wb.available_balance).quantize(CENT):
            out.append(_finding('wallet_ledger', f'{wb.user.email}: balance ${wb.available_balance:.2f} but the '
                                                 f'last ledger line says ${Decimal(last):.2f}', str(wb.pk)))
    return out


def stuck_payments(hours: int = 25) -> list:
    """Card / Pronova / crypto payments still pending after the provider window."""
    from .models import Payment

    since = timezone.now() - timedelta(hours=hours)
    qs = Payment.objects.filter(status='pending', created_at__lt=since,
                                payment_method__in=['credit_card', 'pronova', 'cryptocurrency'])
    return [_finding('stuck_payment', f'{p.user.email}: ${p.amount} {p.payment_method} pending since '
                                      f'{p.created_at:%Y-%m-%d %H:%M}', str(p.pk)) for p in qs.select_related('user')[:200]]


def expired_holds() -> list:
    """Share holds past their time limit that were not released."""
    from investments.models import TokenReservation

    qs = TokenReservation.objects.filter(released=False, expires_at__lt=timezone.now() - timedelta(minutes=15))
    return [_finding('expired_hold', f'{r.token_amount} shares of {r.property_investment.title} held for '
                                     f'{r.user.email} expired {r.expires_at:%Y-%m-%d %H:%M}', str(r.pk))
            for r in qs.select_related('user', 'property_investment')[:200]]


def overdue_withdrawals(days: int = 3) -> list:
    from .models import BankWithdrawalRequest

    qs = BankWithdrawalRequest.objects.filter(status__in=['pending', 'approved', 'processing'],
                                              created_at__lt=timezone.now() - timedelta(days=days))
    return [_finding('withdrawal_waiting', f'{w.reference or str(w.pk)[:8]}: ${w.amount} for {w.user.email} '
                                           f'waiting since {w.created_at:%Y-%m-%d}', str(w.pk))
            for w in qs.select_related('user')[:200]]


def distributions_add_up() -> list:
    from properties.models import RentDistribution

    out = []
    for d in RentDistribution.objects.filter(status='paid'):
        sums = d.items.aggregate(net=Sum('net_amount'), fee=Sum('management_fee'), gross=Sum('gross_amount'))
        gross = Decimal(str(sums['gross'] or 0)).quantize(CENT)
        split = (Decimal(str(sums['net'] or 0)) + Decimal(str(sums['fee'] or 0))).quantize(CENT)
        if gross != Decimal(d.gross_amount) or split != Decimal(d.gross_amount):
            out.append(_finding('distribution', f'{d}: parts ${split} vs gross ${d.gross_amount}', str(d.pk)))
    return out


def shares_not_oversold() -> list:
    from investments.purchase import reserved_shares
    from properties.models import Property

    out = []
    for p in Property.objects.filter(total_tokens__gt=0):
        held = reserved_shares(p)
        if p.tokens_sold + held > p.total_tokens:
            out.append(_finding('oversold', f'{p.title}: {p.tokens_sold} sold + {held} held > {p.total_tokens}',
                                str(p.pk)))
    return out


CHECKS = (
    ('wallet_ledger', 'Wallets match their ledger', wallets_match_ledger),
    ('stuck_payment', 'Card / crypto payments not stuck', stuck_payments),
    ('expired_hold', 'Expired share holds released', expired_holds),
    ('withdrawal_waiting', 'Withdrawals answered within 3 days', overdue_withdrawals),
    ('distribution', 'Rent payouts add up', distributions_add_up),
    ('oversold', 'No property oversold', shares_not_oversold),
)


def run_checks() -> list:
    """[{key, title, findings: [...]}] — a check that crashes reports itself as a finding."""
    results = []
    for key, title, fn in CHECKS:
        try:
            findings = fn()
        except Exception as exc:  # noqa: BLE001
            logger.exception('Reconciliation check %s failed', key)
            findings = [_finding(key, f'The check could not run: {exc}')]
        results.append({'key': key, 'title': title, 'findings': findings})
    return results


def report_by_email() -> int:
    """Daily: email the support inbox when anything needs a look. Returns the number of findings."""
    results = run_checks()
    count = sum(len(r['findings']) for r in results)
    if count:
        lines = []
        for r in results:
            if r['findings']:
                lines.append(f"{r['title']} — {len(r['findings'])}")
                lines += [f"  • {f['message']}" for f in r['findings'][:20]]
        try:
            from support.notify import _send, support_inbox
            _send(support_inbox(), f'[Reconciliation] {count} item(s) to check', '\n'.join(lines))
        except Exception:  # noqa: BLE001
            logger.exception('Reconciliation email failed')
    return count
