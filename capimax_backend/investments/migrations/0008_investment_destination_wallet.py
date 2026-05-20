"""
Add ``Investment.destination_wallet`` + backfill existing rows from the
investor's primary wallet so historical investments retain a well-defined
on-chain destination.
"""

from django.db import migrations, models


def backfill_destination_wallet(apps, schema_editor):
    Investment = apps.get_model('investments', 'Investment')
    # COALESCE-equivalent: prefer the user's primary wallet, fall back to
    # external if that's null.
    for inv in Investment.objects.select_related('user').filter(
        destination_wallet__isnull=True,
    ).iterator():
        addr = inv.user.wallet_address or inv.user.external_wallet_address
        if addr:
            inv.destination_wallet = addr
            inv.save(update_fields=['destination_wallet'])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('investments', '0007_investment_accredited_at_investment_time_and_more'),
        ('accounts', '0009_backfill_custodial_wallets'),
    ]

    operations = [
        migrations.AddField(
            model_name='investment',
            name='destination_wallet',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text=(
                    "On-chain address where this investment's tokens are minted. "
                    "Captured at creation time, immutable. Fiat → custodial; "
                    "crypto → external."
                ),
                max_length=255,
                null=True,
            ),
        ),
        migrations.RunPython(backfill_destination_wallet, reverse_noop),
    ]
