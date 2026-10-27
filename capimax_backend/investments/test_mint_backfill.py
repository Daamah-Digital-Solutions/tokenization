"""mint_unminted_holdings: ledger-only holdings of tokenized properties go to the mint queue, never refunded."""

from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from core.factories import make_investment, make_property, make_ready_investor
from investments.models import Investment
from investments.tasks import auto_refund_failed_mint


class MintBackfillTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor()
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000, status='tokenized',
                                  smart_contract_address='0x' + 'a' * 40)
        self.inv = make_investment(user=self.user, prop=self.prop, token_amount=8,
                                   investment_amount=Decimal('80.00'), status='completed')

    def test_dry_run_changes_nothing(self):
        out = StringIO()
        call_command('mint_unminted_holdings', stdout=out)
        self.assertIn('1 holding(s) to mint', out.getvalue())
        self.assertEqual(Investment.objects.get(pk=self.inv.pk).status, 'completed')

    def test_apply_queues_the_mint_and_a_failure_is_never_refunded(self):
        call_command('mint_unminted_holdings', '--apply', stdout=StringIO())
        inv = Investment.objects.get(pk=self.inv.pk)
        self.assertEqual(inv.status, 'pending_mint')
        self.assertTrue(inv.payment_method['backfill_mint'])
        Investment.objects.filter(pk=inv.pk).update(status='mint_failed')
        self.assertEqual(auto_refund_failed_mint.run(str(inv.pk))['reason'], 'backfill_mint')
        self.assertEqual(Investment.objects.get(pk=inv.pk).status, 'mint_failed')
