"""
Account statements (client round 3, #16): the data behind the official PDF
statements — wallet, transactions, investments and owned properties — for
one user and a date range.

Figures come from the ledgers themselves (wallet transactions, payments,
investments, dividends, withdrawals, secondary-market trades) so a
statement always matches what the user sees elsewhere. Types and statuses
are returned as codes; the frontend translates them for the document
language.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

ZERO = Decimal('0.00')
KINDS = ('wallet', 'transactions', 'investments', 'holdings')


def _d(value) -> str:
    return str((Decimal(value or 0)).quantize(Decimal('0.01')))


def _iso(dt) -> str | None:
    if not dt:
        return None
    return dt.isoformat()


def parse_period(user, date_from: str | None, date_to: str | None):
    """Inclusive period; defaults to the account's whole history up to today."""
    tz = timezone.get_current_timezone()
    today = timezone.localdate()
    try:
        start = date.fromisoformat(date_from) if date_from else (user.date_joined.date() if user.date_joined else today)
    except ValueError:
        start = user.date_joined.date() if user.date_joined else today
    try:
        end = date.fromisoformat(date_to) if date_to else today
    except ValueError:
        end = today
    if end < start:
        start, end = end, start
    return (start, end,
            timezone.make_aware(datetime.combine(start, time.min), tz),
            timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), tz))


def holder_for(user) -> dict:
    kyc = getattr(user, 'kyc_status', '') or ''
    wallet = getattr(user, 'wallet_address', '') or ''
    return {
        'name': (user.get_full_name() or '').strip() or user.email,
        'email': user.email,
        'account_id': str(user.pk).replace('-', '')[:10].upper(),
        'kyc_status': kyc,
        'wallet_address': wallet,
        'member_since': _iso(user.date_joined),
    }


def build_statement(user, kind: str, date_from: str | None = None, date_to: str | None = None) -> dict:
    start, end, start_dt, end_dt = parse_period(user, date_from, date_to)
    builder = {
        'wallet': _wallet,
        'transactions': _transactions,
        'investments': _investments,
        'holdings': _holdings,
    }[kind]
    data = builder(user, start_dt, end_dt)
    data.update({
        'kind': kind,
        'holder': holder_for(user),
        'period': {'from': start.isoformat(), 'to': end.isoformat()},
        'generated_at': timezone.now().isoformat(),
    })
    return data


# ---------------------------------------------------------------- wallet
def _wallet(user, start_dt, end_dt) -> dict:
    from payments.models import WalletBalance, WalletTransaction

    qs = WalletTransaction.objects.filter(user=user, currency='USD')
    in_period = list(qs.filter(created_at__gte=start_dt, created_at__lt=end_dt).order_by('created_at'))
    before = qs.filter(created_at__lt=start_dt).order_by('-created_at').first()
    opening = before.balance_after if before else (in_period[0].balance_before if in_period else ZERO)
    if in_period:
        closing = in_period[-1].balance_after
    else:
        closing = opening
    rows = [{
        'date': _iso(t.created_at),
        'type': t.transaction_type,
        'description': t.description or '',
        'amount': _d(t.amount),
        'balance': _d(t.balance_after),
        'reference': str(t.reference_id or t.id).replace('-', '')[:10].upper(),
    } for t in in_period]
    credits = sum((t.amount for t in in_period if t.amount > 0), ZERO)
    debits = sum((-t.amount for t in in_period if t.amount < 0), ZERO)
    wb = WalletBalance.objects.filter(user=user, currency='USD').first()
    return {
        'summary': {
            'opening_balance': _d(opening),
            'closing_balance': _d(closing),
            'total_in': _d(credits),
            'total_out': _d(debits),
            'count': len(rows),
            'available_now': _d(wb.available_balance if wb else ZERO),
            'locked_now': _d(getattr(wb, 'locked_balance', ZERO) if wb else ZERO),
        },
        'rows': rows,
    }


