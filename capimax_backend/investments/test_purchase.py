"""
PropShare-model checkout: server-side pricing, purchase fee, price guard,
wallet purchases, 30-minute share holds for card / Pronova / crypto, hosted
checkout, webhook confirmation, expiry and late payments.
"""

from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_property, make_ready_investor
from investments.models import Investment, TokenReservation
from investments.purchase import (
    PurchaseError, available_shares, create_purchase, expire_reservations, price_quote,
)
from payments.checkout import apply_checkout_session
from payments.models import Payment, PlatformFeeSettings, WalletBalance, WalletTransaction

STRIPE = dict(STRIPE_SECRET_KEY='sk_test_123', STRIPE_WEBHOOK_SECRET='whsec_x', FRONTEND_URL='https://rt.example')


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


class QuoteTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=1000, is_published=True)

    def test_whole_shares_and_fee(self):
        q = price_quote(self.prop, '1050', 'wallet')
        self.assertEqual((q.shares, q.subtotal, q.platform_fee, q.total),
                         (10, Decimal('1000.00'), Decimal('25.00'), Decimal('1025.00')))

    def test_pronova_discount_on_total(self):
        q = price_quote(self.prop, '1000', 'pronova')
        self.assertEqual(q.discount, Decimal('51.25'))  # 5% of 1025
        self.assertEqual(q.total, Decimal('973.75'))
        self.assertEqual(q.subtotal, Decimal('1000.00'))

    def test_fee_follows_admin_setting(self):
        s = PlatformFeeSettings.current()
        s.platform_fee_pct = Decimal('0')
        s.save()
        self.assertEqual(price_quote(self.prop, '500', 'wallet').total, Decimal('500.00'))

    def test_minimum(self):
        self.prop.minimum_investment = Decimal('500')
        with self.assertRaises(PurchaseError) as ctx:
            price_quote(self.prop, '400', 'wallet')
        self.assertEqual(ctx.exception.code, 'AMOUNT_TOO_LOW')


class PurchaseTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True,
                                  status='active')

    def test_wallet_purchase_debits_shares_and_fee(self):
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='wallet',
                            expected_unit_price='100.00')
        self.assertEqual(r['next'], 'done')
        inv = r['investment']
        self.assertEqual((inv.status, inv.token_amount, inv.platform_fee_amount), ('completed', 10, Decimal('25.00')))
        self.assertEqual(balance(self.user), Decimal('3975.00'))
        types = sorted(WalletTransaction.objects.filter(user=self.user).values_list('transaction_type', flat=True))
        self.assertEqual(types, ['fee', 'investment'])
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, 10)

    def test_price_changed_is_refused(self):
        with self.assertRaises(PurchaseError) as ctx:
            create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='wallet',
                            expected_unit_price='90.00')
        self.assertEqual(ctx.exception.code, 'PRICE_CHANGED')

    def test_insufficient_wallet(self):
        with self.assertRaises(PurchaseError) as ctx:
            create_purchase(self.user, property_id=self.prop.pk, amount='6000', method='wallet')
        self.assertEqual(ctx.exception.code, 'INSUFFICIENT_FUNDS')
        self.assertFalse(Investment.objects.exists())

    def test_idempotency_key_replays(self):
        a = create_purchase(self.user, property_id=self.prop.pk, amount='100', method='wallet', idempotency_key='k1')
        b = create_purchase(self.user, property_id=self.prop.pk, amount='100', method='wallet', idempotency_key='k1')
        self.assertEqual(a['investment'].pk, b['investment'].pk)
        self.assertEqual(balance(self.user), Decimal('4897.50'))

    @override_settings(**STRIPE)
    def test_card_purchase_holds_shares_until_paid(self):
        r = create_purchase(self.user, property_id=self.prop.pk, amount='3000', method='card')
        self.assertEqual(r['next'], 'checkout')
        self.assertEqual(available_shares(self.prop), 70)
        # another buyer can't take the held shares
        other = make_ready_investor(wallet_balance=Decimal('99999'))
        with self.assertRaises(PurchaseError):
            create_purchase(other, property_id=self.prop.pk, amount='8000', method='wallet')
        payment = r['payment']
        apply_checkout_session({'id': 'cs_1', 'client_reference_id': str(payment.id), 'payment_status': 'paid',
                                'amount_total': 307500, 'payment_intent': 'pi_1'}, source='test')
        inv = Investment.objects.get(pk=r['investment'].pk)
        self.assertIn(inv.status, ('pending_mint', 'completed'))
        self.assertFalse(TokenReservation.objects.filter(investment=inv, released=False).exists())
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, 30)
        self.assertEqual(balance(self.user), Decimal('5000.00'))  # direct pay never touches the wallet

    @override_settings(**STRIPE)
    def test_underpaid_session_is_not_settled(self):
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='card')
        out = apply_checkout_session({'id': 'cs_2', 'client_reference_id': str(r['payment'].id),
                                      'payment_status': 'paid', 'amount_total': 100}, source='test')
        self.assertEqual(out, 'ignored')
        self.assertEqual(Payment.objects.get(pk=r['payment'].pk).status, 'pending')

    @override_settings(**STRIPE)
    def test_expired_hold_releases_shares_and_late_payment_retakes_them(self):
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='card')
        Investment.objects.filter(pk=r['investment'].pk).update(reserved_until=timezone.now() - timedelta(minutes=1))
        TokenReservation.objects.filter(investment=r['investment']).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(expire_reservations(), 1)
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'expired')
        self.assertEqual(available_shares(self.prop), 100)
        Payment.objects.filter(pk=r['payment'].pk).update(status='pending')
        apply_checkout_session({'id': 'cs_3', 'client_reference_id': str(r['payment'].id), 'payment_status': 'paid',
                                'amount_total': 102500}, source='test')
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'completed')

    @override_settings(**STRIPE)
    def test_late_payment_refunds_when_shares_are_gone(self):
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='card')
        Investment.objects.filter(pk=r['investment'].pk).update(status='expired')
        TokenReservation.objects.filter(investment=r['investment']).update(released=True)
        self.prop.tokens_sold = 95
        self.prop.save(update_fields=['tokens_sold'])
        apply_checkout_session({'id': 'cs_4', 'client_reference_id': str(r['payment'].id), 'payment_status': 'paid',
                                'amount_total': 102500}, source='test')
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'refunded')
        self.assertEqual(balance(self.user), Decimal('6025.00'))

    def test_card_unavailable_without_keys(self):
        with override_settings(STRIPE_SECRET_KEY=''):
            with self.assertRaises(PurchaseError) as ctx:
                create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='card')
        self.assertEqual(ctx.exception.code, 'PAYMENTS_NOT_CONFIGURED')

    def test_sukuk_holds_a_day_for_the_document(self):
        from investments.purchase import DOCUMENT_TTL, expire_reservations
        r = create_purchase(self.user, property_id=self.prop.pk, amount='1000', method='nova_sukuk')
        self.assertEqual(r['next'], 'review')
        res = TokenReservation.objects.get(investment=r['investment'])
        self.assertIsNotNone(res.expires_at)
        self.assertEqual(available_shares(self.prop), 90)
        # no document within the day: the shares go back on sale
        self.assertEqual(expire_reservations(now=timezone.now() + DOCUMENT_TTL + timedelta(minutes=1)), 1)
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'expired')
        self.assertEqual(available_shares(self.prop), 100)


