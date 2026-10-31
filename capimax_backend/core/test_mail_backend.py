"""Replies to a platform email (sent from no-reply@…) reach the support mailbox."""

from unittest.mock import patch

from django.core.mail import EmailMessage
from django.test import SimpleTestCase, override_settings

from core.mail import ReplyToSupportEmailBackend


@override_settings(SUPPORT_EMAIL='support@example.com')
@patch('django.core.mail.backends.smtp.EmailBackend.send_messages', return_value=1)
class ReplyToSupportTests(SimpleTestCase):
    def test_reply_goes_to_support(self, _send):
        msg = EmailMessage('s', 'b', 'no-reply@example.com', ['member@example.com'])
        self.assertEqual(ReplyToSupportEmailBackend().send_messages([msg]), 1)
        self.assertEqual(msg.reply_to, ['support@example.com'])
        self.assertEqual(msg.message()['Reply-To'], 'support@example.com')

    def test_a_message_with_its_own_reply_to_keeps_it(self, _send):
        msg = EmailMessage('s', 'b', 'no-reply@example.com', ['member@example.com'], reply_to=['desk@example.com'])
        ReplyToSupportEmailBackend().send_messages([msg])
        self.assertEqual(msg.reply_to, ['desk@example.com'])
