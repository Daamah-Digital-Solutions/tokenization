"""
Client round 3, #14: one settlement path for every provider.

  * a payment for an investment confirms the investment and never credits
    the wallet (it used to do both — the buyer got the money back);
  * a top-up (no investment) credits the wallet once;
  * settling twice (webhook + confirm, IPN + poll) changes nothing;
  * card/crypto payments can only be created for the payer's own pending
    investment, for at least its amount;
  * the NOWPayments IPN signature is checked over the key-sorted payload;
  * the legacy "verify crypto payment" endpoint no longer completes payments.
"""

import hashlib
import hmac
import json
from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.factories import make_investment, make_payment, make_property, make_ready_investor
from payments.models import Payment, PaymentStatus, WalletBalance, WalletTransaction
from payments.settlement import check_payable_investment, settle_payment


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


class SettlePaymentTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('500.00'))
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)

    def test_investment_payment_confirms_investment_without_wallet_credit(self):
        inv = make_investment(user=self.user, prop=self.prop, token_amount=20,
                              investment_amount=Decimal('200.00'))
        pay = make_payment(user=self.user, investment=inv, amount=Decimal('200.00'))

        self.assertTrue(settle_payment(pay, mint=True, source='test'))

        inv.refresh_from_db(); pay.refresh_from_db(); self.prop.refresh_from_db()
        self.assertEqual(pay.status, PaymentStatus.COMPLETED)
        self.assertEqual(inv.status, 'pending_mint')
        self.assertEqual(self.prop.tokens_sold, 20)
        self.assertEqual(balance(self.user), Decimal('500.00'))
        self.assertFalse(WalletTransaction.objects.filter(user=self.user, reference_id=pay.id).exists())

    def test_non_mint_investment_payment_completes_investment(self):
        inv = make_investment(user=self.user, prop=self.prop, token_amount=5,
                              investment_amount=Decimal('50.00'))
        pay = make_payment(user=self.user, investment=inv, amount=Decimal('50.00'),
                           payment_method='cryptocurrency')
        settle_payment(pay, source='test')
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'completed')
        self.assertEqual(balance(self.user), Decimal('500.00'))

    def test_top_up_credits_wallet_once(self):
        pay = make_payment(user=self.user, amount=Decimal('120.00'))
        self.assertTrue(settle_payment(pay, source='test'))
        self.assertFalse(settle_payment(pay, source='test'))
        self.assertEqual(balance(self.user), Decimal('620.00'))
        self.assertEqual(WalletTransaction.objects.filter(user=self.user, reference_id=pay.id).count(), 1)

    def test_second_settlement_does_not_double_count_shares(self):
        inv = make_investment(user=self.user, prop=self.prop, token_amount=7,
                              investment_amount=Decimal('70.00'))
        pay = make_payment(user=self.user, investment=inv, amount=Decimal('70.00'))
        settle_payment(pay, mint=True)
        settle_payment(pay, mint=True)
        from investments.services import InvestmentProcessingService
        InvestmentProcessingService.process_investment(inv, pay)  # e.g. a late poll
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, 7)


class PayableInvestmentTests(TestCase):
    def test_rules(self):
        owner = make_ready_investor()
        other = make_ready_investor()
        inv = make_investment(user=owner, investment_amount=Decimal('300.00'))
        self.assertIsNone(check_payable_investment(owner, inv.id, Decimal('300.00')))
        self.assertIsNone(check_payable_investment(owner, None, Decimal('1.00')))
        self.assertIsNotNone(check_payable_investment(other, inv.id, Decimal('300.00')))
        self.assertIsNotNone(check_payable_investment(owner, inv.id, Decimal('1.00')))
        inv.status = 'completed'; inv.save()
        self.assertIsNotNone(check_payable_investment(owner, inv.id, Decimal('300.00')))


@override_settings(NOWPAYMENTS_IPN_SECRET='ipn-test-secret')
class NowPaymentsSignatureTests(TestCase):
    def _service(self):
        from payments.nowpayments_service import NOWPaymentsService
        svc = NOWPaymentsService()
        svc.ipn_secret = 'ipn-test-secret'
        return svc

    def test_signature_over_sorted_payload_is_accepted(self):
        payload = {'payment_status': 'finished', 'payment_id': 55, 'order_id': 'x', 'actually_paid': 1.5}
        body = json.dumps(payload).encode()  # unsorted, with spaces — like a real request
        sorted_body = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()
        sig = hmac.new(b'ipn-test-secret', sorted_body, hashlib.sha512).hexdigest()
        self.assertTrue(self._service().verify_ipn_signature(body, sig))
        self.assertFalse(self._service().verify_ipn_signature(body, 'bad'))
        self.assertFalse(self._service().verify_ipn_signature(body, ''))


class LegacyCryptoVerifyTests(TestCase):
    def test_verify_payment_endpoint_cannot_complete_payments(self):
        user = make_ready_investor()
        pay = make_payment(user=user, payment_method='cryptocurrency')
        client = APIClient()
        client.force_authenticate(user)
        r = client.post('/api/v1/payments/crypto/verify-payment/',
                        {'payment_id': str(pay.id), 'transaction_hash': '0xabc'}, format='json')
        self.assertEqual(r.status_code, 410)
        pay.refresh_from_db()
        self.assertEqual(pay.status, 'pending')
