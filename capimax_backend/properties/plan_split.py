"""
Selling or transferring PART of an installment plan (client, Nov 2026).

An investor paying a plan for N shares can sell or transfer any K of them (1 <= K < N); the
plan is split in proportion K/N:

  * every payment of the schedule (paid and still to pay) is split: the new holder's row is
    the row x K/N to the cent (rounded on the running total, so their plan's total is exactly
    K/N of it), the seller keeps the rest — so the two schedules add up to the original
    exactly, row by row, with the same due dates;
  * paid so far: the new plan has its rows' share of the payments made; the seller keeps
    the rest of what they paid;
  * the new holder gets a new plan for K shares (with its own certificate), the seller's plan
    goes on with N - K shares and smaller installments;
  * the installment fee rate stays; the fees already paid stay with the seller (they paid them);
  * the share hold on the property is split the same way (the total held does not change).

Selling or transferring all N shares moves the whole plan (move_whole) as before.

A part can only be split off a plan with no payment due: the seller pays what is due first,
so both plans start on a clean schedule.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

CENT = Decimal('0.01')


class SplitError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _q(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def payment_due(plan, today=None) -> bool:
    """A payment of the plan is due or overdue (its holder must pay it before splitting the plan)."""
    today = today or timezone.now().date()
    return bool(plan.is_active and plan.remaining_payments > 0 and plan.next_payment_date
                and plan.next_payment_date <= today)


def check(plan, units: int) -> None:
    """Raise SplitError unless `units` shares can be split off `plan` now."""
    total = int(plan.token_allocation or 0)
    if not plan.is_active:
        raise SplitError('not_active', 'Only an active installment plan can be split.')
    if units < 1 or units >= total:
        raise SplitError('BAD_UNITS', f'Choose between 1 and {total - 1} share(s) (or all {total} for the whole plan).')
    if payment_due(plan):
        raise SplitError('PAYMENT_DUE', 'An installment of this plan is due. Pay it first, then part of the plan '
                                        'can be sold or transferred.')


def preview(plan, units: int) -> dict:
    """
    The two plans if `units` shares are split off `plan` (nothing is saved). Rows are
    {kind, due_date (date), amount}; *_paid is the principal already paid of each plan.
    """
    total_units = int(plan.token_allocation)
    rows = plan.schedule_rows()
    part_rows, rest_rows = [], []
    # Rounded on the running total, so each plan's total is its exact share (to the cent) and no
    # row is more than a cent off its exact share.
    running, given = Decimal('0'), Decimal('0')
    for r in rows:
        running += Decimal(r['amount'])
        target = _q(running * units / total_units)
        part, given = target - given, target
        part_rows.append({'kind': r['kind'], 'due_date': r['due_date'], 'amount': part})
        rest_rows.append({'kind': r['kind'], 'due_date': r['due_date'], 'amount': Decimal(r['amount']) - part})
    made = int(plan.payments_made or 0)
    part_paid = sum((r['amount'] for r in part_rows[:made]), Decimal('0.00'))
    part_total = sum((r['amount'] for r in part_rows), Decimal('0.00'))
    rest_total = Decimal(plan.total_investment_amount) - part_total
    rest_paid = Decimal(plan.total_amount_paid or 0) - part_paid
    released = int(plan.tokens_released or 0)
    part_released = released * units // total_units
    fee_rate = Decimal(plan.fee_rate or 0)

    def unpaid(rws):
        out = []
        for i, r in enumerate(rws[made:], start=made + 1):
            fee = _q(r['amount'] * fee_rate / 100)
            out.append({'number': i, 'kind': r['kind'], 'due_date': r['due_date'], 'amount': r['amount'],
                        'fee': fee, 'total': r['amount'] + fee})
        return out

    return {
        'units': units, 'rest_units': total_units - units,
        'part_rows': part_rows, 'rest_rows': rest_rows,
        'part_total': part_total, 'part_paid': part_paid, 'part_remaining': part_total - part_paid,
        'rest_total': rest_total, 'rest_paid': rest_paid, 'rest_remaining': rest_total - rest_paid,
        'part_released': part_released, 'rest_released': released - part_released,
        'part_unpaid': unpaid(part_rows), 'rest_unpaid': unpaid(rest_rows),
    }


def _stored(rows) -> list[dict]:
    return [{'kind': r['kind'], 'due_date': r['due_date'].isoformat(), 'amount': str(r['amount'])} for r in rows]


def _terms(rows) -> tuple[Decimal, Decimal]:
    """(down payment, regular installment amount) of a schedule, for the plan's summary fields."""
    down = rows[0]['amount'] if rows and rows[0]['kind'] == 'down_payment' else Decimal('0.00')
    regular = next((r['amount'] for r in rows if r['kind'] != 'down_payment'), rows[-1]['amount'] if rows else CENT)
    return down, max(regular, CENT)