# ---------------------------------------------------------- transactions
def _transactions(user, start_dt, end_dt) -> dict:
    from investments.models import DividendPayment
    from marketplace.models import TradeTransaction
    from payments.models import BankWithdrawalRequest, Payment
    from properties.models import ConstructionInstallment

    rows = []
    payments = Payment.objects.filter(user=user, created_at__gte=start_dt, created_at__lt=end_dt) \
        .select_related('investment__property_investment')
    plan_titles = {
        str(pk): title for pk, title in ConstructionInstallment.objects.filter(investor=user)
        .values_list('id', 'property_investment__title')
    }
    for p in payments:
        meta = p.metadata or {}
        prop = p.investment.property_investment.title if p.investment_id else ''
        if meta.get('installment_id'):
            purpose = 'installment'
            prop = plan_titles.get(str(meta['installment_id']), prop)
        elif p.investment_id:
            purpose = 'investment'
        else:
            purpose = 'deposit'
        rows.append({
            'date': _iso(p.completed_at or p.created_at),
            'type': purpose,
            'description': prop,
            'method': p.payment_method,
            'amount': _d(p.amount if purpose == 'deposit' else -p.amount),
            'status': p.status,
            'reference': str(p.id).replace('-', '')[:10].upper(),
        })
    dividends = DividendPayment.objects.filter(
        investment__user=user, created_at__gte=start_dt, created_at__lt=end_dt,
    ).select_related('investment__property_investment')
    for d in dividends:
        rows.append({
            'date': _iso(d.payment_date or d.created_at),
            'type': 'dividend',
            'description': d.investment.property_investment.title,
            'method': 'wallet',
            'amount': _d(d.amount),
            'status': d.status,
            'reference': str(d.id).replace('-', '')[:10].upper(),
        })
    for w in BankWithdrawalRequest.objects.filter(user=user, created_at__gte=start_dt, created_at__lt=end_dt):
        rows.append({
            'date': _iso(w.created_at),
            'type': 'withdrawal',
            'description': w.bank_name or w.crypto_asset or '',
            'method': w.withdrawal_method,
            'amount': _d(-w.amount),
            'status': w.status,
            'reference': str(w.id).replace('-', '')[:10].upper(),
        })
    trades = TradeTransaction.objects.filter(
        Q(buyer=user) | Q(seller=user), created_at__gte=start_dt, created_at__lt=end_dt,
    ).select_related('property_traded')
    for t in trades:
        buying = t.buyer_id == user.pk
        rows.append({
            'date': _iso(t.completed_at or t.created_at),
            'type': 'market_purchase' if buying else 'market_sale',
            'description': f"{t.property_traded.title} · {t.tokens_traded}",
            'method': 'wallet',
            'amount': _d(-t.total_cost_to_buyer if buying else t.net_amount_to_seller),
            'status': t.status,
            'reference': str(t.id).replace('-', '')[:10].upper(),
        })
    rows.sort(key=lambda r: r['date'] or '')

    def total(types, statuses=('completed', 'paid', 'approved')):
        return sum((Decimal(r['amount']) for r in rows if r['type'] in types and r['status'] in statuses), ZERO)

    return {
        'summary': {
            'count': len(rows),
            'invested': _d(-total({'investment', 'installment', 'market_purchase'})),
            'deposited': _d(total({'deposit'})),
            'received': _d(total({'dividend', 'market_sale'})),
            'withdrawn': _d(-total({'withdrawal'}, ('completed', 'approved', 'paid'))),
        },
        'rows': rows,
    }


