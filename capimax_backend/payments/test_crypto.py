"""Crypto the PropShare way: settled once, tolerance, overpayment and short payments to the wallet."""

from decimal import Decimal

from django.test import TestCase, override_settings

from core.factories import make_property, make_ready_investor
from investments.models import Investment, TokenReservation
from investments.purchase import available_shares, create_purchase
from payments.crypto import settle_ipn, short_tolerance
from payments.models import Payment, WalletBalance

NP = dict(NOWPAYMENTS_API_KEY='k', NOWPAYMENTS_IPN_SECRET='s')


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


@override_settings(**NP)
class CryptoSettlementTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True, status='active')
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='crypto')
        self.inv, self.payment = r['investment'], r['payment']  # due = 1025.00

    def ipn(self, status, usd, np_id='np1', **extra):
        return {'payment_status': status, 'payment_id': np_id, 'pay_currency': 'usdttrc20',
                'price_amount': str(self.payment.amount), 'pay_amount': '1025', 'actually_paid': str(usd),
                'actually_paid_at_fiat': str(usd), **extra}

    def test_tolerance_is_min_of_pct_and_cap(self):
        self.assertEqual(short_tolerance(Decimal('1025.00')), Decimal('1.00'))  # 0.5% = 5.12, capped at $1
        self.assertEqual(short_tolerance(Decimal('100.00')), Decimal('0.50'))

    def test_finished_completes_purchase_once(self):
        self.assertEqual(settle_ipn(self.payment, self.ipn('finished', '1025')), 'completed')
        self.assertEqual(settle_ipn(self.payment, self.ipn('finished', '1025')), 'duplicate')
        self.assertEqual(Investment.objects.get(pk=self.inv.pk).status, 'completed')
        self.assertEqual(balance(self.user), Decimal('0.00'))

    def test_hair_short_within_tolerance_completes(self):
        self.assertEqual(settle_ipn(self.payment, self.ipn('partially_paid', '1024.40')), 'completed')
        self.assertEqual(Investment.objects.get(pk=self.inv.pk).status, 'completed')

    def test_clearly_short_releases_shares_and_credits_wallet(self):
        self.assertEqual(settle_ipn(self.payment, self.ipn('partially_paid', '600')), 'credited')
        self.assertEqual(Investment.objects.get(pk=self.inv.pk).status, 'failed')
        self.assertEqual(available_shares(self.prop), 100)
        self.assertEqual(balance(self.user), Decimal('600.00'))

    def test_overpayment_goes_to_wallet(self):
        settle_ipn(self.payment, self.ipn('finished', '1100'))
        self.assertEqual(balance(self.user), Decimal('75.00'))

    def test_extra_deposit_on_same_invoice_goes_to_wallet(self):
        settle_ipn(self.payment, self.ipn('finished', '1025'))
        out = settle_ipn(self.payment, self.ipn('finished', '50', np_id='np2', parent_payment_id='np1'))
        self.assertEqual(out, 'credited')
        self.assertEqual(balance(self.user), Decimal('50.00'))

    def test_unvalued_money_goes_to_review(self):
        ipn = self.ipn('partially_paid', '0')
        ipn.pop('actually_paid_at_fiat')
        ipn['pay_amount'] = '0'
        self.assertEqual(settle_ipn(self.payment, ipn), 'review')
        self.assertEqual(balance(self.user), Decimal('0.00'))

    def test_expired_releases_hold(self):
        self.assertEqual(settle_ipn(self.payment, self.ipn('expired', '0')), 'failed')
        self.assertFalse(TokenReservation.objects.filter(investment=self.inv, released=False).exists())
        self.assertEqual(Payment.objects.get(pk=self.payment.pk).status, 'failed')