def split(plan, units: int, new_holder, *, reason: str):
    """
    Split `units` shares off `plan` (locked by the caller, inside its transaction) into a new
    plan held by `new_holder`. Returns the new plan. The caller re-syncs the certificates.
    """
    from investments.models import TokenReservation

    from .models import ConstructionInstallment

    check(plan, units)
    pv = preview(plan, units)
    made = int(plan.payments_made or 0)
    total = int(plan.total_installments)

    part_down, part_regular = _terms(pv['part_rows'])
    part = ConstructionInstallment(
        property_investment=plan.property_investment, investor=new_holder,
        total_investment_amount=pv['part_total'], token_allocation=units,
        installment_amount=part_regular, total_installments=total, frequency=plan.frequency,
        payments_made=made, total_amount_paid=pv['part_paid'], tokens_released=pv['part_released'],
        next_payment_date=plan.next_payment_date, status=plan.status,
        graduated_release=plan.graduated_release, tokens_per_payment=Decimal(units) / Decimal(total),
        early_completion_discount=plan.early_completion_discount, late_payment_fee=plan.late_payment_fee,
        grace_period_days=plan.grace_period_days, down_payment_amount=part_down,
        first_installment_date=plan.first_installment_date, start_date=plan.start_date,
        notes=f'{units} share(s) split from plan {plan.pk}: {reason}'[:1000],
        fee_rate=plan.fee_rate, fees_paid=Decimal('0.00'), reminder_sent_for=made, missed_notice_for=made,
        auto_debit=True, schedule_override=_stored(pv['part_rows']), split_from=plan,
    )
    part.save()

    rest_down, rest_regular = _terms(pv['rest_rows'])
    plan.total_investment_amount = pv['rest_total']
    plan.token_allocation = plan.token_allocation - units
    plan.total_amount_paid = pv['rest_paid']
    plan.tokens_released = pv['rest_released']
    plan.tokens_per_payment = Decimal(plan.token_allocation) / Decimal(total)
    plan.installment_amount = rest_regular
    plan.down_payment_amount = rest_down
    plan.schedule_override = _stored(pv['rest_rows'])
    plan.notes = (f'{plan.notes}\n' if plan.notes else '') + f'{units} share(s) split off: {reason}'
    plan.save()

    # The share hold: the same total, now split between the two plans.
    left = units
    for hold in (TokenReservation.objects.select_for_update()
                 .filter(installment_plan=plan, released=False).order_by('-token_amount')):
        if left <= 0:
            break
        take = min(left, hold.token_amount)
        if take == hold.token_amount:
            TokenReservation.objects.filter(pk=hold.pk).update(installment_plan=part, user=new_holder)
        else:
            TokenReservation.objects.filter(pk=hold.pk).update(token_amount=hold.token_amount - take)
            TokenReservation.objects.create(user=new_holder, property_investment=plan.property_investment,
                                            token_amount=take, expires_at=None, installment_plan=part)
        left -= take
    return part


def move_whole(plan, new_holder) -> None:
    """The whole plan changes holder (locked by the caller): its remaining installments are theirs."""
    from investments.models import TokenReservation

    plan.investor = new_holder
    plan.reminder_sent_for = plan.payments_made
    plan.missed_notice_for = plan.payments_made
    plan.save(update_fields=['investor', 'reminder_sent_for', 'missed_notice_for', 'updated_at'])
    TokenReservation.objects.filter(installment_plan=plan, released=False).update(user=new_holder)


def sync_certificates(*plans) -> None:
    """Re-issue the certificates of the plans whose shares changed (after a split)."""
    import logging

    from certificates.services import sync_plan
    for plan in plans:
        try:
            sync_plan(plan, notify=False)
        except Exception:  # noqa: BLE001 — the signal re-syncs it after the commit
            logging.getLogger(__name__).warning('Certificate sync for plan %s postponed', plan.pk, exc_info=True)
