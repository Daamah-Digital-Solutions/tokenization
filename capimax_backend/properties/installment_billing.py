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
  * The first payment (down payment, or installment 1) can also be paid by
    card, Pronova or crypto through the provider's page (PropShare model):
    the plan waits ("awaiting_payment", shares held 30 minutes) and starts
    when the provider confirms the payment. Not paid in time -> the shares go
    back on sale; paid late -> the plan starts if its shares are still free
    at the same price, otherwise the money goes to the wallet.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)

REMINDER_DAYS = 3

# First payment through a hosted checkout (purchase method -> Payment.payment_method)
HOSTED_METHODS = ('card', 'pronova', 'crypto')
CHECKOUT_HOLD = timedelta(minutes=30)
START_PURPOSE = 'installment_start'
AWAITING = 'awaiting_payment'


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


def open_checkout(plan, method: str, *, pay_currency: str | None = None):
    """
    The plan's first payment will be paid on the provider's page: hold its
    shares for the checkout and create the pending Payment (base + fee, less
    the Pronova discount). Runs in the caller's transaction.
    """
    from investments.models import TokenReservation
    from investments.purchase import PAYMENT_METHOD_CODE
    from payments.models import Payment, PlatformFeeSettings

    TokenReservation.objects.create(user=plan.investor, property_investment=plan.property_investment,
                                    token_amount=plan.token_allocation,
                                    expires_at=timezone.now() + CHECKOUT_HOLD, installment_plan=plan)
    base, fee = plan.amount_due, plan.fee_due
    total = base + fee
    discount = Decimal('0.00')
    if method == 'pronova':
        pct = Decimal(PlatformFeeSettings.current().pronova_discount_pct or 0)
        discount = (total * pct / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    due = total - discount
    meta = {
        'purpose': START_PURPOSE, 'installment_id': str(plan.id),
        'property_id': str(plan.property_investment_id), 'shares': plan.token_allocation,
        'payment_number': 1, 'total_payments': plan.total_installments,
        'base': str(base), 'fee': str(fee), 'discount': str(discount),
        'provider': 'nowpayments' if method == 'crypto' else 'stripe',
    }
    if pay_currency and method == 'crypto':
        meta['pay_currency'] = pay_currency
    return Payment.objects.create(user=plan.investor, amount=due, net_amount=due, currency='USD',
                                  payment_method=PAYMENT_METHOD_CODE[method], status='pending', metadata=meta)


def _release_unstarted(plan, *, reason: str) -> None:
    """A plan whose first payment never arrived: its shares go back on sale."""
    plan.reservations.filter(released=False).update(released=True)
    plan.status = 'cancelled'
    plan.notes = (f'{plan.notes}\n' if plan.notes else '') + f'Not started: {reason}'
    plan.save(update_fields=['status', 'notes', 'updated_at'])


def settle_first_payment(payment) -> str:
    """
    The provider confirmed a plan's first payment (called by settle_payment,
    under the payment lock): start the plan. Returns 'started', 'refunded'
    or 'already'.
    """
    from investments.models import TokenReservation
    from investments.purchase import available_shares
    from payments.models import WalletBalance
    from properties.models import ConstructionInstallment, Property

    meta = payment.metadata or {}
    plan = ConstructionInstallment.objects.select_for_update().select_related(
        'property_investment', 'investor').filter(pk=meta.get('installment_id')).first()
    if plan is not None and plan.status not in (AWAITING, 'cancelled'):
        return 'already'

    def refund(why: str) -> str:
        WalletBalance.credit(payment.user, payment.amount, transaction_type='refund', reference_id=payment.id,
                             description=f'Refund: {why}')
        _notify(payment.user, 'Installment plan not started',
                f'{why} We refunded ${Decimal(payment.amount):,.2f} to your wallet.')
        return 'refunded'

    if plan is None:
        return refund('your first installment payment arrived, but its plan no longer exists.')

    prop = Property.objects.select_for_update().get(pk=plan.property_investment_id)
    held = plan.reservations.filter(released=False, expires_at__gt=timezone.now()).exists()
    if not held:
        # Paid after the hold ran out: the plan starts only at the same price, with free shares.
        plan.reservations.filter(released=False).update(released=True)
        same_price = plan.token_allocation and (
            (prop.token_price * plan.token_allocation).quantize(Decimal('0.01'))
            == Decimal(plan.total_investment_amount).quantize(Decimal('0.01')))
        if not same_price or available_shares(prop) < plan.token_allocation:
            if plan.status != 'cancelled':
                _release_unstarted(plan, reason='first payment arrived after the shares were released')
            return refund(f'the shares of {prop.title} were released before your first installment '
                          'payment was confirmed, so the plan did not start.')
        TokenReservation.objects.create(user=plan.investor, property_investment=prop,
                                        token_amount=plan.token_allocation, installment_plan=plan,
                                        expires_at=None)
    else:
        # From now on the plan holds its shares until it ends.
        plan.reservations.filter(released=False).update(expires_at=None)

    today = timezone.now().date()
    plan.status = 'pending'
    plan.start_date = today
    plan.save(update_fields=['status', 'start_date', 'updated_at'])
    base = Decimal(meta.get('base') or plan.amount_due)
    fee = Decimal(meta.get('fee') or plan.fee_due)
    ok, message, _released = plan.process_payment(base, payment_date=today)
    if not ok:
        raise RuntimeError(message)
    ConstructionInstallment.objects.filter(pk=plan.pk).update(fees_paid=F('fees_paid') + fee)
    if plan.status == 'completed':
        finish_plan(plan)
    try:
        from properties.services import InstallmentProcessingService
        InstallmentProcessingService()._send_payment_success_notification(plan, Decimal(payment.amount))
    except Exception:  # noqa: BLE001
        logger.exception('Installment start notice failed for plan %s', plan.pk)
    return 'started'


def fail_first_payment(payment) -> None:
    """The provider says the first payment will not be paid: release the plan's shares."""
    from properties.models import ConstructionInstallment

    plan = ConstructionInstallment.objects.select_for_update().filter(
        pk=(payment.metadata or {}).get('installment_id'), status=AWAITING).first()
    if plan is not None:
        _release_unstarted(plan, reason='the first payment was not completed')


def expire_unpaid_plans(now=None) -> int:
    """Plans whose first payment was not made in time (the 5-minute job)."""
    from payments.models import Payment
    from properties.models import ConstructionInstallment

    now = now or timezone.now()
    count = 0
    for plan in ConstructionInstallment.objects.filter(status=AWAITING,
                                                       created_at__lte=now - CHECKOUT_HOLD):
        with transaction.atomic():
            locked = ConstructionInstallment.objects.select_for_update().get(pk=plan.pk)
            if locked.status != AWAITING or locked.reservations.filter(
                    released=False, expires_at__gt=now).exists():
                continue
            _release_unstarted(locked, reason='the first payment was not made in time')
            Payment.objects.filter(status='pending', metadata__purpose=START_PURPOSE,
                                   metadata__installment_id=str(locked.pk)).update(status='cancelled')
            count += 1
    return count


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
            how = ('It will be charged automatically from your wallet; keep enough balance in it.' if plan.auto_debit
                   else 'Pay it from your wallet in Dashboard → Installments.')
            _notify(plan.investor, 'Upcoming installment payment',
                    f'{_label(plan, number)} for {plan.property_investment.title} — ${plan.total_due:,.2f} '
                    f'— is due on {plan.next_payment_date:%Y-%m-%d}. {how}')
            stats['reminded'] += 1

    # 2. Charge what is due (and everything overdue), oldest first.
    service = InstallmentProcessingService()
    for plan in open_plans.filter(next_payment_date__lte=today, auto_debit=True).order_by('next_payment_date'):
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
