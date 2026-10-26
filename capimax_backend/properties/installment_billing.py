"""
Installment plans, the PropShare way.

  * Fee: the installment fee (admin setting, 4% by default) is fixed on the
    plan when it starts and charged on every payment — the down payment and
    each installment — on that payment's base amount. It is its own wallet
    line ("fee"); the base is an "investment" line.
  * Shares: the plan's whole allocation is held when it starts (a
    TokenReservation with no time limit). When the plan ends the shares it
    paid for count as sold and the hold is released.
  * Automatic debit (hourly, run_due): payments due today and overdue ones
    are charged from the wallet. A short wallet charges nothing; the member
    gets ONE "payment missed" notice per payment and it is retried every hour.
    No late fee, no automatic cancellation.
  * Reminder: one notice 3 days before each due date.
  * Paying ahead: the member can pay the next payment any time; due dates
    stay as scheduled.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)

REMINDER_DAYS = 3


def _notify(user, title: str, message: str, *, email: bool = True) -> None:
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='payment', priority='high',
                                                send_email=email)
    except Exception:  # noqa: BLE001 — a notice never blocks a money step
        logger.exception('Installment notice failed for %s', user)


def _label(plan, number: int) -> str:
    rows = plan.schedule_rows()
    if rows and number == 1 and rows[0]['kind'] == 'down_payment':
        return 'Down payment'
    return f'Installment {number} of {plan.total_installments}'


def hold_shares(plan) -> None:
    """Hold the plan's whole allocation (no time limit) — called when the plan starts."""
    from investments.models import TokenReservation
    TokenReservation.objects.create(user=plan.investor, property_investment=plan.property_investment,
                                    token_amount=plan.token_allocation, expires_at=None, installment_plan=plan)


def finish_plan(plan) -> None:
    """
    The plan ended (completed or cancelled): the shares it paid for count as
    sold, the rest go back on sale. Idempotent: does nothing once released.
    """
    from investments.models import TokenReservation
    from properties.models import Property

    held = TokenReservation.objects.select_for_update().filter(installment_plan=plan, released=False)
    if not held.exists():
        return
    sold = plan.token_allocation if plan.status == 'completed' else int(plan.tokens_released or 0)
    held.update(released=True)
    if sold:
        Property.objects.filter(pk=plan.property_investment_id).update(tokens_sold=F('tokens_sold') + sold)


def charge_next(plan, *, auto: bool = False, today=None) -> dict:
    """
    Charge the next payment (base + fee) to the investor's wallet, in one
    transaction. ``auto`` (the hourly job) only charges what is due.
    Returns {success, code?, error?, number, base, fee, total, tokens_released, payment_id}.
    """
    from payments.models import Payment, PaymentStatus, WalletBalance
    from properties.models import ConstructionInstallment

    def fail(code, error, **extra):
        return {'success': False, 'code': code, 'error': error, 'amount_paid': Decimal('0.00'),
                'tokens_released': 0, **extra}

    with transaction.atomic():
        plan = ConstructionInstallment.objects.select_for_update().select_related(
            'property_investment', 'investor').get(pk=plan.pk)
        if not (plan.is_active and plan.remaining_payments > 0):
            return fail('NOT_OPEN', 'This plan has no payment to make.')
        if auto and plan.next_payment_date and plan.next_payment_date > (today or timezone.now().date()):
            return fail('NOT_DUE', 'Not due yet.')

        number = plan.payments_made + 1
        base, fee = plan.amount_due, plan.fee_due
        total = base + fee
        WalletBalance.objects.get_or_create(user=plan.investor, currency='USD',
                                            defaults={'available_balance': Decimal('0.00')})
        wallet = WalletBalance.objects.select_for_update().get(user=plan.investor, currency='USD')
        if wallet.available_balance < total:
            return fail('INSUFFICIENT_FUNDS',
                        f'Your wallet balance is ${wallet.available_balance:,.2f}; this payment is ${total:,.2f}. '
                        'Add funds to your wallet.', number=number, total=total)

        title = plan.property_investment.title
        label = _label(plan, number)
        WalletBalance.debit(plan.investor, base, transaction_type='investment', reference_id=plan.id,
                            description=f'{label} — {title}')
        if fee > 0:
            WalletBalance.debit(plan.investor, fee, transaction_type='fee', reference_id=plan.id,
                                description=f'Installment fee ({plan.fee_rate}%) — {title}')
        payment = Payment.objects.create(
            user=plan.investor, amount=total, net_amount=total, currency='USD', payment_method='wallet',
            status=PaymentStatus.COMPLETED, completed_at=timezone.now(),
            metadata={'installment_id': str(plan.id), 'property_id': str(plan.property_investment_id),
                      'payment_number': number, 'total_payments': plan.total_installments,
                      'base': str(base), 'fee': str(fee), 'source': 'auto' if auto else 'member'},
        )
        ok, message, released = plan.process_payment(base, payment_date=timezone.now().date())
        if not ok:
            raise RuntimeError(message)  # rolls the debits back
        ConstructionInstallment.objects.filter(pk=plan.pk).update(fees_paid=F('fees_paid') + fee)
        if plan.status == 'completed':
            finish_plan(plan)

    return {'success': True, 'number': number, 'base': base, 'fee': fee, 'total': total, 'amount_paid': total,
            'tokens_released': int(released or 0), 'payment_id': str(payment.id),
            'completed': plan.status == 'completed'}


