"""A settled market trade moves its tokens on-chain, seller custodial wallet -> buyer's (web3 mocked)."""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.tests.test_withdraw import SEED, _make_contract
from blockchain.models import TokenBalance, TokenTransaction
from core.factories import make_investment, make_property, make_ready_investor
from marketplace.chain_transfer import reconcile, transfer_trade
from marketplace.models import MarketListing, TradeTransaction

KEY = 'b3585384739d01904e553bf563adb96a587df7ad1fe9928a76e8e2b1d08f1e48'


def fake_chain(held=1000, status=1):
    w3 = MagicMock()
    w3.eth.gas_price = 1_000_000_000
    w3.eth.get_transaction_count.return_value = 0
    w3.eth.send_raw_transaction.return_value = MagicMock(hex=lambda: '0x' + 'e' * 64)
    w3.eth.wait_for_transaction_receipt.return_value = MagicMock(status=status, blockNumber=77, gasUsed=50_000)
    token = MagicMock()
    token.functions.balanceOf.return_value.call.return_value = held
    token.functions.safeTransferFrom.return_value.build_transaction.return_value = {'nonce': 0}
    w3.eth.contract.return_value = token
    return w3, token


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED, BLOCKCHAIN_PRIVATE_KEY=KEY)
@patch('accounts.wallet_withdraw._ensure_gas', lambda *a, **k: None)
@patch('eth_account.Account.sign_transaction', lambda *a, **k: MagicMock(raw_transaction=b'signed'))
class ChainTransferTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.seller = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.buyer = make_ready_investor(wallet_balance=Decimal('1000.00'))
        # the factory sets made-up addresses: use the custodial ones derived from the seed
        type(self.seller).objects.filter(pk__in=[self.seller.pk, self.buyer.pk]).update(wallet_address='')
        make_investment(user=self.seller, prop=self.prop, token_amount=50, investment_amount=Decimal('500.00'),
                        status='completed', completed_at=timezone.now())
        self.contract = _make_contract(self.prop)
        self.listing = MarketListing.objects.create(
            property_listing=self.prop, seller=self.seller, listing_type='sell', tokens_offered=30,
            tokens_remaining=30, price_per_token=Decimal('12.00'), minimum_order_size=1,
            expires_at=timezone.now() + timedelta(days=7))
        c = APIClient()
        c.force_authenticate(self.buyer)
        r = c.post('/api/v1/marketplace/orders/', {
            'listing': str(self.listing.id), 'order_type': 'market', 'tokens_requested': 10,
            'price_per_token': '12.00', 'total_amount': '120.00'}, format='json')
        self.assertIn(r.status_code, (200, 201), r.content)
        self.trade = TradeTransaction.objects.select_related('seller', 'buyer', 'property_traded').get()
        self.seller.refresh_from_db()
        self.buyer.refresh_from_db()

    def test_settled_trade_waits_for_the_transfer(self):
        self.assertEqual(self.trade.chain_status, 'pending')

    def test_moves_tokens_between_custodial_wallets(self):
        w3, token = fake_chain()
        with patch('marketplace.chain_transfer._web3', return_value=(w3, 97)):
            self.assertEqual(transfer_trade(self.trade), 'confirmed')
        self.seller.refresh_from_db()
        self.buyer.refresh_from_db()
        args = token.functions.safeTransferFrom.call_args.args
        self.assertEqual((args[0].lower(), args[1].lower(), args[2], args[3]),
                         (self.seller.wallet_address.lower(), self.buyer.wallet_address.lower(), 0, 10))
        self.trade.refresh_from_db()
        self.assertTrue(self.trade.blockchain_confirmed)
        self.assertEqual(self.trade.transaction_hash, '0x' + 'e' * 64)
        self.assertEqual(TokenBalance.objects.get(user=self.buyer).balance, Decimal('10'))
        self.assertTrue(TokenTransaction.objects.filter(transaction_type='transfer', token_amount=10).exists())

    def test_never_sends_twice(self):
        w3, token = fake_chain()
        w3.eth.wait_for_transaction_receipt.side_effect = TimeoutError('slow')
        with patch('marketplace.chain_transfer._web3', return_value=(w3, 97)):
            self.assertEqual(transfer_trade(self.trade), 'submitted')
            w3.eth.get_transaction_receipt.return_value = MagicMock(status=1, blockNumber=78, gasUsed=50_000)
            w3.eth.get_transaction.return_value = {'gasPrice': 1}
            self.assertEqual(transfer_trade(self.trade), 'confirmed')
        self.assertEqual(w3.eth.send_raw_transaction.call_count, 1)

    def test_tokens_not_in_custody_go_to_review(self):
        w3, _ = fake_chain(held=3)
        with patch('marketplace.chain_transfer._web3', return_value=(w3, 97)), \
                patch('marketplace.chain_transfer._alert_staff') as alert:
            self.assertEqual(transfer_trade(self.trade), 'needs_review')
        alert.assert_called_once()

    def test_revert_is_retried_then_reviewed(self):
        w3, _ = fake_chain(status=0)
        with patch('marketplace.chain_transfer._web3', return_value=(w3, 97)), \
                patch('marketplace.chain_transfer._alert_staff'):
            self.assertEqual(transfer_trade(self.trade), 'failed')
            for _ in range(4):
                TradeTransaction.objects.filter(pk=self.trade.pk).update(
                    transaction_hash=None, chain_updated_at=timezone.now() - timedelta(hours=2))
                reconcile()
        self.trade.refresh_from_db()
        self.assertEqual(self.trade.chain_status, 'needs_review')

    def test_not_tokenized_property_needs_no_transfer(self):
        self.contract.status = 'inactive'
        self.contract.save(update_fields=['status'])
        self.assertEqual(transfer_trade(self.trade), 'not_required')

    def test_buyer_holding_and_seller_history_show_the_transfer(self):
        w3, _ = fake_chain()
        with patch('marketplace.chain_transfer._web3', return_value=(w3, 97)):
            transfer_trade(self.trade)
        from investments.models import Investment
        holding = Investment.objects.get(user=self.buyer, payment_method__trade_id=str(self.trade.pk))
        self.assertEqual(holding.transaction_hash, '0x' + 'e' * 64)
        c = APIClient()
        c.force_authenticate(self.seller)
        data = c.get('/api/v1/transactions/').json()['data']
        rows = data.get('transactions') or data.get('results') or data
        sale = [r for r in rows if r['type'] == 'market_sale'][0]
        self.assertEqual(sale['transaction_hash'], '0x' + 'e' * 64)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED, BLOCKCHAIN_PRIVATE_KEY=KEY)
class CustodyGuardTests(TestCase):
    def test_shares_moved_to_an_external_wallet_cannot_be_sold(self):
        from marketplace.settlement import TradeSettlementError, _check_custody
        prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        seller = make_ready_investor()
        contract = _make_contract(prop)
        TokenBalance.objects.create(contract=contract, user=seller, property_reference=prop, token_id=0,
                                    wallet_address='0x' + 'c' * 40, balance=Decimal('50'))
        with self.assertRaises(TradeSettlementError) as ctx:
            _check_custody(seller, prop, 10)
        self.assertEqual(ctx.exception.code, 'SHARES_NOT_IN_CUSTODY')
        TokenBalance.objects.create(contract=contract, user=seller, property_reference=prop, token_id=0,
                                    wallet_address=seller.wallet_address, balance=Decimal('10'))
        _check_custody(seller, prop, 10)  # enough in custody: fine