@override_settings(**STRIPE)
class PurchaseApiTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True,
                                  status='active')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_methods_list_shows_every_method(self):
        data = APIClient().get('/api/v1/purchases/methods/').json()['data']
        ids = [m['id'] for m in data['methods']]
        self.assertEqual(ids, ['wallet', 'card', 'crypto', 'pronova', 'nova_sukuk', 'bank'])
        crypto = next(m for m in data['methods'] if m['id'] == 'crypto')
        self.assertFalse(crypto['available'])  # shown, marked unavailable
        self.assertEqual(data['fees']['platform_fee_pct'], '2.50')

    def test_quote_endpoint(self):
        r = APIClient().post('/api/v1/purchases/quote/', {'property_id': str(self.prop.pk), 'amount': '250',
                                                          'method': 'wallet'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['data']['total'], '205.00')

    def test_card_purchase_returns_checkout_url(self):
        fake = SimpleNamespace(url='https://checkout.stripe.com/c/pay/cs_test', id='cs_test')
        with patch('stripe.checkout.Session.create', return_value=fake) as create:
            r = self.client.post('/api/v1/purchases/', {'property_id': str(self.prop.pk), 'amount': '1000',
                                                        'method': 'card', 'expected_unit_price': '100.00'},
                                 format='json', HTTP_IDEMPOTENCY_KEY='abc')
        self.assertEqual(r.status_code, 201, r.content)
        data = r.json()['data']
        self.assertEqual((data['next'], data['checkout_url']), ('checkout', fake.url))
        kwargs = create.call_args.kwargs
        self.assertEqual(kwargs['line_items'][0]['price_data']['unit_amount'], 102500)
        self.assertIn('/payment-return?purchase=', kwargs['success_url'])

    def test_price_changed_returns_409_with_code(self):
        r = self.client.post('/api/v1/purchases/', {'property_id': str(self.prop.pk), 'amount': '1000',
                                                    'method': 'wallet', 'expected_unit_price': '1.00'}, format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error']['code'], 'PRICE_CHANGED')

    def test_kyc_required(self):
        from core.factories import make_investor
        c = APIClient()
        c.force_authenticate(make_investor())
        r = c.post('/api/v1/purchases/', {'property_id': str(self.prop.pk), 'amount': '1000', 'method': 'wallet'},
                   format='json')
        self.assertEqual(r.status_code, 403)


@override_settings(**STRIPE)
class ProofAndDepositTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True,
                                  status='active')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _buy(self, method):
        r = self.client.post('/api/v1/purchases/', {'property_id': str(self.prop.pk), 'amount': '500',
                                                    'method': method}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['data']['next'], 'review')
        return r.json()['data']['investment_id']

    def test_bank_proof(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from payments.models import BankTransfer
        inv = self._buy('bank')
        r = self.client.post(f'/api/v1/purchases/{inv}/proof/', {
            'file': SimpleUploadedFile('proof.png', b'\x89PNG....', content_type='image/png'),
            'account_holder_name': 'Iris', 'bank_name': 'Bank', 'account_number': '123'}, format='multipart')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['data']['reference'].startswith('BT'))
        self.assertEqual(BankTransfer.objects.count(), 1)
        # with the document in, the shares are held until the review
        from investments.purchase import expire_reservations
        self.assertIsNone(TokenReservation.objects.get(investment_id=inv).expires_at)
        self.assertEqual(expire_reservations(now=timezone.now() + timedelta(days=30)), 0)

    def test_sukuk_requires_pdf(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from payments.models import NovaSukukPayment
        inv = self._buy('nova_sukuk')
        bad = self.client.post(f'/api/v1/purchases/{inv}/proof/',
                               {'file': SimpleUploadedFile('c.png', b'nope', content_type='image/png')},
                               format='multipart')
        self.assertEqual(bad.status_code, 422)
        ok = self.client.post(f'/api/v1/purchases/{inv}/proof/',
                              {'file': SimpleUploadedFile('c.pdf', b'%PDF-1.4 x', content_type='application/pdf'),
                               'reference': 'NS-1'}, format='multipart')
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(NovaSukukPayment.objects.get().sukuk_reference_number, 'NS-1')

    def test_card_deposit_opens_checkout_and_credits_on_payment(self):
        fake = SimpleNamespace(url='https://checkout.stripe.com/c/pay/cs_dep', id='cs_dep')
        with patch('stripe.checkout.Session.create', return_value=fake) as create:
            r = self.client.post('/api/v1/purchases/deposit/', {'amount': '250', 'method': 'card'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIn('/payment-return?deposit=1&payment=', create.call_args.kwargs['success_url'])
        pid = r.json()['data']['payment_id']
        apply_checkout_session({'id': 'cs_dep', 'client_reference_id': pid, 'payment_status': 'paid',
                                'amount_total': 25000}, source='test')
        self.assertEqual(balance(self.user), Decimal('250.00'))
        status = self.client.get(f'/api/v1/purchases/payments/{pid}/').json()['data']
        self.assertEqual((status['status'], status['credited'], status['purpose']), ('completed', '250.00', 'deposit'))

    def test_payment_status_is_private(self):
        from payments.models import Payment
        other = make_ready_investor()
        p = Payment.objects.create(user=other, amount=Decimal('10'), net_amount=Decimal('10'), currency='USD',
                                   payment_method='credit_card', status='pending', metadata={'purpose': 'deposit'})
        self.assertEqual(self.client.get(f'/api/v1/purchases/payments/{p.pk}/').status_code, 404)


class ReinvestTests(TestCase):
    """Reinvest (PropShare model): returns only, discount on the share price, no purchase fee."""

    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('1000.00'))
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True,
                                  status='active')

    def _earn(self, amount):
        WalletBalance.credit(self.user, Decimal(amount), transaction_type='dividend', description='Rent')

    def test_quote_discounts_the_share_price_without_fee(self):
        from investments.purchase import price_quote
        q = price_quote(self.prop, '500', 'reinvest')
        # $95 a share: 5 shares for $475, $25 off, no purchase fee
        self.assertEqual((q.shares, q.total, q.discount, q.platform_fee), (5, Decimal('475.00'), Decimal('25.00'), Decimal('0.00')))

    def test_deposited_money_does_not_qualify(self):
        with self.assertRaises(PurchaseError) as ctx:
            create_purchase(self.user, property_id=self.prop.pk, amount='200', method='reinvest')
        self.assertEqual(ctx.exception.code, 'NOT_ENOUGH_RETURNS')

    def test_returns_are_reinvested_once(self):
        from investments.purchase import reinvestable_returns
        self._earn('200')
        r = create_purchase(self.user, property_id=self.prop.pk, amount='200', method='reinvest')
        self.assertEqual(r['next'], 'done')
        self.assertEqual(r['investment'].token_amount, 2)  # 2 x $95 = $190
        self.assertEqual(balance(self.user), Decimal('1010.00'))
        self.assertEqual(reinvestable_returns(self.user), Decimal('10.00'))
        self.assertFalse(WalletTransaction.objects.filter(user=self.user, transaction_type='fee').exists())


class MintEveryMethodTests(TestCase):
    """Every purchase of a tokenized property is minted on-chain (not only card)."""

    def test_wallet_purchase_of_tokenized_property_waits_for_mint(self):
        user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True,
                             status='tokenized', smart_contract_address='0x' + 'a' * 40)
        r = create_purchase(user, property_id=prop.pk, amount='500', method='wallet')
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'pending_mint')

    def test_untokenized_property_completes_on_the_ledger(self):
        user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True, status='active')
        r = create_purchase(user, property_id=prop.pk, amount='500', method='wallet')
        self.assertEqual(Investment.objects.get(pk=r['investment'].pk).status, 'completed')

    def test_a_purchase_does_not_release_the_buyers_other_holds(self):
        user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        prop = make_property(token_price=Decimal('100.00'), total_tokens=100, is_published=True, status='active')
        other = TokenReservation.objects.create(user=user, property_investment=prop, token_amount=10, expires_at=None)
        create_purchase(user, property_id=prop.pk, amount='500', method='wallet')
        other.refresh_from_db()
        self.assertFalse(other.released)
