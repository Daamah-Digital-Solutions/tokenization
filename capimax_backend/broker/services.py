"""
Broker referral lifecycle helpers (client #6a — "refer a lead").

These two functions wire up what used to be a dead loop — a broker could
generate a referral link, but nothing ever linked a referred user or paid a
referral commission:

  * ``attach_referral``           — called at registration when a user signs up
                                    with ``?ref=CODE``; links the new user to the
                                    broker behind the code.
  * ``record_referral_conversion`` — called (via an investments post_save signal)
                                    the first time a referred user's investment
                                    succeeds; marks the referral converted and
                                    books a PENDING referral ``BrokerCommission``
                                    that flows through the existing
                                    commission → wallet payout path.

Both are defensively wrapped: a referral problem must never break registration
or an investment save.
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

# Investment statuses that mean the money is really committed (token minting may
# still be in flight). The first time a referred user reaches any of these, the
# referral converts and the commission is booked.
_SUCCESS_STATUSES = {'payment_confirmed', 'pending_mint', 'minting', 'completed'}


def attach_referral(user, code):
    """
    Link a freshly-registered ``user`` to the broker behind referral ``code``.

    Safe with any/blank code — unknown, inactive or expired codes are ignored so
    a bad ``?ref`` can never block registration. One shared link can refer many
    users: if the matched referral row is still unclaimed we take it, otherwise
    we create a fresh row for the same broker.
    """
    if not code:
        return None

    from .models import BrokerReferral  # local import avoids app-load cycles

    code = str(code).strip()
    if not code:
        return None
    try:
        referral = (
            BrokerReferral.objects
            .select_related('broker')
            .filter(referral_code=code, is_active=True)
            .first()
        )
        if not referral:
            return None
        if referral.expires_at and referral.expires_at < timezone.now():
            return None

        if referral.referred_user_id is None:
            referral.referred_user = user
            referral.save(update_fields=['referred_user', 'updated_at'])
            return referral

        # Code already claimed by an earlier signup — attach this user to the
        # same broker through a new referral row.
        return BrokerReferral.objects.create(
            broker=referral.broker,
            referred_user=user,
            notes=f'Via shared referral link {code}',
        )
    except Exception as exc:  # never break registration on a referral hiccup
        logger.warning("attach_referral failed for code %r: %s", code, exc)
        return None


def record_referral_conversion(investment):
    """
    First successful investment by a referred user → convert the referral and
    book a PENDING referral commission for the broker.

    Idempotent via the referral's ``is_converted`` flag, so a broker is paid a
    referral commission at most once per referred user. Wrapped so it can be
    called from a post_save signal without ever breaking the investment save.
    """
    try:
        status = getattr(investment, 'status', None)
        user_id = getattr(investment, 'user_id', None)
        if status not in _SUCCESS_STATUSES or not user_id:
            return None

        from .models import (
            BrokerReferral, BrokerCommission, CommissionType, CommissionStatus,
        )

        with transaction.atomic():
            referral = (
                BrokerReferral.objects
                .select_for_update()
                .select_related('broker')
                .filter(referred_user_id=user_id, is_converted=False)
                .order_by('created_at')
                .first()
            )
            if not referral:
                return None

            broker = referral.broker
            amount = investment.investment_amount or Decimal('0.00')
            commission_amount = broker.calculate_commission(
                amount, CommissionType.REFERRAL
            )

            referral.is_converted = True
            referral.first_investment_at = timezone.now()
            referral.conversion_amount = amount
            referral.commission_earned = commission_amount
            referral.save(update_fields=[
                'is_converted', 'first_investment_at',
                'conversion_amount', 'commission_earned', 'updated_at',
            ])

            commission = BrokerCommission.objects.create(
                broker=broker,
                investment=investment,
                referral=referral,
                commission_type=CommissionType.REFERRAL,
                base_amount=amount,
                commission_rate=broker.referral_commission_rate,
                commission_amount=commission_amount,
                status=CommissionStatus.PENDING,
            )
            logger.info(
                "Referral %s converted; pending referral commission %s (%s) for broker %s",
                referral.id, commission.id, commission_amount, broker.id,
            )
            return commission
    except Exception as exc:  # never break an investment save
        logger.warning("record_referral_conversion failed: %s", exc)
        return None
