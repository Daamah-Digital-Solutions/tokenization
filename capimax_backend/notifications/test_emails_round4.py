"""
Client round 4, #16 + extra #4: notification emails are branded, sent after the
transaction commits, retried when they fail; the team can email a group of users.
"""

from decimal import Decimal
from unittest.mock import patch

from django.core import mail
from django.test import TestCase

from core.factories import make_admin, make_investment, make_property, make_ready_investor

from .models import Broadcast, EmailLog
from .services import NotificationService


class NotificationEmailTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor()
        mail.outbox.clear()

    def _notify(self, **kw):
        return NotificationService.create_notification(
            user=self.user, title='Shares sold', message='5 shares were sold.',
            notification_type=kw.pop('notification_type', 'success'), action_url='/dashboard?view=wallet',
            action_label='My Wallet', send_email=True, **kw)

    def test_sent_after_commit_with_the_branded_layout(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self._notify()
        self.assertEqual(len(mail.outbox), 0)  # nothing inside the transaction
        for cb in callbacks:
            cb()
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, 'Shares sold — Capimax RT')
        html = msg.alternatives[0][0]
        self.assertIn('CAPIMAX', html)
        self.assertNotIn('System Alert', html + msg.subject)
        self.assertIn('/dashboard?view=wallet', html)  # absolute action link
        self.assertIn('5 shares were sold.', msg.body)  # real plain-text part
        self.assertEqual(EmailLog.objects.get().status, 'sent')

    def test_failed_email_is_retried_by_the_beat_task(self):
        from .emailing import retry_failed
        with patch('notifications.emailing.EmailMultiAlternatives.send', side_effect=OSError('smtp down')):
            with self.captureOnCommitCallbacks(execute=True):
                self._notify()
        log = EmailLog.objects.get()
        self.assertEqual((log.status, log.retry_count), ('failed', 1))
        self.assertEqual(retry_failed(), {'sent': 1, 'failed': 0})
        log.refresh_from_db()
        self.assertEqual(log.status, 'sent')
        self.assertEqual(EmailLog.objects.count(), 1)  # retried in place, no duplicates

    def test_opted_out_user_gets_no_email(self):
        from .models import NotificationPreference
        NotificationPreference.objects.update_or_create(user=self.user, defaults={'email_notifications_enabled': False})
        with self.captureOnCommitCallbacks(execute=True):
            self._notify()
        self.assertEqual(len(mail.outbox), 0)

    def test_market_sale_emails_both_sides(self):
        from datetime import timedelta

        from django.utils import timezone
        from rest_framework.test import APIClient

        from marketplace.models import MarketListing
        prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        seller, buyer = make_ready_investor(), make_ready_investor(wallet_balance=Decimal('1000'))
        make_investment(user=seller, prop=prop, token_amount=20, investment_amount=Decimal('200'),
                        status='completed', completed_at=timezone.now())
        listing = MarketListing.objects.create(property_listing=prop, seller=seller, listing_type='sell',
                                               tokens_offered=10, tokens_remaining=10,
                                               price_per_token=Decimal('12'), minimum_order_size=1,
                                               expires_at=timezone.now() + timedelta(days=2))
        client = APIClient()
        client.force_authenticate(buyer)
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            res = client.post('/api/v1/marketplace/orders/', {
                'listing': str(listing.id), 'order_type': 'market', 'tokens_requested': 5,
                'price_per_token': '12.00', 'total_amount': '60.00'}, format='json')
        self.assertIn(res.status_code, (200, 201), res.content)
        got = {(m.to[0], m.subject.split(' — ')[0]) for m in mail.outbox}
        self.assertIn((buyer.email, 'Purchase completed'), got)
        self.assertIn((seller.email, 'Shares sold'), got)
        self.assertIn((buyer.email, 'Your ownership certificate is ready'), got)


class BroadcastTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.a, self.b = make_ready_investor(), make_ready_investor()
        mail.outbox.clear()

    def test_custom_audience_gets_the_email_and_counters_update(self):
        from .broadcasts import send
        b = Broadcast.objects.create(subject='New property live', title='Skyline is open', message='Shares from $20.',
                                     audience='custom', custom_emails=f'{self.a.email}, nobody@nowhere.test',
                                     action_url='/properties')
        self.assertEqual(send(b.pk), {'sent': 1, 'failed': 0})
        b.refresh_from_db()
        self.assertEqual((b.status, b.recipients_count, b.sent_count), ('sent', 1, 1))
        self.assertEqual([m.to[0] for m in mail.outbox], [self.a.email])
        self.assertEqual(mail.outbox[0].subject, 'New property live')

    def test_marketing_skips_users_who_turned_emails_off(self):
        from .broadcasts import recipients
        from .models import NotificationPreference
        NotificationPreference.objects.update_or_create(user=self.b, defaults={'email_notifications_enabled': False})
        b = Broadcast.objects.create(subject='s', title='t', message='m', audience='all', is_marketing=True)
        emails = set(recipients(b).values_list('email', flat=True))
        self.assertIn(self.a.email, emails)
        self.assertNotIn(self.b.email, emails)
