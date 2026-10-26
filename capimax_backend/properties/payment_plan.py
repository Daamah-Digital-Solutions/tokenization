"""
Purchase methods, installment schedules and price phases (client round 3,
#18 #19 #20 and admin note #2).

One source of truth for:
  * which purchase methods a property allows (cash / installments / both) —
    set by the admin per property;
  * the installment schedule (down payment + N installments at a frequency,
    optionally from a fixed first due date) — shown on the public property
    page, used to create a buyer's plan, and to render the plan's
    per-installment status in the dashboard;
  * the active / upcoming price phase.
"""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Optional

from dateutil.relativedelta import relativedelta
from django.utils import timezone

FREQUENCY_MONTHS = {'monthly': 1, 'quarterly': 3, 'semi_annual': 6, 'annual': 12}
DEFAULT_COUNT_OPTIONS = [3, 6, 12]
CENT = Decimal('0.01')


class PurchaseMethod:
    CASH = 'cash'
    INSTALLMENTS = 'installments'
    BOTH = 'both'
    CHOICES = [
        (CASH, 'Full cash payment only'),
        (INSTALLMENTS, 'Installments only'),
        (BOTH, 'Cash or installments'),
    ]


def allows_cash(prop) -> bool:
    return getattr(prop, 'purchase_methods', PurchaseMethod.CASH) in (PurchaseMethod.CASH, PurchaseMethod.BOTH)


def allows_installments(prop) -> bool:
    return getattr(prop, 'purchase_methods', PurchaseMethod.CASH) in (
        PurchaseMethod.INSTALLMENTS, PurchaseMethod.BOTH)


def count_options(prop) -> list[int]:
    """Installment counts a buyer may choose (fixed by the admin, or presets)."""
    if prop.installment_count:
        return [int(prop.installment_count)]
    months_cap = prop.installment_period_months or 12
    step = FREQUENCY_MONTHS.get(prop.installment_frequency or 'monthly', 1)
    max_count = max(1, months_cap // step)
    options = sorted({n for n in DEFAULT_COUNT_OPTIONS if n <= max_count} | {max_count})
    return options


def _q(value: Decimal) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def build_schedule(total: Decimal, *, down_payment_percent: Decimal, count: int,
                   frequency: str = 'monthly', start_date: Optional[date] = None,
                   first_due_date: Optional[date] = None) -> list[dict]:
    """
    Rows: down payment (if any) due on ``start_date``, then ``count`` equal
    installments every ``frequency``, starting ``first_due_date`` or one
    period after the start. The last row absorbs rounding so the rows add up
    to ``total`` exactly.
    """
    total = _q(Decimal(total))
    start = start_date or timezone.now().date()
    step = FREQUENCY_MONTHS.get(frequency or 'monthly', 1)
    down_pct = Decimal(down_payment_percent or 0)
    count = max(1, int(count or 1))

    rows: list[dict] = []
    down = _q(total * down_pct / Decimal(100)) if down_pct > 0 else Decimal('0.00')
    if down > 0:
        rows.append({'number': 1, 'kind': 'down_payment', 'due_date': start,
                     'amount': down, 'percent': _q(down_pct)})
    remaining = total - down
    regular = _q(remaining / count)
    first = first_due_date or (start + relativedelta(months=step) if down > 0 else start)
    allocated = Decimal('0.00')
    for i in range(count):
        amount = regular if i < count - 1 else _q(remaining - allocated)
        allocated += amount
        rows.append({
            'number': len(rows) + 1,
            'kind': 'installment',
            'due_date': first + relativedelta(months=step * i),
            'amount': amount,
            'percent': _q(amount / total * 100) if total else Decimal('0.00'),
        })
    return rows


def plan_config(prop) -> dict:
    """The payment-plan section of the property page."""
    return {
        'purchase_methods': prop.purchase_methods,
        'allows_cash': allows_cash(prop),
        'allows_installments': allows_installments(prop),
        'down_payment_percent': prop.installment_down_payment_percent or Decimal('0'),
        'installment_count': prop.installment_count,
        'count_options': count_options(prop) if allows_installments(prop) else [],
        'frequency': prop.installment_frequency or 'monthly',
        'first_due_date': prop.installment_first_due_date,
        'max_period_months': prop.installment_period_months,
        'notes': prop.installment_notes or '',
        'minimum_installment': Decimal('100.00'),
    }


# --------------------------------------------------------------------------
# Price phases
# --------------------------------------------------------------------------

def tiers_for(prop) -> Iterable:
    return prop.price_tiers.all().order_by('effective_from', 'order')


def active_tier(prop, on: Optional[date] = None):
    on = on or timezone.now().date()
    current = None
    for tier in tiers_for(prop):
        if tier.effective_from <= on and (tier.effective_to is None or tier.effective_to >= on):
            current = tier
    return current


def next_tier(prop, on: Optional[date] = None):
    on = on or timezone.now().date()
    return next((t for t in tiers_for(prop) if t.effective_from > on), None)


def sync_price_tier(prop) -> bool:
    """Apply the active phase's share price to the property. Returns True if changed."""
    tier = active_tier(prop)
    if tier and tier.price_per_token and tier.price_per_token != prop.token_price:
        type(prop).objects.filter(pk=prop.pk).update(token_price=tier.price_per_token)
        prop.token_price = tier.price_per_token
        return True
    return False


# --------------------------------------------------------------------------
# A buyer's plan with per-installment status (client round 3, #19)
# --------------------------------------------------------------------------

def plan_schedule_with_status(plan) -> list[dict]:
    """
    Every installment of a plan: number, type, due date, amount and status
    (paid / due / overdue / upcoming / cancelled), plus the payment record
    (date + id for the receipt) for paid ones.
    """
    from datetime import timedelta
    from payments.models import Payment

    rows = plan.schedule_rows()
    payments = list(
        Payment.objects.filter(metadata__installment_id=str(plan.id), status='completed')
        .order_by('completed_at', 'created_at')
    )
    today = timezone.now().date()
    grace = timedelta(days=plan.grace_period_days or 0)
    cancelled = plan.status in ('cancelled', 'refunded', 'failed')
    out = []
    for index, row in enumerate(rows):
        number = index + 1
        entry = {
            'number': number,
            'kind': row['kind'],
            'due_date': row['due_date'],
            'amount': row['amount'],
            'fee': plan.fee_for(number),
            'total': row['amount'] + plan.fee_for(number),
            'percent': row['percent'],
            'paid_at': None,
            'payment_id': None,
        }
        if number <= plan.payments_made:
            entry['status'] = 'paid'
            if index < len(payments):
                entry['paid_at'] = payments[index].completed_at
                entry['payment_id'] = str(payments[index].id)
        elif cancelled:
            entry['status'] = 'cancelled'
        elif number == plan.payments_made + 1 and row['due_date'] <= today:
            entry['status'] = 'overdue' if row['due_date'] + grace < today else 'due'
        else:
            entry['status'] = 'upcoming'
        out.append(entry)
    return out
