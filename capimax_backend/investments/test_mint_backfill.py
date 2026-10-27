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
    """Seed rows whose transaction never landed or delivered less: the daily check finds them,
    --unlanded mints exactly the missing shares."""

    TS = 'c3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'  # TransferSingle topic

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
        self.delivers = {self.real.transaction_hash: 10}  # hash -> shares its receipt delivered to the owner
        self.w3 = MagicMock()
        self.w3.eth.contract.return_value.functions.balanceOf.return_value.call.return_value = 10
        self.w3.eth.get_transaction_receipt.side_effect = self._receipt

    def _receipt(self, tx_hash):
        if tx_hash not in self.delivers:
            raise ValueError('not found')
        log = {'address': self.contract.contract_address,
               'topics': ['0x' + self.TS, '0x' + '0' * 64, '0x' + '0' * 64,
                          '0x' + '0' * 24 + self.user.wallet_address.lower()[2:]],
               'data': '0x' + f'{0:064x}' + f'{self.delivers[tx_hash]:064x}'}
        return {'status': 1, 'logs': [log]}

    def _chain(self):
        from unittest.mock import patch
        return patch('marketplace.chain_transfer._web3', return_value=(self.w3, 97))

    def test_daily_check_reports_the_gap(self):
        from payments.reconciliation import holdings_on_chain
        with self._chain():
            findings = holdings_on_chain()
        self.assertEqual(len(findings), 1)
        self.assertIn('100 shares on the platform, 10 on-chain', findings[0]['message'])

    def test_hash_that_never_landed_goes_back_to_the_mint_queue(self):
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

    def test_transaction_that_delivered_less_gets_the_rest_minted(self):
        from unittest.mock import patch

        from blockchain.models import TokenBalance
        self.delivers[self.fake.transaction_hash] = 20  # landed, but only 20 of 90
        self.w3.eth.contract.return_value.functions.balanceOf.return_value.call.return_value = 30
        svc = patch('blockchain.services.web3_service.Web3Service').start()
        self.addCleanup(patch.stopall)
        svc.return_value.initialize_network.return_value = True
        svc.return_value.account.address = '0x' + 'd' * 40
        svc.return_value.call_contract_function.return_value = {'status': 1, 'transaction_hash': '0x' + 'f' * 64}
        with self._chain():
            call_command('mint_unminted_holdings', '--unlanded', '--apply', stdout=StringIO())
        args = svc.return_value.call_contract_function.call_args.kwargs['args']
        self.assertEqual(args[2], 70)
        fake = Investment.objects.get(pk=self.fake.pk)
        self.assertEqual((fake.status, fake.transaction_hash[:10]), ('completed', '0x64656d6f'))
        self.assertEqual(fake.payment_method['top_up_mints'][0]['amount'], 70)
        self.assertEqual(TokenBalance.objects.get(user=self.user).balance, Decimal('100'))  # 30 on-chain + 70

    def test_gap_not_explained_by_the_recorded_transactions_is_left_alone(self):
        self.w3.eth.contract.return_value.functions.balanceOf.return_value.call.return_value = 50
        out = StringIO()
        with self._chain():
            call_command('mint_unminted_holdings', '--unlanded', '--apply', stdout=out)
        self.assertIn('NEEDS A LOOK', out.getvalue())
        self.assertEqual(Investment.objects.get(pk=self.fake.pk).status, 'completed')
