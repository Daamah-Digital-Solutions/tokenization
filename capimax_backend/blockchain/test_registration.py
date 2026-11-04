"""
"Register on the blockchain" from the property admin and the Word tokenization report (client,
Nov 2026). The network is faked: what is checked is what the platform sends, records and shows.
"""

import io
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from blockchain import registration as chain
from blockchain.models import BlockchainNetwork, PropertyChainRegistration, SmartContract
from core.factories import make_admin, make_user, make_investment, make_investor, make_legal_entity, make_property

SIGNER = '0x9278A652585779935F7FDbD6D1259f327B12AfD0'
TOKEN = '0x1111111111111111111111111111111111111111'
DISTRIBUTOR = '0x2222222222222222222222222222222222222222'
FACTORY = '0x4B5301C45B876F4197F3Fc25b7e4dE062382F651'
TX = '0x' + 'ab' * 32


class _Hash:
    def __init__(self, h):
        self.h = h

    def hex(self):
        return self.h


class _Fn:
    def __init__(self, chain_, name, args):
        self.c, self.name, self.args = chain_, name, args

    def call(self, *_a, **_k):
        c = self.c
        if self.name == 'requiredConfirmations':
            return 2
        if self.name == 'deploymentFee':
            return 10 ** 16
        if self.name == 'deployProperty':
            if c.refuse:
                raise Exception('execution reverted: Not authorized')
            c.deploy_args = self.args
            return None
        if self.name == 'properties':
            return [c.terms[0], c.minted, c.terms[1], c.status, c.terms[3], c.terms[4], c.terms[5], SIGNER,
                    'uri', c.terms[2], 1_762_000_000, 0, False]
        raise AssertionError(self.name)

    def build_transaction(self, params):
        return {'fn': self.name, 'args': self.args, **params}


class _Functions:
    def __init__(self, c):
        self.c = c

    def __getattr__(self, name):
        return lambda *args: _Fn(self.c, name, args)


class _Event:
    def process_log(self, log):
        if log != 'deployed':
            raise ValueError('not ours')
        return {'args': {'propertyId': 7, 'tokenContract': TOKEN, 'distributorContract': DISTRIBUTOR}}


class _Events:
    def PropertyDeployed(self):  # noqa: N802
        return _Event()


class _Contract:
    def __init__(self, c, address):
        self.address = address
        self.functions = _Functions(c)
        self.events = _Events()


class FakeChain:
    """Just enough of web3 for registration.py."""

    def __init__(self):
        self.sent = []
        self.balance = 10 ** 18
        self.refuse = False
        self.mined = True
        self.receipt_status = 1
        self.status = 0  # DRAFT until activated
        self.minted = 0
        self.terms = None
        self.deploy_args = None
        self.eth = self
        self.account = self
        self.gas_price = 10 ** 9

    # web3.eth
    def contract(self, address, abi):
        return _Contract(self, address)

    def get_balance(self, _a):
        return self.balance

    def get_transaction_count(self, *_a):
        return len(self.sent)

    def sign_transaction(self, tx, _key):
        return mock.Mock(raw_transaction=tx)

    def send_raw_transaction(self, tx):
        self.sent.append(tx)
        if tx['fn'] == 'deployProperty':
            a = tx['args']
            # totalSupply, category, price, lockup, exit fee, yield
            self.terms = [a[0], a[1], a[2], a[3], a[4], a[5]]
            return _Hash(TX)
        if tx['fn'] == 'activateProperty':
            self.status = 1
            return _Hash('0x' + 'cd' * 32)
        raise AssertionError(tx['fn'])

    def wait_for_transaction_receipt(self, tx_hash, timeout=None):
        if not self.mined:
            raise TimeoutError('not mined')
        h = tx_hash.hex() if hasattr(tx_hash, 'hex') else tx_hash
        return {'status': self.receipt_status if h == TX else 1, 'logs': ['other', 'deployed'],
                'blockNumber': 123456, 'gasUsed': 4_000_000, 'effectiveGasPrice': 10 ** 9}

    def get_transaction(self, _h):
        return {}

    # web3 helpers
    def to_wei(self, v, _unit):
        return int(Decimal(str(v)) * 10 ** 18)

    def from_wei(self, v, _unit):
        return Decimal(v) / Decimal(10 ** 18)

    def to_checksum_address(self, a):
        return a


