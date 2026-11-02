"""
Round 5 (client voice notes): selling to liquidity providers no longer hangs on
one provider. A request can go to all providers, who compete with offers; a
request nobody answers closes by itself; and a request can be sent again to
another provider or to all.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.tests.test_partner_roles import _lp_application
from core.factories import make_admin, make_investment, make_property, make_ready_investor
from investments.models import Investment
from marketplace.share_moves import free_shares
from payments.models import PlatformFeeSettings, WalletBalance

from .market import expire_due
from .models import ExitOffer, ExitRequest, LiquidityTransaction

URL = '/api/v1/liquidity-provider/exit-requests/'


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


def body(res):
    data = res.json()
    return data.get('data', data)


class LiquidityMarketTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.investor = make_ready_investor(wallet_balance=Decimal('0.00'))
        admin = make_admin()
        self.lp_a_user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        self.lp_a = _lp_application(self.lp_a_user.email).approve(admin)
        self.lp_b_user = make_ready_investor(wallet_balance=Decimal('5000.00'))
        self.lp_b = _lp_application(self.lp_b_user.email).approve(admin)
        make_investment(user=self.investor, prop=self.prop, token_amount=60, investment_amount=Decimal('600.00'),
                        status='completed', completed_at=timezone.now())
        self.client = APIClient()

    def as_(self, user):
        self.client.force_authenticate(user)
        return self.client

    def _open_request(self, units=40, price='9.50', **extra):
        return self.as_(self.investor).post(URL, {
            'property': str(self.prop.pk), 'units_requested': units, 'requested_price_per_unit': price, **extra,
        }, format='json')

    def _offer(self, user, er, price):
        return self.as_(user).post(f'{URL}{er.pk}/make_offer/', {'price_per_unit': price}, format='json')

    def test_request_to_all_providers_collects_competing_offers_and_the_best_one_settles(self):
        res = self._open_request()
        self.assertEqual(res.status_code, 201, res.content)
        er = ExitRequest.objects.get()
        self.assertIsNone(er.liquidity_provider)
        self.assertIsNotNone(er.expires_at)
        self.assertEqual(free_shares(self.investor, self.prop), 20)  # set aside while open

        # Both providers see it in their liquidity market
        market = body(self.as_(self.lp_a_user).get(f'{URL}market/'))
        self.assertEqual([r['id'] for r in market], [str(er.pk)])
        self.assertTrue(market[0]['open_to_all'])

        self.assertEqual(self._offer(self.lp_a_user, er, '9.00').status_code, 201)
        self.assertEqual(self._offer(self.lp_b_user, er, '9.20').status_code, 201)
        # A provider sending a better offer replaces its own earlier one
        self.assertEqual(self._offer(self.lp_a_user, er, '9.10').status_code, 201)
        self.assertEqual(ExitOffer.objects.filter(status='open').count(), 2)

        # The investor sees every offer, a provider only its own
        mine = body(self.as_(self.investor).get(f'{URL}my_requests/'))[0]
        self.assertEqual([o['price_per_unit'] for o in mine['offers'] if o['status'] == 'open'], ['9.20', '9.10'])
        theirs = body(self.as_(self.lp_a_user).get(f'{URL}market/'))[0]
        self.assertEqual({o['lp_name'] for o in theirs['offers']}, {self.lp_a.legal_entity_name})

        best = ExitOffer.objects.get(liquidity_provider=self.lp_b, status='open')
        res = self.as_(self.investor).post(f'{URL}{er.pk}/investor_action/',
                                           {'action': 'accept', 'offer': str(best.pk)}, format='json')
        self.assertEqual(res.status_code, 200, res.content)

        # 40 x $9.20 = $368 to the investor; provider B pays it + 1% fee
        self.assertEqual(balance(self.investor), Decimal('368.00'))
        self.assertEqual(balance(self.lp_b_user), Decimal('5000.00') - Decimal('371.68'))
        self.assertEqual(balance(self.lp_a_user), Decimal('5000.00'))
        er.refresh_from_db()
        self.assertEqual((er.status, er.liquidity_provider), ('completed', self.lp_b))
        self.assertEqual(LiquidityTransaction.objects.get().liquidity_provider, self.lp_b)
        self.assertTrue(Investment.objects.filter(user=self.lp_b_user, token_amount=40, status='completed').exists())
        self.assertEqual(ExitOffer.objects.get(liquidity_provider=self.lp_a, status__in=['open', 'lapsed']).status,
                         'lapsed')
        self.assertEqual(body(self.as_(self.lp_a_user).get(f'{URL}market/')), [])

    def test_declining_one_offer_keeps_the_request_open_for_the_others(self):
        self._open_request()
        er = ExitRequest.objects.get()
        self._offer(self.lp_a_user, er, '8.00')
        offer = ExitOffer.objects.get()
        res = self.as_(self.investor).post(f'{URL}{er.pk}/investor_action/',
                                           {'action': 'decline', 'offer': str(offer.pk)}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        offer.refresh_from_db()
        er.refresh_from_db()
        self.assertEqual((offer.status, er.status), ('declined', 'pending'))
        self.assertEqual(self._offer(self.lp_b_user, er, '9.00').status_code, 201)

    def test_provider_offer_is_checked_against_its_wallet(self):
        self._open_request()
        er = ExitRequest.objects.get()
        WalletBalance.objects.filter(user=self.lp_a_user).update(available_balance=Decimal('100.00'))
        res = self._offer(self.lp_a_user, er, '9.00')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error']['details']['code'], 'LP_INSUFFICIENT_FUNDS')

    def test_unanswered_direct_request_closes_and_frees_the_shares(self):
        PlatformFeeSettings.objects.update_or_create(pk=1, defaults={'lp_answer_hours': 24})
        res = self._open_request(liquidity_provider=str(self.lp_a.pk))
        self.assertEqual(res.status_code, 201, res.content)
        er = ExitRequest.objects.get()
        self.assertAlmostEqual(er.expires_at, timezone.now() + timedelta(hours=24), delta=timedelta(minutes=1))
        self.assertEqual(free_shares(self.investor, self.prop), 20)

        self.assertEqual(expire_due(), {'requests': 0, 'offers': 0})  # not yet
        self.assertEqual(expire_due(now=timezone.now() + timedelta(hours=25))['requests'], 1)
        er.refresh_from_db()
        self.assertEqual(er.status, 'expired')
        self.assertEqual(free_shares(self.investor, self.prop), 60)

    def test_offer_not_accepted_in_time_closes(self):
        self._open_request(liquidity_provider=str(self.lp_a.pk))
        er = ExitRequest.objects.get()
        self.as_(self.lp_a_user).post(f'{URL}{er.pk}/lp_action/',
                                      {'action': 'approve', 'offered_price_per_unit': '9.00'}, format='json')
        er.refresh_from_db()
        self.assertEqual(er.status, 'approved')
        expire_due(now=er.expires_at + timedelta(minutes=1))
        er.refresh_from_db()
        self.assertEqual(er.status, 'expired')
        self.assertEqual(free_shares(self.investor, self.prop), 60)

    def test_open_request_with_a_live_offer_waits_for_the_investor(self):
        self._open_request()
        er = ExitRequest.objects.get()
        later = er.expires_at - timedelta(minutes=5)
        ExitOffer.objects.create(exit_request=er, liquidity_provider=self.lp_a, price_per_unit=Decimal('9.00'),
                                 total_amount=Decimal('360.00'), expires_at=later + timedelta(hours=48))
        expire_due(now=er.expires_at + timedelta(minutes=1))
        er.refresh_from_db()
        self.assertEqual(er.status, 'pending')  # the offer can still be accepted
        expire_due(now=later + timedelta(hours=49))
        er.refresh_from_db()
        self.assertEqual(er.status, 'expired')
        self.assertEqual(ExitOffer.objects.get().status, 'lapsed')

    def test_waiting_request_can_be_sent_again_to_all_providers(self):
        self._open_request(liquidity_provider=str(self.lp_a.pk))
        first = ExitRequest.objects.get()
        # All 40 shares are set aside, yet the same 40 can be sent again: the first request is withdrawn
        res = self._open_request(units=40, price='9.30', replaces=str(first.pk))
        self.assertEqual(res.status_code, 201, res.content)
        first.refresh_from_db()
        second = ExitRequest.objects.exclude(pk=first.pk).get()
        self.assertEqual(first.status, 'cancelled')
        self.assertEqual((second.replaces, second.liquidity_provider, second.units_requested), (first, None, 40))
        self.assertEqual(free_shares(self.investor, self.prop), 20)

    def test_cannot_resend_someone_elses_request(self):
        self._open_request()
        er = ExitRequest.objects.get()
        other = make_ready_investor()
        make_investment(user=other, prop=self.prop, token_amount=5, investment_amount=Decimal('50.00'),
                        status='completed', completed_at=timezone.now())
        res = self.as_(other).post(URL, {'property': str(self.prop.pk), 'units_requested': 5,
                                         'requested_price_per_unit': '9.00', 'replaces': str(er.pk)}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_withdrawing_an_open_request_closes_its_offers(self):
        self._open_request()
        er = ExitRequest.objects.get()
        self._offer(self.lp_a_user, er, '9.00')
        res = self.as_(self.investor).post(f'{URL}{er.pk}/investor_action/', {'action': 'cancel'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(ExitOffer.objects.get().status, 'lapsed')
        self.assertEqual(self._offer(self.lp_b_user, er, '9.00').status_code, 400)

    def test_provider_lists_and_withdraws_its_offers(self):
        self._open_request()
        er = ExitRequest.objects.get()
        self._offer(self.lp_a_user, er, '9.00')
        rows = body(self.as_(self.lp_a_user).get(f'{URL}my_offers/'))
        self.assertEqual((rows[0]['property_name'], rows[0]['status']), (self.prop.title, 'open'))
        res = self.as_(self.lp_a_user).post(f'{URL}{er.pk}/withdraw_offer/')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(ExitOffer.objects.get().status, 'withdrawn')
        stats = body(self.as_(self.lp_a_user).get('/api/v1/liquidity-provider/providers/dashboard_stats/'))
        self.assertEqual((stats['open_market_requests'], stats['open_offers']), (1, 0))


class ProviderStatementTests(TestCase):
    def test_statement_shows_purchases_money_and_balances(self):
        prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        investor = make_ready_investor(wallet_balance=Decimal('0.00'))
        lp_user = make_ready_investor(wallet_balance=Decimal('0.00'))
        lp = _lp_application(lp_user.email).approve(make_admin())
        WalletBalance.credit(lp_user, Decimal('1000.00'), transaction_type='deposit', description='Top-up')
        make_investment(user=investor, prop=prop, token_amount=10, investment_amount=Decimal('100.00'),
                        status='completed', completed_at=timezone.now())
        client = APIClient()
        client.force_authenticate(investor)
        client.post(URL, {'property': str(prop.pk), 'liquidity_provider': str(lp.pk), 'units_requested': 10,
                          'requested_price_per_unit': '9.00'}, format='json')
        er = ExitRequest.objects.get()
        client.force_authenticate(lp_user)
        client.post(f'{URL}{er.pk}/lp_action/', {'action': 'approve', 'offered_price_per_unit': '9.00'},
                    format='json')
        client.force_authenticate(investor)
        self.assertEqual(client.post(f'{URL}{er.pk}/investor_action/', {'action': 'accept'},
                                     format='json').status_code, 200)

        client.force_authenticate(lp_user)
        res = client.get('/api/v1/liquidity-provider/providers/statement/')
        self.assertEqual(res.status_code, 200, res.content)
        st = body(res)
        self.assertEqual((st['opening_balance'], st['closing_balance']), ('0.00', '909.10'))
        self.assertEqual((st['summary']['bought_deals'], st['summary']['bought_shares'],
                          st['summary']['bought_paid'], st['summary']['deposits'], st['summary']['fees']),
                         (1, 10, '90.90', '1000.00', '0.90'))
        self.assertEqual([line['type'] for line in st['lines']], ['deposit', 'trade_purchase', 'fee'])
        self.assertEqual(st['bought'][0]['property'], prop.title)

        bad = client.get('/api/v1/liquidity-provider/providers/statement/', {'from': 'yesterday'})
        self.assertEqual(bad.status_code, 400)
        client.force_authenticate(investor)
        self.assertEqual(client.get('/api/v1/liquidity-provider/providers/statement/').status_code, 403)
