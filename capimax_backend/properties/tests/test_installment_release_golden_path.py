"""
Golden-path tests for the under-construction installment release flow.

These cover the path from a ``ConstructionInstallment`` being marked paid
to ``processInstallment`` landing a transaction on the per-property token
contract. The blockchain side-effect is fully mocked so the test runs in
the standard pytest suite without needing a live RPC.

What the contract patch is supposed to guarantee:
  * mintTokens(isInstallment=true) escrows tokens on the contract.
  * processInstallment(tokenId=0, investor, n) releases n tokens
    from escrow to the investor wallet.
  * _release_tokens_to_investor in the Django service finds the
    per-property SmartContract row, signs with the platform key, and
    submits processInstallment.

The tests below pin those guarantees against the real Django code path.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import User
from blockchain.models import BlockchainNetwork, SmartContract
from properties.models import (
    ConstructionInstallment,
    Property,
    PropertyCategory,
    PropertyStatus,
)
from properties.services import InstallmentProcessingService


def _make_real_estate_token_abi():
    """Minimal ABI fragment with just the methods we hit."""
    return [
        {
            "type": "function",
            "name": "processInstallment",
            "inputs": [
                {"name": "tokenId", "type": "uint256"},
                {"name": "investor", "type": "address"},
                {"name": "tokensToRelease", "type": "uint256"},
            ],
            "outputs": [],
            "stateMutability": "nonpayable",
        }
    ]


@override_settings(BLOCKCHAIN_PRIVATE_KEY="0x" + "11" * 32)
class InstallmentReleaseGoldenPathTests(TestCase):
    """Verify _release_tokens_to_investor uses processInstallment on-chain."""

    def setUp(self):
        # Use a real-looking 0x address (deterministic from the test key).
        self.platform_address = "0x196D5BEE8B7Bc7e2Ce2A24Dc41eABbF0BFC4d8Aa"

        self.network = BlockchainNetwork.objects.create(
            name="BNB Smart Chain Testnet",
            network_type="bsc",
            environment="testnet",
            chain_id=97,
            rpc_url="https://test-rpc/",
            native_currency="BNB",
            is_active=True,
        )
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="pass",
            role="property_owner",
        )
        self.investor = User.objects.create_user(
            email="inv@example.com",
            password="pass",
            role="investor",
            wallet_address="0x1111111111111111111111111111111111111111",
        )
        self.property = Property.objects.create(
            title="Tower Build",
            description="under-construction test",
            property_type="residential",
            property_category=PropertyCategory.UNDER_CONSTRUCTION,
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal("100000"),
            token_price=Decimal("10"),
            total_tokens=1000,
            expected_return=Decimal("12"),
            rental_yield=Decimal("0"),
            property_size=Decimal("200"),
            city="Dubai",
            country="AE",
            owner=self.owner,
            supports_installments=True,
            installment_period_months=12,
            smart_contract_address="0x2222222222222222222222222222222222222222",
        )
        self.token_sc = SmartContract.objects.create(
            network=self.network,
            property_reference=self.property,
            contract_type="real_estate_token",
            contract_address="0x2222222222222222222222222222222222222222",
            contract_name="RealEstateToken (clone)",
            abi=_make_real_estate_token_abi(),
            status="active",
        )
        self.installment = ConstructionInstallment.objects.create(
            property_investment=self.property,
            investor=self.investor,
            total_investment_amount=Decimal("60"),
            token_allocation=6,
            installment_amount=Decimal("30"),
            frequency="monthly",
            total_installments=2,
            payments_made=0,
            tokens_per_payment=3,
            graduated_release=True,
            status="pending",
            next_payment_date=timezone.now().date(),
        )

    def _build_w3_mocks(self):
        """Build a fake Web3 client that records the processInstallment call."""
        # Mock chain on the receipt — status=1 means success on EVM.
        receipt = MagicMock()
        receipt.status = 1
        receipt.blockNumber = 123456
        receipt.gasUsed = 65000

        # Track the args processInstallment is called with.
        recorded = {}

        def record_process_installment(*args, **kwargs):
            recorded["args"] = args
            recorded["kwargs"] = kwargs
            fn = MagicMock()
            fn.build_transaction = MagicMock(return_value={
                "from": self.platform_address,
                "nonce": 0,
                "gas": 300000,
                "gasPrice": 5_000_000_000,
                "chainId": 97,
                "to": self.token_sc.contract_address,
                "data": "0x",
            })
            return fn

        contract = MagicMock()
        contract.functions.processInstallment = MagicMock(side_effect=record_process_installment)

        eth = MagicMock()
        eth.contract = MagicMock(return_value=contract)
        eth.get_transaction_count = MagicMock(return_value=7)
        eth.gas_price = 5_000_000_000
        eth.send_raw_transaction = MagicMock(
            return_value=bytes.fromhex("a" * 64)
        )
        eth.wait_for_transaction_receipt = MagicMock(return_value=receipt)

        w3 = MagicMock()
        w3.eth = eth
        # web3.eth.account.sign_transaction returns an object with raw_transaction
        signed = MagicMock()
        signed.raw_transaction = b"\x00" * 32
        w3.eth.account.sign_transaction = MagicMock(return_value=signed)
        # Pass-through for Web3.to_checksum_address — accept anything 0x-prefixed.
        return w3, contract, recorded

    @patch("web3.Web3")
    @patch("eth_account.Account")
    def test_release_calls_processInstallment_with_correct_args(self, Account, Web3):
        """The service must call processInstallment(0, investor, n) on the
        per-property token contract."""
        w3, contract, recorded = self._build_w3_mocks()
        Web3.return_value = w3
        Web3.HTTPProvider = MagicMock()
        Web3.to_checksum_address = staticmethod(lambda a: a)

        signer = MagicMock()
        signer.address = self.platform_address
        Account.from_key = MagicMock(return_value=signer)

        svc = InstallmentProcessingService()
        result = svc._release_tokens_to_investor(self.installment, 3)

        self.assertTrue(result["success"], msg=result)
        self.assertEqual(result["block_number"], 123456)
        self.assertEqual(result["gas_used"], 65000)
        self.assertTrue(result["transaction_hash"].startswith("0x"))

        # Verify processInstallment got called with the right shape.
        self.assertIn("args", recorded)
        token_id, investor_addr, amount = recorded["args"]
        self.assertEqual(token_id, 0, "Each clone holds property at tokenId=0")
        self.assertEqual(investor_addr, self.investor.wallet_address)
        self.assertEqual(amount, 3)

        # The contract address came from the per-property SmartContract row.
        contract_arg = w3.eth.contract.call_args.kwargs["address"]
        self.assertEqual(contract_arg, self.token_sc.contract_address)

    @patch("web3.Web3")
    @patch("eth_account.Account")
    def test_release_fails_when_chain_reverts(self, Account, Web3):
        """If the receipt status is 0 the service must return failure."""
        w3, _contract, _recorded = self._build_w3_mocks()
        bad_receipt = MagicMock()
        bad_receipt.status = 0
        w3.eth.wait_for_transaction_receipt = MagicMock(return_value=bad_receipt)
        Web3.return_value = w3
        Web3.HTTPProvider = MagicMock()
        Web3.to_checksum_address = staticmethod(lambda a: a)

        signer = MagicMock()
        signer.address = self.platform_address
        Account.from_key = MagicMock(return_value=signer)

        svc = InstallmentProcessingService()
        result = svc._release_tokens_to_investor(self.installment, 3)

        self.assertFalse(result["success"])
        self.assertIn("reverted", result["error"])

    def test_release_rejects_unconfigured_property(self):
        """Property without smart_contract_address must short-circuit."""
        self.property.smart_contract_address = ""
        self.property.save(update_fields=["smart_contract_address"])

        svc = InstallmentProcessingService()
        result = svc._release_tokens_to_investor(self.installment, 3)

        self.assertFalse(result["success"])
        self.assertIn("not tokenized", result["error"].lower())

    def test_release_rejects_investor_without_wallet(self):
        """Investor without wallet_address must short-circuit before chain."""
        self.investor.wallet_address = ""
        self.investor.save(update_fields=["wallet_address"])

        svc = InstallmentProcessingService()
        result = svc._release_tokens_to_investor(self.installment, 3)

        self.assertFalse(result["success"])
        self.assertIn("wallet", result["error"].lower())

    def test_release_rejects_zero_tokens(self):
        """Zero or negative token count must short-circuit."""
        svc = InstallmentProcessingService()
        for n in (0, -1, -10):
            result = svc._release_tokens_to_investor(self.installment, n)
            self.assertFalse(result["success"], msg=f"Should fail for n={n}")
            self.assertIn("nothing to release", result["error"].lower())
