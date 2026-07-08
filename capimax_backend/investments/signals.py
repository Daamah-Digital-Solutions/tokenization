"""
Investment signals.

Wires the broker referral conversion (client #6a): the first time a referred
user's investment reaches a money-committed status, the broker's referral is
converted and a PENDING referral commission is booked. All the real work lives
in ``broker.services.record_referral_conversion`` and is defensively wrapped
there, so this receiver only routes the event and never raises.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Investment


@receiver(post_save, sender=Investment, dispatch_uid='broker_referral_conversion')
def book_referral_commission(sender, instance, **kwargs):
    """On any investment save, let the broker app convert a referral if due."""
    from broker.services import record_referral_conversion
    record_referral_conversion(instance)
