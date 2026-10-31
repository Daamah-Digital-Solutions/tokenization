"""
Every platform email is sent from a mailbox nobody reads (no-reply@…), so a
member's reply must reach the support mailbox. Set here once because mail is
sent from many places (notifications, broadcasts, KYC, security alerts…).
"""

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend


class ReplyToSupportEmailBackend(EmailBackend):
    """SMTP, with Reply-To: SUPPORT_EMAIL on messages that do not set their own."""

    def send_messages(self, email_messages):
        support = getattr(settings, 'SUPPORT_EMAIL', '')
        if support:
            for message in email_messages or []:
                if not message.reply_to:
                    message.reply_to = [support]
        return super().send_messages(email_messages)
