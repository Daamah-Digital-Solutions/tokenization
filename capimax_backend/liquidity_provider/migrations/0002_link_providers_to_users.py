"""
Link existing liquidity providers to their platform accounts and give those
accounts the new `liquidity_provider` role (client round 3, #9), so an LP
who signs in lands on the LP dashboard instead of the investor one.
"""

from django.db import migrations


def link_existing_providers(apps, schema_editor):
    LiquidityProvider = apps.get_model('liquidity_provider', 'LiquidityProvider')
    User = apps.get_model('accounts', 'User')
    UserRoleAssignment = apps.get_model('accounts', 'UserRoleAssignment')

    for lp in LiquidityProvider.objects.all():
        user = None
        if lp.user_id:
            user = User.objects.filter(pk=lp.user_id).first()
        elif lp.official_email:
            user = User.objects.filter(email__iexact=lp.official_email.strip()).first()
            if user and not LiquidityProvider.objects.filter(user=user).exists():
                lp.user = user
                lp.save(update_fields=['user'])
            elif user:
                user = None
        if user is None:
            continue
        assignment, _ = UserRoleAssignment.objects.get_or_create(
            user=user, role='liquidity_provider',
            defaults={'is_active': True, 'is_primary': False},
        )
        if user.role in ('investor', '', None):
            UserRoleAssignment.objects.filter(user=user, is_primary=True).update(is_primary=False)
            assignment.is_primary = True
            assignment.is_active = True
            assignment.save(update_fields=['is_primary', 'is_active'])
            user.role = 'liquidity_provider'
            user.save(update_fields=['role'])


class Migration(migrations.Migration):

    dependencies = [
        ('liquidity_provider', '0001_initial'),
        ('accounts', '0010_liquidity_provider_role'),
    ]

    operations = [
        migrations.RunPython(link_existing_providers, migrations.RunPython.noop),
    ]
