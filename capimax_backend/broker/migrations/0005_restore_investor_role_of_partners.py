"""
Approving a broker / liquidity-provider application used to replace the
account's investor role instead of adding to it: the account could no longer
buy or open the investor dashboard. Give those accounts their investor role
back (as a non-primary role, so they still open their partner dashboard).
"""

from django.db import migrations

PARTNER_ROLES = ('broker', 'liquidity_provider')


def restore(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    UserRoleAssignment = apps.get_model('accounts', 'UserRoleAssignment')
    for user in User.objects.filter(role__in=PARTNER_ROLES).only('id'):
        UserRoleAssignment.objects.get_or_create(
            user=user, role='investor', defaults={'is_active': True, 'is_primary': False})


class Migration(migrations.Migration):

    dependencies = [
        ('broker', '0004_broker_application_reapply'),
        ('accounts', '0010_liquidity_provider_role'),
    ]

    operations = [
        migrations.RunPython(restore, migrations.RunPython.noop),
    ]
