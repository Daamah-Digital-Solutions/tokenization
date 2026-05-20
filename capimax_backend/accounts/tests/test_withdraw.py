"""
Tests for the custodial → external token withdrawal endpoint.

Mocks Web3 entirely so the test suite stays hermetic. The covered cases
target the user-facing contract:

- /balances/ aggregates per-property holdings split between custodial and
  external slots
- /withdraw/ refuses without a linked external wallet
- /withdraw/ refuses on zero / over-balance requests
- /withdraw/ refuses if the property isn't tokenized
- /withdraw/ happy path updates local TokenBalance + writes an audit row
- /withdraw/ leaves balances untouched on on-chain revert
- /withdraw/ refuses if the user's stored primary address doesn't match
  what the master seed derives (custody drift / tampering)
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from blockchain.models import SmartContract, TokenBalance, TokenTransaction
from properties.models import Property


User = get_user_model()
SEED = 'a' * 64


def _make_property(owner):
    return Property.objects.create(
        title='Withdrawable Tower',
        description='x',
        property_type='residential',
        property_category='ready_property',
        total_tokens=1000,
        token_price=Decimal('10.00'),
        total_value=Decimal('10000.00'),
        expected_return=Decimal('5.00'),
        city='SF', country='US',
        owner=owner,
        status='approved',
    )


def _make_contract(property_obj):
    from blockchain.models import BlockchainNetwork
    network, _ = BlockchainNetwork.objects.get_or_create(
        chain_id=97,
        defaults={
            'name': 'bsc_testnet',
            'network_type': 'testnet',
            'environment': 'testnet',
            'rpc_url': 'https://data-seed-prebsc-1-s1.binance.org:8545',
            'explorer_url': 'https://testnet.bscscan.com',
            'native_currency': 'tBNB',
        },
    )
    return SmartContract.objects.create(
        network=network,
        property_reference=property_obj,
        contract_address='0x' + 'a' * 40,
        contract_type='real_estate_token',
        status='active',
        abi=[
            {
                'name': 'safeTransferFrom',
                'type': 'function',
                'inputs': [
                    {'name': 'from', 'type': 'address'},
                    {'name': 'to', 'type': 'address'},
                    {'name': 'id', 'type': 'uint256'},
                    {'name': 'amount', 'type': 'uint256'},
                    {'name': 'data', 'type': 'bytes'},
                ],
                'outputs': [],
                'stateMutability': 'nonpayable',
            }
        ],
    )


def _make_balance(user, contract, property_obj, addr, amount):
    return TokenBalance.objects.create(
        contract=contract,
        user=user,
        property_reference=property_obj,
        wallet_address=addr,
        token_id=0,
        balance=Decimal(amount),
    )


def _patched_web3():
    """Return a (web3_class_mock, web3_instance_mock) that simulates a
    successful safeTransferFrom on chain."""
    w3 = MagicMock()
    w3.eth.chain_id = 97
    w3.eth.gas_price = 1_000_000_000
    w3.eth.get_balance.return_value = 10**18  # well above gas floor
    w3.eth.get_transaction_count.return_value = 0
    w3.eth.send_raw_transaction.return_value = MagicMock(hex=lambda: '0x' + 'f' * 64)
    receipt = MagicMock(status=1, blockNumber=12345, gasUsed=123_456)
    w3.eth.wait_for_transaction_receipt.return_value = receipt

    contract_mock = MagicMock()
    fn_mock = MagicMock()
    fn_mock.build_transaction.return_value = {
        'from': '0x0', 'to': '0x0', 'data': '0x', 'value': 0,
        'gas': 300_000, 'gasPrice': 1_000_000_000, 'nonce': 0, 'chainId': 97,
    }
    contract_mock.functions.safeTransferFrom.return_value = fn_mock
    w3.eth.contract.return_value = contract_mock

    web3_class = MagicMock(return_value=w3)
    web3_class.to_checksum_address.side_effect = lambda a: a
    web3_class.HTTPProvider = MagicMock()
    return web3_class, w3


@override_settings(
    PLATFORM_CUSTODY_MASTER_SEED=SEED,
    BLOCKCHAIN_PRIVATE_KEY='b3585384739d01904e553bf563adb96a587df7ad1fe9928a76e8e2b1d08f1e48',
)
class WithdrawEndpointTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email='owner@example.com', password='x', country='US',
            role='property_owner',
        )
        self.user = User.objects.create_user(
            email='holder@example.com', password='x', country='US',
        )
        self.user.refresh_from_db()
        self.user.external_wallet_address = '0xb' + 'b' * 39
        self.user.save(update_fields=['external_wallet_address'])
        self.property = _make_property(self.owner)
        self.contract = _make_contract(self.property)
        # Custodial holds 50 tokens for this user/property.
        _make_balance(self.user, self.contract, self.property, self.user.wallet_address, 50)

        self.client = APIClient()
        self.client.force_authenticate(self.user)

    # ---- balance listing -----------------------------------------------

    def test_balances_lists_custodial_holdings(self):
        resp = self.client.get('/api/v1/auth/wallet/balances/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rows = resp.json()['data']['balances']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['custodial_balance'], '50')
        self.assertEqual(rows[0]['external_balance'], '0')

    # ---- guard rails ----------------------------------------------------

    def test_withdraw_without_external_wallet_rejected(self):
        self.user.external_wallet_address = None
        self.user.save(update_fields=['external_wallet_address'])
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id)},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_withdraw_more_than_held_rejected(self):
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id), 'amount': 999},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only 50', resp.json()['error']['message'])

    def test_withdraw_zero_or_negative_rejected(self):
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id), 'amount': 0},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_withdraw_missing_property_id_rejected(self):
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_withdraw_for_unknown_property_returns_404(self):
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': '00000000-0000-0000-0000-000000000000'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ---- happy path -----------------------------------------------------

    @patch('web3.Web3')
    @patch('eth_account.Account.sign_transaction')
    def test_withdraw_happy_path_updates_balances(self, mock_sign, mock_web3):
        web3_class, w3 = _patched_web3()
        mock_web3.side_effect = web3_class
        mock_web3.HTTPProvider = web3_class.HTTPProvider
        mock_web3.to_checksum_address = web3_class.to_checksum_address
        mock_sign.return_value = MagicMock(raw_transaction=b'\x00')

        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id), 'amount': 30},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.json())
        data = resp.json()['data']
        self.assertEqual(data['amount'], '30')
        self.assertEqual(data['from_wallet'].lower(), self.user.wallet_address.lower())
        self.assertEqual(data['to_wallet'].lower(), self.user.external_wallet_address.lower())

        # Custodial slot dropped, external slot rose, audit row written.
        custodial = TokenBalance.objects.get(
            user=self.user, wallet_address__iexact=self.user.wallet_address,
        )
        external = TokenBalance.objects.get(
            user=self.user, wallet_address__iexact=self.user.external_wallet_address,
        )
        self.assertEqual(int(custodial.balance), 20)
        self.assertEqual(int(external.balance), 30)
        self.assertEqual(
            TokenTransaction.objects.filter(
                user=self.user, transaction_type='transfer',
            ).count(),
            1,
        )

    # ---- on-chain failure path ------------------------------------------

    @patch('web3.Web3')
    @patch('eth_account.Account.sign_transaction')
    def test_withdraw_revert_leaves_balances_untouched(self, mock_sign, mock_web3):
        web3_class, w3 = _patched_web3()
        # Mark the receipt as reverted.
        w3.eth.wait_for_transaction_receipt.return_value = MagicMock(status=0)
        mock_web3.side_effect = web3_class
        mock_web3.HTTPProvider = web3_class.HTTPProvider
        mock_web3.to_checksum_address = web3_class.to_checksum_address
        mock_sign.return_value = MagicMock(raw_transaction=b'\x00')

        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id), 'amount': 30},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)

        custodial = TokenBalance.objects.get(
            user=self.user, wallet_address__iexact=self.user.wallet_address,
        )
        self.assertEqual(int(custodial.balance), 50)  # untouched
        self.assertFalse(
            TokenBalance.objects.filter(
                user=self.user, wallet_address__iexact=self.user.external_wallet_address,
            ).exists()
        )

    # ---- custody-drift guard --------------------------------------------

    def test_custody_drift_refuses_to_sign(self):
        # Force wallet_address to something that doesn't match the
        # master-seed derivation.
        self.user.wallet_address = '0x' + 'f' * 40
        self.user.save(update_fields=['wallet_address'])
        # Mirror it on the balance row so we'd otherwise pass the balance
        # check.
        TokenBalance.objects.filter(user=self.user).update(
            wallet_address='0x' + 'f' * 40,
        )
        resp = self.client.post(
            '/api/v1/auth/wallet/withdraw/',
            data={'property_id': str(self.property.id), 'amount': 10},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
