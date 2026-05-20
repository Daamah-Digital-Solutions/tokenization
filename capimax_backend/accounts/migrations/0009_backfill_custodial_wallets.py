"""
Backfill custodial wallet addresses for existing users.

Strategy:
- For any user with ``wallet_address`` already set, do nothing — they already
  have a destination. Mark their ``wallet_kind`` as ``external`` (the value
  was set by some external process — admin, demo seed, etc.) so we never try
  to sign on their behalf with our master seed.
- For users with no ``wallet_address``, derive a custodial address from the
  master seed and assign it. If the master seed is not configured, skip the
  user — they will get a wallet at next login if we configure the seed later.

This migration tolerates the seed not being set so it does not block fresh
test environments. It also runs idempotently — re-running is a no-op.
"""

import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def backfill_custodial_wallets(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # Tag users who already have an address as external — we don't own that key.
    User.objects.filter(wallet_address__isnull=False).exclude(
        wallet_address='',
    ).update(wallet_kind='external')

    # For everyone else, derive a custodial address.
    try:
        # Import lazily so the migration doesn't crash in environments where
        # eth_account isn't yet installed (e.g. pre-deploy migrate dry-runs).
        from accounts.custody import (
            derive_custodial_wallet,
            is_custody_configured,
        )
    except ImportError:
        logger.warning(
            "accounts.custody could not be imported; skipping custodial backfill."
        )
        return

    if not is_custody_configured():
        logger.warning(
            "PLATFORM_CUSTODY_MASTER_SEED not set; skipping custodial backfill. "
            "Run `manage.py shell` and call accounts.custody.ensure_user_has_wallet "
            "per user once the seed is configured."
        )
        return

    qs = User.objects.filter(wallet_address__isnull=True) | User.objects.filter(
        wallet_address='',
    )
    count = 0
    for user in qs.iterator():
        try:
            derived = derive_custodial_wallet(user.pk)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to derive wallet for user %s", user.pk)
            continue
        User.objects.filter(pk=user.pk).update(
            wallet_address=derived.address,
            wallet_kind='custodial',
        )
        count += 1
    logger.info("Backfilled %d custodial wallets", count)


def reverse_noop(apps, schema_editor):
    # Reversing the backfill is not safe — investors may already hold tokens
    # at these addresses on-chain. Refuse to clear them.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_hybrid_wallet_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_custodial_wallets, reverse_noop),
    ]
