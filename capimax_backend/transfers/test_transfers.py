"""
Client round 4, extra #3: send shares or wallet balance to another user, like
Capimax BRX — held at once, delivered to a verified recipient, waiting (then
returned) otherwise, cancellable by the sender.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_investment, make_property, make_ready_investor, make_user
from investments.models import Investment
from payments.models import WalletBalance

from .models import Transfer
from .services import process_due, release_waiting


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


class TransferTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.sender = make_ready_investor(wallet_balance=Decimal('500.00'))
        self.friend = make_ready_investor(wallet_balance=Decimal('0.00'))
        make_investment(user=self.sender, prop=self.prop, token_amount=40, investment_amount=Decimal('400.00'),
                        status='completed', completed_at=timezone.now())
        self.client = APIClient()
        self.client.force_authenticate(self.sender)

    def _send(self, **data):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post('/api/v1/transfers/', data, format='json')

    def test_send_shares_to_a_verified_user_moves_them_now(self):
        res = self._send(asset='units', property_id=str(self.prop.pk), units=15,
                         recipient_email=self.friend.email.upper(), message='Happy birthday')
        self.assertEqual(res.status_code, 201, res.content)
        t = Transfer.objects.get()
        self.assertEqual((t.status, t.recipient, t.amount), ('delivered', self.friend, Decimal('150.00')))
        mine = Investment.objects.get(user=self.sender, status='completed')
        self.assertEqual(mine.token_amount, 25)
        got = Investment.objects.get(user=self.friend, payment_method__transfer_id=str(t.pk))
        self.assertEqual((got.token_amount, got.investment_amount), (15, Decimal('150.00')))  # cost basis moves

    def test_send_money(self):
        res = self._send(asset='cash', amount='120.50', recipient_email=self.friend.email)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(balance(self.sender), Decimal('379.50'))
        self.assertEqual(balance(self.friend), Decimal('120.50'))

    def test_recipient_without_verified_identity_waits_then_gets_it_on_approval(self):
        newcomer = make_user(email='new@friend.test', is_verified=True)
        self._send(asset='cash', amount='50', recipient_email='new@friend.test')
        t = Transfer.objects.get()
        self.assertEqual(t.status, 'waiting')
        self.assertEqual(balance(self.sender), Decimal('450.00'))  # held
        from kyc.models import KYCProfile
        profile, _ = KYCProfile.objects.get_or_create(user=newcomer)
        with self.captureOnCommitCallbacks(execute=True):
            profile.approve(None)
        t.refresh_from_db()
        self.assertEqual(t.status, 'delivered')
        self.assertEqual(balance(newcomer), Decimal('50.00'))

    def test_unclaimed_transfer_returns_after_the_claim_period(self):
        self._send(asset='units', property_id=str(self.prop.pk), units=10, recipient_email='nobody@friend.test')
        t = Transfer.objects.get()
        self.assertEqual(t.status, 'waiting')
        Transfer.objects.filter(pk=t.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(process_due()['expired'], 1)
        t.refresh_from_db()
        self.assertEqual(t.status, 'expired')
        self.assertEqual(Investment.objects.get(user=self.sender, status='completed').token_amount, 40)

    def test_shares_being_sent_cannot_be_sent_again_or_listed(self):
        self._send(asset='units', property_id=str(self.prop.pk), units=30, recipient_email='later@friend.test',
                   deliver_on=str(timezone.localdate() + timedelta(days=5)))
        res = self._send(asset='units', property_id=str(self.prop.pk), units=20, recipient_email=self.friend.email)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error']['details']['code'], 'NOT_ENOUGH_SHARES')

    def test_sender_cancels_and_gets_the_money_back(self):
        self._send(asset='cash', amount='80', recipient_email='later@friend.test',
                   deliver_on=str(timezone.localdate() + timedelta(days=2)))
        t = Transfer.objects.get()
        self.assertEqual((t.status, balance(self.sender)), ('scheduled', Decimal('420.00')))
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(f'/api/v1/transfers/{t.pk}/cancel/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(balance(self.sender), Decimal('500.00'))

    def test_scheduled_transfer_is_delivered_on_its_date(self):
        self._send(asset='cash', amount='10', recipient_email=self.friend.email,
                   deliver_on=str(timezone.localdate() + timedelta(days=1)))
        t = Transfer.objects.get()
        self.assertEqual(t.status, 'scheduled')
        Transfer.objects.filter(pk=t.pk).update(deliver_on=timezone.localdate())
        with self.captureOnCommitCallbacks(execute=True):
            process_due()
        t.refresh_from_db()
        self.assertEqual(t.status, 'delivered')

    def test_rules(self):
        self.assertEqual(self._send(asset='cash', amount='10', recipient_email=self.sender.email).status_code, 400)
        self.assertEqual(self._send(asset='cash', amount='9999', recipient_email=self.friend.email).status_code, 400)
        res = self._send(asset='cash', amount='5', recipient_email=self.friend.email,
                         deliver_on=str(timezone.localdate() - timedelta(days=1)))
        self.assertEqual(res.status_code, 400)

    def test_lists_and_giftable(self):
        self._send(asset='units', property_id=str(self.prop.pk), units=5, recipient_email=self.friend.email)
        data = self.client.get('/api/v1/transfers/giftable/').json()['data']
        self.assertEqual(data['properties'][0]['free_units'], 35)
        self.client.force_authenticate(self.friend)
        rows = self.client.get('/api/v1/transfers/').json()['data']
        self.assertEqual([(r['direction'], r['units']) for r in rows], [('received', 5)])
        self.assertTrue(release_waiting(self.friend) == 0)
