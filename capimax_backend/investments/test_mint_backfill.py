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


class UnlandedHoldingTests(TestCase):
    """Seed rows with a hash that never landed: the daily check finds them, --unlanded re-mints exactly the gap."""

    def setUp(self):
        from unittest.mock import MagicMock

        from accounts.tests.test_withdraw import _make_contract
        from blockchain.models import TokenBalance

        self.user = make_ready_investor()
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000, status='tokenized',
                                  smart_contract_address='0x' + 'a' * 40)
        self.contract = _make_contract(self.prop)
        self.real = make_investment(user=self.user, prop=self.prop, token_amount=10, investment_amount=Decimal('100'),
                                    status='completed', transaction_hash='0x' + '1' * 64)
        self.fake = make_investment(user=self.user, prop=self.prop, token_amount=90, investment_amount=Decimal('900'),
                                    status='completed', transaction_hash='0x64656d6f' + '0' * 56)
        TokenBalance.objects.create(contract=self.contract, user=self.user, property_reference=self.prop, token_id=0,
                                    wallet_address=self.user.wallet_address, balance=Decimal('100'))
        self.w3 = MagicMock()
        self.w3.eth.contract.return_value.functions.balanceOf.return_value.call.return_value = 10

        def receipt(h):
            if h == self.real.transaction_hash:
                return {'status': 1}
            raise ValueError('not found')
        self.w3.eth.get_transaction_receipt.side_effect = receipt

    def _chain(self):
        from unittest.mock import patch
        return patch('marketplace.chain_transfer._web3', return_value=(self.w3, 97))

    def test_daily_check_reports_the_gap(self):
        from payments.reconciliation import holdings_on_chain
        with self._chain():
            findings = holdings_on_chain()
        self.assertEqual(len(findings), 1)
        self.assertIn('100 shares on the platform, 10 on-chain', findings[0]['message'])

    def test_unlanded_remints_only_the_rows_that_never_landed(self):
        from blockchain.models import TokenBalance
        with self._chain():
            call_command('mint_unminted_holdings', '--unlanded', stdout=StringIO())
            self.assertEqual(Investment.objects.get(pk=self.fake.pk).status, 'completed')  # dry run
            call_command('mint_unminted_holdings', '--unlanded', '--apply', stdout=StringIO())
        fake, real = Investment.objects.get(pk=self.fake.pk), Investment.objects.get(pk=self.real.pk)
        self.assertEqual((fake.status, fake.transaction_hash), ('pending_mint', None))
        self.assertTrue(fake.payment_method['unlanded_hash'].startswith('0x64656d6f'))
        self.assertEqual(real.status, 'completed')
        self.assertEqual(TokenBalance.objects.get(user=self.user).balance, Decimal('10'))  # follows the chain

    def test_gap_not_explained_by_unlanded_rows_is_left_alone(self):
        self.w3.eth.contract.return_value.functions.balanceOf.return_value.call.return_value = 50
        out = StringIO()
        with self._chain():
            call_command('mint_unminted_holdings', '--unlanded', '--apply', stdout=out)
        self.assertIn('NEEDS A LOOK', out.getvalue())
        self.assertEqual(Investment.objects.get(pk=self.fake.pk).status, 'completed')
