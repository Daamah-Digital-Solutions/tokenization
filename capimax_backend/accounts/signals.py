"""
Signal handlers that wire the auto-custodial-wallet behavior.

Every new user automatically gets a custodial wallet address assigned at
creation. The private key is never persisted — it is re-derivable from the
master seed at any time. See ``accounts.custody`` for the derivation.

If the master seed is not configured the signal is a no-op and the user is
created with ``wallet_address = NULL``. The mint pipeline will still refuse
to mint without an address, but at least the signal doesn't blow up the
signup flow.
"""

import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .custody import (
    CustodyConfigurationError,
    derive_custodial_wallet,
    is_custody_configured,
)
from .models import User, WalletKind

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def assign_custodial_wallet_on_create(sender, instance, created, **kwargs):
    """Assign a custodial wallet to fiat-default users when they first appear."""
    if not created:
        return
    # Users who already arrived with an external wallet (e.g. crypto-native
    # signup flow that captured a connected address) keep it as-is.
    if instance.wallet_address:
        return
    if instance.wallet_kind == WalletKind.EXTERNAL:
        return
    if not is_custody_configured():
        # Don't crash signup just because the operator forgot the seed; log
        # loudly and let downstream logic surface the gap.
        logger.warning(
            "User %s created but PLATFORM_CUSTODY_MASTER_SEED is not "
            "configured. They have no wallet_address; mints will fail.",
            instance.pk,
        )
        return
    try:
        derived = derive_custodial_wallet(instance.pk)
    except CustodyConfigurationError:
        logger.exception(
            "Custody misconfigured at User post_save for user %s", instance.pk,
        )
        return
    # Update via QuerySet to avoid recursive post_save firing.
    User.objects.filter(pk=instance.pk).update(
        wallet_address=derived.address,
        wallet_kind=WalletKind.CUSTODIAL,
    )
    instance.wallet_address = derived.address
    instance.wallet_kind = WalletKind.CUSTODIAL
    logger.info(
        "Auto-assigned custodial wallet %s to new user %s",
        derived.address, instance.pk,
    )