def start_plan(plan) -> dict | None:
    """
    A plan was just created: hold its shares and charge the first payment
    from the wallet when it is the down payment or already due. Must run in
    the caller's transaction — an INSUFFICIENT_FUNDS result means the caller
    rolls the plan back. Returns charge_next's result, or None if nothing is due yet.
    """
    hold_shares(plan)
    rows = plan.schedule_rows()
    first = rows[0] if rows else None
    if first and (first['kind'] == 'down_payment' or first['due_date'] <= timezone.now().date()):
        return charge_next(plan)
    return None


def run_due(today=None) -> dict:
    """The hourly job: reminders 3 days ahead, then charge every due / overdue payment."""
    from properties.models import ConstructionInstallment
    from properties.services import InstallmentProcessingService

    today = today or timezone.now().date()
    open_plans = ConstructionInstallment.objects.filter(status__in=['pending', 'processing'],
                                                        payments_made__lt=F('total_installments'))
    stats = {'reminded': 0, 'charged': 0, 'missed': 0}

    # 1. One reminder per payment, up to 3 days before it is due.
    for plan in open_plans.filter(next_payment_date__gt=today,
                                  next_payment_date__lte=today + timedelta(days=REMINDER_DAYS),
                                  reminder_sent_for__lt=F('payments_made') + 1).select_related('property_investment'):
        number = plan.payments_made + 1
        updated = ConstructionInstallment.objects.filter(pk=plan.pk, reminder_sent_for__lt=number).update(
            reminder_sent_for=number)
        if updated:
            _notify(plan.investor, 'Upcoming installment payment',
                    f'{_label(plan, number)} for {plan.property_investment.title} — ${plan.total_due:,.2f} '
                    f'— is due on {plan.next_payment_date:%Y-%m-%d}. It will be charged automatically from your '
                    'wallet; keep enough balance in it.')
            stats['reminded'] += 1

    # 2. Charge what is due (and everything overdue), oldest first.
    service = InstallmentProcessingService()
    for plan in open_plans.filter(next_payment_date__lte=today).order_by('next_payment_date'):
        for _ in range(plan.remaining_payments):
            result = service.pay_installment_from_wallet(plan, auto=True, today=today)
            if result['success']:
                stats['charged'] += 1
                plan.refresh_from_db()
                if not (plan.is_active and plan.next_payment_date and plan.next_payment_date <= today):
                    break
                continue
            if result.get('code') == 'INSUFFICIENT_FUNDS':
                number = result.get('number') or plan.payments_made + 1
                updated = ConstructionInstallment.objects.filter(pk=plan.pk, missed_notice_for__lt=number).update(
                    missed_notice_for=number)
                if updated:
                    _notify(plan.investor, 'Installment payment missed',
                            f'We could not charge {_label(plan, number).lower()} for '
                            f'{plan.property_investment.title} (${result.get("total", plan.total_due):,.2f}): '
                            'your wallet balance is not enough. Add funds — we try again every hour. '
                            'There is no late fee.')
                    stats['missed'] += 1
            break
    return stats
