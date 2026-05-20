"""
Allow a user to hold the same property's tokens at multiple wallet
addresses (e.g. custodial + external). Previously the unique constraint
was ``(contract, user, property_reference, token_id)`` which is too tight
for the hybrid wallet model — a withdrawal that moves tokens from the
custodial to the external slot needs to write a second row, not collide.

Expanding the unique key to include ``wallet_address`` keeps each (slot)
balance addressable while preserving "one row per (contract, user,
property, token_id, wallet) tuple".
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('blockchain', '0002_add_backup_rpc_urls'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='tokenbalance',
            unique_together={
                ('contract', 'user', 'property_reference', 'token_id', 'wallet_address'),
            },
        ),
    ]
