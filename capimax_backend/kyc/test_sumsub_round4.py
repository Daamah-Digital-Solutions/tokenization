"""
Client round 4, extra #2: the Sumsub adapter is complete — workflow verdicts are
applied and the verified data is kept — so switching on only needs the keys.
"""

from unittest.mock import patch

from django.test import TestCase, override_settings

from core.factories import make_user

from .models import KYCProfile
from .sumsub import external_user_id, process_webhook


@override_settings(SUMSUB_APP_TOKEN='t', SUMSUB_SECRET_KEY='s')
class SumsubRound4Tests(TestCase):
    def setUp(self):
        self.user = make_user(first_name='', last_name='')
        self.profile, _ = KYCProfile.objects.get_or_create(user=self.user)

    def _hook(self, event, answer=None, **extra):
        payload = {'type': event, 'externalUserId': external_user_id(self.user), 'applicantId': 'app-1', **extra}
        if answer:
            payload['reviewResult'] = {'reviewAnswer': answer}
        return process_webhook(payload)

    def test_workflow_completed_green_approves_and_keeps_verified_data(self):
        applicant = {'info': {'firstNameEn': 'Lina', 'lastNameEn': 'Haddad', 'dob': '1990-04-02',
                              'nationality': 'JOR'}}
        with patch('kyc.sumsub.fetch_applicant', return_value=applicant):
            self.assertEqual(self._hook('applicantWorkflowCompleted', 'GREEN'), 'approved')
        self.profile.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.profile.status, 'approved')
        self.assertEqual((self.user.first_name, self.user.last_name), ('Lina', 'Haddad'))
        self.assertEqual(self.profile.nationality, 'JOR')
        self.assertEqual(self.profile.provider_payload['applicant']['id'], 'app-1')

    def test_provider_outage_does_not_undo_the_approval(self):
        with patch('kyc.sumsub.fetch_applicant', side_effect=RuntimeError('down')):
            self.assertEqual(self._hook('applicantReviewed', 'GREEN'), 'approved')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, 'approved')

    def test_on_hold_goes_to_manual_review(self):
        self.assertEqual(self._hook('applicantOnHold'), 'in_review')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, 'in_review')
