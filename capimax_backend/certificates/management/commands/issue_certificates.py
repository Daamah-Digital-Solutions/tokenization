"""
Issue certificates for holdings that do not have one yet (first deploy), and bring
existing ones in step. Silent: holders are not notified for back-issued certificates.

    python manage.py issue_certificates            # dry run
    python manage.py issue_certificates --apply
"""

from django.core.management.base import BaseCommand

from investments.models import Investment
from properties.models import ConstructionInstallment

from ...models import Certificate
from ...services import PROVISIONAL_INVESTMENT, sync_investment, sync_plan


class Command(BaseCommand):
    help = 'Issue / re-sync ownership certificates for every paid holding.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, apply=False, **options):
        invs = (Investment.objects.filter(status__in=[*PROVISIONAL_INVESTMENT, 'completed'], token_amount__gt=0)
                .select_related('user', 'property_investment'))
        plans = ConstructionInstallment.objects.exclude(status__in=['cancelled', 'refunded', 'failed']) \
            .select_related('investor', 'property_investment')
        missing_inv = invs.exclude(certificates__status__in=['provisional', 'final'])
        missing_plan = plans.exclude(certificates__status__in=['provisional', 'final'])
        self.stdout.write(f'{invs.count()} paid purchase(s), {missing_inv.count()} without a certificate; '
                          f'{plans.count()} installment plan(s), {missing_plan.count()} without one.')
        if not apply:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Re-run with --apply.'))
            return
        before = Certificate.objects.count()
        for inv in invs:
            sync_investment(inv, notify=False)
        for plan in plans:
            sync_plan(plan, notify=False)
        self.stdout.write(self.style.SUCCESS(f'{Certificate.objects.count() - before} certificate(s) issued; '
                                             f'all holdings in step.'))