class _Service:
    chain_ = None

    def __init__(self, *a, **k):
        self.w3 = None
        self.account = None

    def initialize_network(self, _id):
        self.w3 = self.chain_
        self.account = mock.Mock(address=SIGNER, key=b'k')
        return True


LOCMEM = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}


@override_settings(CACHES=LOCMEM, BLOCKCHAIN_PRIVATE_KEY='0x' + '1' * 64, FRONTEND_URL='https://capimaxrt.com')
class RegistrationTests(TestCase):
    def setUp(self):
        self.net = BlockchainNetwork.objects.create(
            name='BNB Smart Chain Testnet', network_type='bsc', environment='testnet', chain_id=97,
            rpc_url='https://rpc.example', explorer_url='https://testnet.bscscan.com', native_currency='tBNB')
        SmartContract.objects.create(network=self.net, contract_type='property_factory', contract_address=FACTORY,
                                     contract_name='Factory', abi=[], status='active')
        SmartContract.objects.create(network=self.net, contract_type='real_estate_token',
                                     contract_address='0xd186eFAF6D38ac2225eDaC43DB4Be1db6aFE6B14',
                                     contract_name='Token template', abi=[{'t': 1}], status='active')
        SmartContract.objects.create(network=self.net, contract_type='rental_distributor',
                                     contract_address='0x95F3D62Bc0F637F16428665f602BF316863EFD6c',
                                     contract_name='Distributor template', abi=[], status='active')
        self.admin = make_admin()
        self.spv = make_legal_entity(name='Mayfair Crown SPV LLC', jurisdiction='Wyoming, USA',
                                     registration_number='2026-001234567')
        self.prop = make_property(title='Mayfair Crown', status='active', smart_contract_address='',
                                  total_tokens=130_000, token_price=Decimal('100.00'), lockup_months=12,
                                  rental_yield=Decimal('6.50'), spv_entity=self.spv)
        self.fake = FakeChain()
        _Service.chain_ = self.fake
        patcher = mock.patch('blockchain.services.web3_service.Web3Service', _Service)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _request(self, **terms):
        t = chain.Terms(lockup_months=terms.get('lockup', 0), early_exit_fee_pct=Decimal(terms.get('fee', '0')),
                        distribution_frequency=terms.get('freq', 0))
        with mock.patch('blockchain.tasks.register_property_on_chain.delay') as delay, \
                self.captureOnCommitCallbacks(execute=True):
            reg = chain.request(self.prop, self.net, t, by=self.admin)
        return reg, delay

    # ------------------------------------------------------------------ checks

    def test_problems_block_what_cannot_be_registered(self):
        self.assertEqual(chain.problems(self.prop, self.net), [])
        draft = make_property(status='draft', smart_contract_address='')
        self.assertIn('only an approved or active property', ' '.join(chain.problems(draft, self.net)))
        done = make_property(status='tokenized')
        self.assertIn('already on the blockchain', ' '.join(chain.problems(done, self.net)))
        empty = make_property(status='active', smart_contract_address='', total_tokens=0)
        self.assertIn('number of shares', ' '.join(chain.problems(empty, self.net)))
        with self.assertRaises(chain.RegistrationError):
            chain.validate_terms(chain.Terms(0, Decimal('30'), 0))  # the contract caps the fee at 25%

    def test_request_records_terms_and_queues_the_worker(self):
        reg, delay = self._request(lockup=0, fee='2.5', freq=1)
        delay.assert_called_once_with(str(reg.pk))
        self.assertEqual((reg.status, reg.total_supply, reg.token_price), ('queued', 130_000, Decimal('100.00')))
        self.assertEqual((reg.lockup_months, reg.early_exit_fee_bps, reg.rental_yield_bps), (0, 250, 650))
        self.assertEqual(reg.property_uri, f'https://capimaxrt.com/property-detail?id={self.prop.pk}')
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.lockup_months, 0)  # the platform keeps the contract's lock-up
        with self.assertRaises(chain.RegistrationError):  # one registration at a time
            self._request()

    # ------------------------------------------------------------------ the work

    def test_run_deploys_activates_marks_tokenized_and_mints_existing_holders(self):
        owner = make_investor()
        held = make_investment(user=owner, prop=self.prop, token_amount=40, status='completed',
                               completed_at=timezone.now())
        reg, _ = self._request(lockup=6, fee='0', freq=0)
        with mock.patch('notifications.services.NotificationService.create_notification') as notify, \
                self.captureOnCommitCallbacks(execute=True):
            chain.run(str(reg.pk))
        reg.refresh_from_db()
        self.assertEqual(reg.status, 'done', reg.error)
        self.assertEqual((reg.tx_hash, reg.token_address, reg.distributor_address, reg.on_chain_property_id),
                         (TX, TOKEN, DISTRIBUTOR, 7))
        self.assertTrue(reg.activation_tx)
        # what was written on-chain
        supply, category, price, lockup, fee, yld = self.fake.terms
        self.assertEqual((supply, category, price, lockup, fee, yld),
                         (130_000, 1, 100 * 10 ** 18, 6 * 30 * 86400, 0, 650))
        owners = self.fake.sent[0]['args'][-1]
        self.assertEqual(len(owners), 2)  # the factory asks for 2 signers
        self.prop.refresh_from_db()
        self.assertEqual((self.prop.status, self.prop.smart_contract_address, self.prop.lockup_months),
                         ('tokenized', TOKEN, 6))
        token = SmartContract.objects.get(property_reference=self.prop, contract_type='real_estate_token')
        self.assertEqual((token.contract_address, token.deployment_transaction, token.abi), (TOKEN, TX, [{'t': 1}]))
        self.assertTrue(SmartContract.objects.filter(property_reference=self.prop,
                                                     contract_type='rental_distributor').exists())
        held.refresh_from_db()
        self.assertEqual(held.status, 'pending_mint')  # the share bought earlier is minted now
        self.assertEqual(reg.holders_queued, 1)
        self.assertIn('is on the blockchain', notify.call_args.kwargs['title'])
        self.assertEqual(notify.call_args.kwargs['user'], self.admin)

    def test_a_restart_while_waiting_never_sends_twice(self):
        reg, _ = self._request()
        self.fake.mined = False
        chain.run(str(reg.pk))
        reg.refresh_from_db()
        self.assertEqual((reg.status, reg.tx_hash), ('sent', TX))
        self.fake.mined = True
        with mock.patch('notifications.services.NotificationService.create_notification'), \
                self.captureOnCommitCallbacks(execute=True):
            chain.check_sent()
        reg.refresh_from_db()
        self.assertEqual(reg.status, 'done')
        self.assertEqual([t['fn'] for t in self.fake.sent], ['deployProperty', 'activateProperty'])

    def test_not_enough_funds_or_a_refusal_sends_nothing(self):
        self.fake.balance = 0
        reg, _ = self._request()
        with mock.patch('notifications.services.NotificationService.create_notification') as notify:
            chain.run(str(reg.pk))
        reg.refresh_from_db()
        self.assertEqual(reg.status, 'failed')
        self.assertIn('Top it up', reg.error)
        self.assertIn('failed', notify.call_args.kwargs['title'])
        self.assertEqual(self.fake.sent, [])
        # a failed attempt can be retried; the dry run catches a refusal for free
        self.fake.balance = 10 ** 18
        self.fake.refuse = True
        reg2, _ = self._request()
        with mock.patch('notifications.services.NotificationService.create_notification'):
            chain.run(str(reg2.pk))
        reg2.refresh_from_db()
        self.assertEqual(reg2.status, 'failed')
        self.assertIn('refused', reg2.error)
        self.assertEqual(self.fake.sent, [])
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.status, 'active')

    def test_a_reverted_deployment_fails_and_leaves_the_property(self):
        self.fake.receipt_status = 0
        reg, _ = self._request()
        with mock.patch('notifications.services.NotificationService.create_notification'):
            chain.run(str(reg.pk))
        reg.refresh_from_db()
        self.assertEqual(reg.status, 'failed')
        self.assertIn(TX, reg.error)
        self.prop.refresh_from_db()
        self.assertEqual((self.prop.status, self.prop.smart_contract_address), ('active', ''))

    # ------------------------------------------------------------------ the report

    def _text(self, data):
        from docx import Document
        doc = Document(io.BytesIO(data))
        parts = [p.text for p in doc.paragraphs]
        for t in doc.tables:
            for r in t.rows:
                parts.append(' | '.join(c.text for c in r.cells))
        return '\n'.join(parts)

    def test_report_after_registration_reads_the_contract(self):
        from blockchain.tokenization_report import build
        reg, _ = self._request(lockup=0, fee='0', freq=1)
        with mock.patch('notifications.services.NotificationService.create_notification'), \
                self.captureOnCommitCallbacks(execute=True):
            chain.run(str(reg.pk))
        self.prop.refresh_from_db()
        self.fake.minted = 40
        text = self._text(build(self.prop))
        for expected in ('Tokenization Report — Mayfair Crown', 'Test network', 'Mayfair Crown SPV LLC',
                         '2026-001234567', TOKEN, DISTRIBUTOR, TX, '123,456', 'chain ID 97', '130,000 shares',
                         'None — shares can be transferred right away', '6.50%', 'Read from the blockchain',
                         'Shares issued so far | 40', 'Contract status | Active', 'ERC-1155'):
            self.assertIn(expected, text)

    def test_report_for_an_older_property_and_when_the_network_is_down(self):
        from blockchain.tokenization_report import ReportError, build
        with self.assertRaises(ReportError):
            build(self.prop)  # not on the blockchain yet
        old = make_property(title='Palm Villa 27', status='tokenized', smart_contract_address=TOKEN)
        SmartContract.objects.create(network=self.net, property_reference=old, contract_type='real_estate_token',
                                     contract_address=TOKEN, contract_name='old', abi=[], status='active',
                                     deployment_transaction=TX, constructor_args='{"property_id": 2}')  # older rows: text
        self.fake.terms = [200_000, 1, 50 * 10 ** 18, 365 * 86400, 1000, 500]
        text = self._text(build(old))
        self.assertIn('365 days from each purchase', text)
        self.assertIn('10.00%', text)
        self.assertIn('Pending registration', text)  # no SPV entered
        self.assertIn('Property number in the factory | 2', text)
        with mock.patch.object(_Service, 'initialize_network', return_value=False):
            text = self._text(build(old))
        self.assertIn("From the platform's record", text)

    # ------------------------------------------------------------------ the admin

    def test_admin_button_page_and_report_download(self):
        self.client.force_login(self.admin)
        change = reverse('admin:properties_property_change', args=[self.prop.pk])
        page = self.client.get(change)
        self.assertContains(page, 'Register on the blockchain')
        url = reverse('admin:properties_property_blockchain_register', args=[self.prop.pk])
        form = self.client.get(url)
        self.assertContains(form, 'Mayfair Crown SPV LLC')
        self.assertContains(form, 'value="12"')  # lock-up prefilled from the property
        no_tick = self.client.post(url, {'network': self.net.pk, 'lockup_months': 0, 'early_exit_fee_pct': 0,
                                         'distribution_frequency': 0})
        self.assertContains(no_tick, 'Tick the confirmation box')
        self.assertFalse(PropertyChainRegistration.objects.exists())
        with mock.patch('blockchain.tasks.register_property_on_chain.delay'), \
                self.captureOnCommitCallbacks(execute=True):
            ok = self.client.post(url, {'network': self.net.pk, 'lockup_months': 0, 'early_exit_fee_pct': 0,
                                        'distribution_frequency': 0, 'confirm': '1'})
        self.assertRedirects(ok, change, fetch_redirect_response=False)
        reg = PropertyChainRegistration.objects.get()
        self.assertContains(self.client.get(change), 'Reload this page in a minute')
        with mock.patch('notifications.services.NotificationService.create_notification'), \
                self.captureOnCommitCallbacks(execute=True):
            chain.run(str(reg.pk))
        page = self.client.get(change)
        self.assertContains(page, 'Download tokenization report (Word)')
        doc = self.client.get(reverse('admin:properties_property_blockchain_report', args=[self.prop.pk]))
        self.assertEqual(doc['Content-Type'],
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        self.assertIn('Tokenization-Report-Mayfair-Crown.docx', doc['Content-Disposition'])

    def test_only_a_full_admin_registers(self):
        staff = make_user(role='admin', is_staff=True, is_superuser=False)
        from django.contrib.auth.models import Permission
        staff.user_permissions.add(*Permission.objects.filter(codename__in=['view_property', 'change_property']))
        self.client.force_login(staff)
        url = reverse('admin:properties_property_blockchain_register', args=[self.prop.pk])
        r = self.client.post(url, {'network': self.net.pk, 'confirm': '1'})
        self.assertEqual(r.status_code, 302)
        self.assertFalse(PropertyChainRegistration.objects.exists())
