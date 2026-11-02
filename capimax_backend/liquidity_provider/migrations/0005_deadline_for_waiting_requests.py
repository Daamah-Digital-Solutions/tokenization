"""
Requests made before answer deadlines existed have none, so they would wait
forever. Give each waiting one the default deadline counted from now (not from
when it was made, so none closes the moment this is deployed).
"""

from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def give_deadlines(apps, schema_editor):
    ExitRequest = apps.get_model('liquidity_provider', 'ExitRequest')
    ExitRequest.objects.filter(status__in=['pending', 'under_review', 'approved'], expires_at__isnull=True).update(
        expires_at=timezone.now() + timedelta(hours=48))


class Migration(migrations.Migration):

    dependencies = [
        ('liquidity_provider', '0004_open_requests_and_offers'),
    ]

    operations = [
        migrations.RunPython(give_deadlines, migrations.RunPython.noop),
    ]
