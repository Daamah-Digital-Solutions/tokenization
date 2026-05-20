"""
Hybrid wallet model:

- Add ``wallet_kind`` so we know whether ``wallet_address`` is platform-custodial
  or self-custody.
- Add ``external_wallet_address`` for the optional second slot used by
  crypto-native users / "link my MetaMask" flow.
- Index both wallet columns for the on-chain event-listener reverse lookup
  (``User.objects.lookup_by_wallet(address)``).

Data backfill is intentionally split into a second migration so this one is a
pure schema change and replays cleanly on any existing DB.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_admin_operator_groups'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='wallet_address',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text=(
                    "The user's primary on-chain destination. For fiat-paying "
                    "users this is auto-populated with a deterministically-derived "
                    "custodial address. For crypto-native users it is whichever "
                    "wallet they first connected."
                ),
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='wallet_kind',
            field=models.CharField(
                choices=[
                    ('custodial', 'Custodial (platform-managed)'),
                    ('external', 'External (self-custody)'),
                ],
                default='custodial',
                help_text=(
                    "Whether ``wallet_address`` is platform-custodial or self-custody."
                ),
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='external_wallet_address',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text=(
                    "Optional self-custody wallet linked by the user. Used as "
                    "destination for crypto investments and for 'withdraw to "
                    "my wallet' transfers."
                ),
                max_length=255,
                null=True,
            ),
        ),
    ]