# ----------------------------------------------------------- investments
def _investments(user, start_dt, end_dt) -> dict:
    from investments.models import Investment
    from properties.models import ConstructionInstallment

    invs = Investment.objects.filter(user=user, created_at__gte=start_dt, created_at__lt=end_dt) \
        .select_related('property_investment').order_by('created_at')
    rows = []
    for i in invs:
        pm = i.payment_method if isinstance(i.payment_method, dict) else {}
        method = pm.get('type') or pm.get('method') or ''
        rows.append({
            'date': _iso(i.completed_at or i.created_at),
            'property': i.property_investment.title,
            'shares': str(i.token_amount),
            'amount': _d(i.investment_amount),
            'price': _d(i.investment_amount / i.token_amount) if i.token_amount else '0.00',
            'method': method,
            'status': i.status,
            'reference': str(i.id).replace('-', '')[:10].upper(),
        })
    plans = []
    for p in ConstructionInstallment.objects.filter(investor=user).select_related('property_investment'):
        plans.append({
            'property': p.property_investment.title,
            'total': _d(p.total_investment_amount),
            'paid': _d(p.total_amount_paid),
            'remaining': _d(p.total_investment_amount - p.total_amount_paid),
            'progress': f"{p.payments_made}/{p.total_installments}",
            'next_due': _iso(p.next_payment_date) if p.payments_made < p.total_installments else None,
            'shares': str(p.token_allocation),
            'status': p.status,
        })
    done = [i for i in invs if i.status == 'completed' or i.status == 'transferred']
    return {
        'summary': {
            'count': len(rows),
            'completed': len(done),
            'invested': _d(sum((i.investment_amount for i in done), ZERO)),
            'shares': sum(i.token_amount for i in invs if i.status == 'completed'),
            'plans': len(plans),
            'plans_outstanding': _d(sum((Decimal(p['remaining']) for p in plans if p['status'] not in ('cancelled', 'refunded')), ZERO)),
        },
        'rows': rows,
        'plans': plans,
    }


# -------------------------------------------------------------- holdings
def _holdings(user, start_dt, end_dt) -> dict:
    from investments.models import Investment
    from properties.models import ConstructionInstallment

    by_prop: dict = {}
    for i in Investment.objects.filter(user=user, status='completed').select_related('property_investment'):
        p = i.property_investment
        h = by_prop.setdefault(p.pk, {'p': p, 'shares': 0, 'cost': ZERO, 'since': i.completed_at or i.created_at})
        h['shares'] += i.token_amount
        h['cost'] += i.investment_amount
        when = i.completed_at or i.created_at
        if when and h['since'] and when < h['since']:
            h['since'] = when
    rows = []
    for h in by_prop.values():
        p = h['p']
        pct = (Decimal(h['shares']) / Decimal(p.total_tokens) * 100) if p.total_tokens else ZERO
        value = (p.token_price or ZERO) * h['shares']
        rent = (Decimal(p.monthly_rental_income or 0) * pct / 100) if p.monthly_rental_income else ZERO
        rows.append({
            'property': p.title,
            'location': ', '.join(x for x in [p.city, p.country] if x),
            'category': p.property_category,
            'shares': str(h['shares']),
            'ownership': f"{pct.quantize(Decimal('0.0001'))}",
            'cost': _d(h['cost']),
            'value': _d(value),
            'monthly_income': _d(rent),
            'since': _iso(h['since']),
        })
    rows.sort(key=lambda r: r['property'])
    linked = []
    for plan in ConstructionInstallment.objects.filter(investor=user).exclude(status__in=['cancelled', 'refunded']) \
            .select_related('property_investment'):
        linked.append({
            'property': plan.property_investment.title,
            'shares': str(plan.token_allocation),
            'released': str(plan.tokens_released),
            'paid': _d(plan.total_amount_paid),
            'total': _d(plan.total_investment_amount),
            'status': plan.status,
        })
    cost = sum((Decimal(r['cost']) for r in rows), ZERO)
    value = sum((Decimal(r['value']) for r in rows), ZERO)
    return {
        'summary': {
            'properties': len(rows),
            'shares': sum(int(r['shares']) for r in rows),
            'cost': _d(cost),
            'value': _d(value),
            'change_pct': f"{((value - cost) / cost * 100).quantize(Decimal('0.01')) if cost else ZERO}",
            'monthly_income': _d(sum((Decimal(r['monthly_income']) for r in rows), ZERO)),
        },
        'rows': rows,
        'linked': linked,
    }
