"""Withdrawals the PropShare way: saved accounts, hold, desk (processing / paid / failed), receipts."""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import make_admin, make_ready_investor
from payments.models import BankWithdrawalRequest, PayoutAccount, WalletBalance, WalletTransaction
from payments.withdrawals import WithdrawalError, mark_failed, mark_paid, mark_processing, request_withdrawal

BANK = {'kind': 'bank', 'account_holder_name': 'Iris Investor', 'bank_name': 'Emirates NBD',
        'account_number': 'AE070331234567890123456', 'swift_code': 'EBILAEAD'}
CRYPTO = {'kind': 'crypto', 'crypto_asset': 'USDT', 'crypto_network': 'TRC20',
          'crypto_address': 'TXyz1234567890abcdefABCDEF12345678'}


def wallet(user):
    return WalletBalance.objects.get(user=user, currency='USD')


class PayoutAccountApiTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('1000.00'))
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_first_account_of_a_kind_is_default_and_delete_promotes(self):
        a = self.client.post('/api/v1/payments/payout-accounts/', BANK, format='json')
        self.assertEqual(a.status_code, 201, a.content)
        self.assertTrue(a.json()['data']['is_default'])
        self.assertEqual(a.json()['data']['display'], 'Emirates NBD · ****3456')
        b = self.client.post('/api/v1/payments/payout-accounts/', {**BANK, 'account_number': '999988887777'},
                             format='json').json()['data']
        self.assertFalse(b['is_default'])
        c = self.client.post('/api/v1/payments/payout-accounts/', CRYPTO, format='json').json()['data']
        self.assertTrue(c['is_default'])  # first crypto wallet
        self.client.delete(f"/api/v1/payments/payout-accounts/{a.json()['data']['id']}/")
        self.assertTrue(PayoutAccount.objects.get(pk=b['id']).is_default)

    def test_missing_details_are_refused(self):
        r = self.client.post('/api/v1/payments/payout-accounts/', {'kind': 'bank', 'bank_name': 'X'}, format='json')
        self.assertEqual(r.status_code, 422)

    def test_withdraw_holds_and_replays(self):
        acct = self.client.post('/api/v1/payments/payout-accounts/', BANK, format='json').json()['data']
        body = {'payout_account_id': acct['id'], 'amount': '250'}
        r1 = self.client.post('/api/v1/payments/withdrawals/', body, format='json', HTTP_IDEMPOTENCY_KEY='k1')
        r2 = self.client.post('/api/v1/payments/withdrawals/', body, format='json', HTTP_IDEMPOTENCY_KEY='k1')
        self.assertEqual(r1.status_code, 201, r1.content)
        self.assertEqual(r1.json()['data']['id'], r2.json()['data']['id'])
        self.assertTrue(r1.json()['data']['reference'].startswith('WD-'))
        w = wallet(self.user)
        self.assertEqual((w.available_balance, w.locked_balance), (Decimal('750.00'), Decimal('250.00')))
        self.assertEqual(WalletTransaction.objects.filter(user=self.user, transaction_type='withdrawal').count(), 1)

    def test_only_own_saved_accounts(self):
        other = PayoutAccount.objects.create(user=make_ready_investor(), **BANK)
        r = self.client.post('/api/v1/payments/withdrawals/', {'payout_account_id': str(other.pk), 'amount': '50'},
                             format='json')
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()['error']['code'], 'ACCOUNT_REQUIRED')

    def test_more_than_available_is_refused(self):
        acct = PayoutAccount.objects.create(user=self.user, **BANK)
        r = self.client.post('/api/v1/payments/withdrawals/', {'payout_account_id': str(acct.pk), 'amount': '5000'},
                             format='json')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.json()['error']['code'], 'INSUFFICIENT_FUNDS')

    def test_older_form_saves_the_account(self):
        r = self.client.post('/api/v1/payments/wallet/withdraw-request/', {
            'amount': '100', 'currency': 'USD', 'withdrawal_method': 'bank', 'account_holder_name': 'Iris',
            'bank_name': 'Bank', 'account_number': '12345678'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(PayoutAccount.objects.filter(user=self.user).count(), 1)
        self.assertEqual(BankWithdrawalRequest.objects.get().payout_account.account_number, '12345678')


class DeskTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('1000.00'))
        self.account = PayoutAccount.objects.create(user=self.user, **CRYPTO)
        self.wd = request_withdrawal(self.user, payout_account_id=self.account.pk, amount='400')

    def test_paid_needs_reference_and_consumes_the_hold(self):
        with self.assertRaises(WithdrawalError):
            mark_paid(self.wd, '')
        mark_processing(self.wd)
        mark_paid(self.wd, '0xabc123')
        self.wd.refresh_from_db()
        self.assertEqual((self.wd.status, self.wd.transfer_reference), ('completed', '0xabc123'))
        w = wallet(self.user)
        self.assertEqual((w.available_balance, w.locked_balance), (Decimal('600.00'), Decimal('0.00')))

    def test_failed_returns_the_money_once(self):
        mark_failed(self.wd, 'Address rejected by the exchange')
        with self.assertRaises(WithdrawalError):
            mark_failed(self.wd, 'again')
        w = wallet(self.user)
        self.assertEqual((w.available_balance, w.locked_balance), (Decimal('1000.00'), Decimal('0.00')))
        refund = WalletTransaction.objects.get(user=self.user, transaction_type='refund')
        self.assertEqual(refund.amount, Decimal('400.00'))

    def test_deleting_the_account_keeps_the_copy(self):
        self.account.delete()
        self.wd.refresh_from_db()
        self.assertEqual(self.wd.destination['crypto_address'], CRYPTO['crypto_address'])

    def test_desk_page(self):
        admin = make_admin()
        c = APIClient()
        c.force_login(admin)
        url = f'/admin/payments/bankwithdrawalrequest/{self.wd.pk}/desk/'
        page = c.get(url)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, self.wd.reference)
        self.assertContains(page, CRYPTO['crypto_address'])
        c.post(url, {'action': 'paid', 'transfer_reference': 'TX-778899'})
        self.wd.refresh_from_db()
        self.assertEqual(self.wd.status, 'completed')

    def test_receipt_for_a_ledger_row(self):
        row = WalletTransaction.objects.get(user=self.user, transaction_type='withdrawal')
        c = APIClient()
        c.force_authenticate(self.user)
        data = c.get(f'/api/v1/payments/wallet/transactions/{row.pk}/receipt/').json()['data']
        self.assertTrue(data['number'].startswith('RC-'))
        self.assertEqual(data['related']['reference'], self.wd.reference)
        stranger = APIClient()
        stranger.force_authenticate(make_ready_investor())
        self.assertEqual(stranger.get(f'/api/v1/payments/wallet/transactions/{row.pk}/receipt/').status_code, 404)
