"""
Put a property on the blockchain from the admin (client, Nov 2026 — as on Capimax BRX).

The client enters the property as usual; the admin presses "Register on the blockchain" on the
property page, checks the terms that will be written into the contract, and confirms. Then, in
the background (Celery, `blockchain.tasks.register_property_on_chain`):

  1. the platform's factory contract deploys the property's own token contract (and, for a
     ready property, its rent distributor) with the property's supply, price, lock-up,
     early-exit fee, rental yield and payout frequency;
  2. the property is activated on-chain so its shares can be minted;
  3. the property is marked tokenized with its contract address, and the platform's lock-up is
     set to the one written on-chain (so the ledger and the chain agree);
  4. the shares already bought on the platform are queued to be minted to their owners.

The transaction hash is saved the moment it is sent: if the worker stops while waiting, the next
run only looks the transaction up — it never sends a second deployment.

Then "Tokenization report (Word)" (blockchain/tokenization_report.py) gives the client the
contract details for the investors' tokenization report.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import BlockchainNetwork, ChainRegistrationStatus as S, PropertyChainRegistration, SmartContract

logger = logging.getLogger(__name__)

FREQUENCIES = {0: 'Monthly', 1: 'Quarterly', 2: 'Every 6 months', 3: 'Yearly'}
SENTINEL_SIGNER = '0x000000000000000000000000000000000000dEaD'
MAX_EARLY_EXIT_BPS = 2500  # the contract refuses more than 25%
DEPLOY_GAS = 7_000_000
ACTIVATE_GAS = 200_000
RECEIPT_WAIT = 240
REGISTRABLE = ('approved', 'active', 'under_construction')
LOST_AFTER_MINUTES = 60


class RegistrationError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class Terms:
    lockup_months: int
    early_exit_fee_pct: Decimal
    distribution_frequency: int


# --------------------------------------------------------------------------- reading

def abi_list(value) -> list:
    """A stored ABI as a list: some older rows hold it as JSON text (even text inside text)."""
    import json
    for _ in range(3):
        if not isinstance(value, str):
            break
        try:
            value = json.loads(value)
        except ValueError:
            return []
    if isinstance(value, dict) and 'abi' in value:
        value = value['abi']
    return value if isinstance(value, list) else []


def factory_on(network) -> SmartContract | None:
    return SmartContract.objects.filter(network=network, contract_type='property_factory',
                                        property_reference__isnull=True).first()


def networks():
    """Networks the platform can register on: active, with the factory deployed."""
    return [n for n in BlockchainNetwork.objects.filter(is_active=True).order_by('-chain_id')
            if factory_on(n) is not None]


def default_network():
    nets = networks()
    wanted = getattr(settings, 'DEFAULT_CHAIN_ID', None)
    return next((n for n in nets if n.chain_id == wanted), nets[0] if nets else None)


def is_mainnet(network) -> bool:
    return (getattr(network, 'environment', '') or '').lower() in ('mainnet', 'production')


def current(prop) -> PropertyChainRegistration | None:
    """The registration in progress or done (failed ones don't count)."""
    return prop.chain_registrations.exclude(status=S.FAILED).select_related('network').first()


def latest(prop) -> PropertyChainRegistration | None:
    return prop.chain_registrations.select_related('network').first()


def default_terms(prop) -> Terms:
    return Terms(lockup_months=int(prop.lockup_months or 0), early_exit_fee_pct=Decimal('0'),
                 distribution_frequency=0 if prop.property_category == 'ready_property' else 1)


def rental_yield_bps(prop) -> int:
    pct = prop.rental_yield if prop.rental_yield is not None else (prop.expected_return or 0)
    return int((Decimal(str(pct)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def multisig_owners(signer: str, required: int, *, mainnet: bool) -> list[str]:
    """
    Wallets that control the property contract. CHAIN_MULTISIG_OWNERS (comma-separated) names the
    client's signers; on the test network a placeholder fills the count the factory asks for
    (as for the properties registered so far). On the main network real signers are required.
    """
    from web3 import Web3
    extra = getattr(settings, 'CHAIN_MULTISIG_OWNERS', None) or os.environ.get('CHAIN_MULTISIG_OWNERS', '')
    owners = [Web3.to_checksum_address(signer)]
    for raw in str(extra).replace(';', ',').split(','):
        raw = raw.strip()
        if raw and Web3.is_address(raw) and Web3.to_checksum_address(raw) not in owners:
            owners.append(Web3.to_checksum_address(raw))
    if len(owners) < required:
        if mainnet:
            raise RegistrationError(f'The main network needs {required} real signer wallets: set '
                                    f'CHAIN_MULTISIG_OWNERS on the server first.')
        owners.append(Web3.to_checksum_address(SENTINEL_SIGNER))
    return owners


def problems(prop, network) -> list[str]:
    """Why this property can't be registered now (empty = it can)."""
    out = []
    if network is None:
        out.append('No blockchain network with the platform contracts is set up.')
    if prop.smart_contract_address or prop.status == 'tokenized':
        out.append('This property is already on the blockchain.')
    elif current(prop) is not None:
        out.append('A registration of this property is already in progress.')
    if not prop.total_tokens or prop.total_tokens <= 0:
        out.append('Set the total number of shares first.')
    if not prop.token_price or prop.token_price <= 0:
        out.append('Set the share price first.')
    if prop.status not in REGISTRABLE and prop.status != 'tokenized':
        out.append(f'The property is "{prop.get_status_display()}" — only an approved or active property '
                   f'is registered.')
    if network is not None and is_mainnet(network):
        extra = getattr(settings, 'CHAIN_MULTISIG_OWNERS', None) or os.environ.get('CHAIN_MULTISIG_OWNERS', '')
        if not str(extra).strip():
            out.append('The main network needs the client\'s signer wallets (CHAIN_MULTISIG_OWNERS) first.')
    if not getattr(settings, 'BLOCKCHAIN_PRIVATE_KEY', None):
        out.append('The platform wallet key is not configured on the server.')
    return out


def warnings(prop) -> list[str]:
    out = []
    if getattr(prop, 'spv_entity_id', None) is None and not prop.spv_company_name:
        out.append('No SPV (owning company) is set: the tokenization report will show it as pending.')
    return out


def validate_terms(terms: Terms) -> Terms:
    try:
        fee = Decimal(str(terms.early_exit_fee_pct))
    except Exception:  # noqa: BLE001
        raise RegistrationError('Enter a valid early-exit fee.')
    if fee < 0 or fee * 100 > MAX_EARLY_EXIT_BPS:
        raise RegistrationError('The early-exit fee must be between 0% and 25%.')
    if terms.lockup_months < 0 or terms.lockup_months > 120:
        raise RegistrationError('The lock-up must be between 0 and 120 months.')
    if terms.distribution_frequency not in FREQUENCIES:
        raise RegistrationError('Choose how often rent is paid.')
    return Terms(int(terms.lockup_months), fee, int(terms.distribution_frequency))


# --------------------------------------------------------------------------- request

def request(prop, network, terms: Terms, *, by=None) -> PropertyChainRegistration:
    """Record the request and hand it to the blockchain worker."""
    terms = validate_terms(terms)
    from properties.models import Property
    with transaction.atomic():
        prop = Property.objects.select_for_update().get(pk=prop.pk)
        found = problems(prop, network)
        if found:
            raise RegistrationError(found[0])
        site = (getattr(settings, 'FRONTEND_URL', '') or 'https://capimaxrt.com').rstrip('/')
        reg = PropertyChainRegistration.objects.create(
            property=prop, network=network, requested_by=by,
            total_supply=int(prop.total_tokens), token_price=prop.token_price,
            category=prop.property_category or 'ready_property',
            lockup_months=terms.lockup_months,
            early_exit_fee_bps=int((terms.early_exit_fee_pct * 100).quantize(Decimal('1'))),
            rental_yield_bps=rental_yield_bps(prop),
            distribution_frequency=terms.distribution_frequency,
            property_uri=f'{site}/property-detail?id={prop.pk}',
        )
        # The platform keeps the same lock-up as the contract.
        if prop.lockup_months != terms.lockup_months:
            Property.objects.filter(pk=prop.pk).update(lockup_months=terms.lockup_months)

        def _queue():
            from .tasks import register_property_on_chain
            register_property_on_chain.delay(str(reg.pk))
        transaction.on_commit(_queue)
    return reg


# --------------------------------------------------------------------------- the work

def _fail(reg, message: str):
    reg.status = S.FAILED
    reg.error = message[:4000]
    reg.completed_at = timezone.now()
    reg.save(update_fields=['status', 'error', 'completed_at'])
    logger.error('Chain registration of %s failed: %s', reg.property_id, message)
    _tell_requester(reg)


def run(registration_id: str) -> PropertyChainRegistration:
    """Deploy (or, after a restart, look up) the property's contracts. Safe to run again."""
    from django.core.cache import cache
    key = f'chain-registration:{registration_id}'
    if not cache.add(key, '1', timeout=900):  # another worker has it
        return PropertyChainRegistration.objects.get(pk=registration_id)
    try:
        return _run(registration_id)
    finally:
        cache.delete(key)


def _run(registration_id: str) -> PropertyChainRegistration:
    with transaction.atomic():
        reg = (PropertyChainRegistration.objects.select_for_update(of=('self',))
               .select_related('network', 'property').get(pk=registration_id))
        if reg.status not in (S.QUEUED, S.SENT):
            return reg

    from .services.web3_service import Web3Service
    svc = Web3Service()
    if not svc.initialize_network(str(reg.network_id)) or svc.w3 is None:
        if reg.status == S.QUEUED:
            _fail(reg, f'Could not connect to {reg.network.name}. Nothing was sent; try again later.')
        return reg  # SENT: the transaction exists — the next run looks it up
    if svc.account is None:
        _fail(reg, 'The platform wallet key is not configured on the server.')
        return reg
    w3, account = svc.w3, svc.account

    factory_sc = factory_on(reg.network)
    if factory_sc is None:
        _fail(reg, f'The platform factory contract is not registered on {reg.network.name}.')
        return reg
    factory = w3.eth.contract(address=w3.to_checksum_address(factory_sc.contract_address),
                             abi=abi_list(factory_sc.abi))

    if reg.status == S.QUEUED:
        try:
            _send_deployment(reg, w3, account, factory)
        except RegistrationError as exc:
            _fail(reg, exc.message)
            return reg
        except Exception as exc:  # noqa: BLE001
            if reg.tx_hash:  # sent, then something broke: keep it for the lookup
                logger.warning('Registration %s sent but not confirmed yet: %s', reg.pk, exc)
                return reg
            _fail(reg, f'The deployment could not be sent: {exc}')
            return reg

    try:
        receipt = w3.eth.wait_for_transaction_receipt(reg.tx_hash, timeout=RECEIPT_WAIT)
    except Exception:  # noqa: BLE001 — not mined yet: the next run looks again
        logger.warning('Registration %s: no receipt yet for %s', reg.pk, reg.tx_hash)
        if reg.sent_at and timezone.now() - reg.sent_at > timedelta(minutes=LOST_AFTER_MINUTES):
            try:
                w3.eth.get_transaction(reg.tx_hash)
            except Exception:  # noqa: BLE001 — the network never kept it: nothing was created
                _fail(reg, f'The deployment transaction {reg.tx_hash} never reached the network, so nothing '
                           f'was created. Try again.')
        return reg
    if receipt['status'] != 1:
        _fail(reg, f'The network refused the deployment (transaction {reg.tx_hash}).')
        return reg

    try:
        _finish(reg, w3, account, factory, factory_sc, receipt)
    except RegistrationError as exc:
        _fail(reg, exc.message)
    return reg


def _send_deployment(reg, w3, account, factory):
    from .signer_lock import signer_lock
    from .signing import raw_transaction

    required = int(factory.functions.requiredConfirmations().call())
    owners = multisig_owners(account.address, required, mainnet=is_mainnet(reg.network))
    fee = int(factory.functions.deploymentFee().call())
    category = 1 if reg.category == 'ready_property' else 0
    call = factory.functions.deployProperty(
        int(reg.total_supply), category, w3.to_wei(Decimal(reg.token_price), 'ether'),
        int(reg.lockup_months) * 30 * 24 * 3600, int(reg.early_exit_fee_bps), int(reg.rental_yield_bps),
        reg.property_uri, int(reg.distribution_frequency), 0, owners,
    )
    gas_price = int(w3.eth.gas_price)
    need = fee + DEPLOY_GAS * gas_price
    balance = int(w3.eth.get_balance(account.address))
    if balance < need:
        raise RegistrationError(
            f'The platform wallet {account.address} has {w3.from_wei(balance, "ether")} '
            f'{reg.network.native_currency or ""}; about {w3.from_wei(need, "ether")} is needed. Top it up and retry.')
    # Dry run first: a refusal costs nothing and says why.
    try:
        call.call({'from': account.address, 'value': fee})
    except Exception as exc:  # noqa: BLE001
        raise RegistrationError(f'The factory contract refused this property: {exc}')

    with signer_lock(account.address):
        tx = call.build_transaction({
            'from': account.address, 'value': fee, 'gas': DEPLOY_GAS, 'gasPrice': gas_price,
            'nonce': w3.eth.get_transaction_count(account.address, 'pending'),
            'chainId': reg.network.chain_id,
        })
        signed = w3.eth.account.sign_transaction(tx, account.key)
        tx_hash = w3.eth.send_raw_transaction(raw_transaction(signed))
        reg.tx_hash = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
        if not reg.tx_hash.startswith('0x'):
            reg.tx_hash = '0x' + reg.tx_hash
        reg.status = S.SENT
        reg.sent_at = timezone.now()
        reg.deployer_address = account.address
        reg.factory_address = factory.address
        reg.save(update_fields=['tx_hash', 'status', 'sent_at', 'deployer_address', 'factory_address'])


def _finish(reg, w3, account, factory, factory_sc, receipt):
    from properties.models import Property

    event = None
    for log in receipt['logs']:
        try:
            event = factory.events.PropertyDeployed().process_log(log)
            break
        except Exception:  # noqa: BLE001 — other contracts' logs
            continue
    if event is None:
        raise RegistrationError(f'The deployment went through but its result could not be read '
                                f'(transaction {reg.tx_hash}). Check it on the explorer.')
    token_address = event['args']['tokenContract']
    distributor = event['args']['distributorContract']
    on_chain_id = int(event['args']['propertyId'])
    if distributor and int(distributor, 16) == 0:
        distributor = ''

    reg.on_chain_property_id = on_chain_id
    reg.token_address = token_address
    reg.distributor_address = distributor or ''
    reg.block_number = receipt['blockNumber']
    reg.gas_used = receipt['gasUsed']
    gas_price = receipt.get('effectiveGasPrice') or 0
    reg.cost_native = Decimal(int(receipt['gasUsed']) * int(gas_price)) / Decimal(10 ** 18) if gas_price else None
    reg.save(update_fields=['on_chain_property_id', 'token_address', 'distributor_address', 'block_number',
                            'gas_used', 'cost_native'])

    token_template = SmartContract.objects.filter(network=reg.network, contract_type='real_estate_token',
                                                  property_reference__isnull=True).first()
    if token_template is None:
        raise RegistrationError('The token template contract is not registered on this network.')
    _activate(reg, w3, account, factory, abi_list(token_template.abi))

    prop = reg.property
    with transaction.atomic():
        Property.objects.filter(pk=prop.pk).update(smart_contract_address=token_address, status='tokenized',
                                                   lockup_months=reg.lockup_months)
        terms = {'lockup_months': reg.lockup_months, 'early_exit_fee_bps': reg.early_exit_fee_bps,
                 'rental_yield_bps': reg.rental_yield_bps, 'distribution_frequency': reg.distribution_frequency,
                 'total_supply': reg.total_supply, 'token_price': str(reg.token_price)}
        SmartContract.objects.update_or_create(
            network=reg.network, property_reference=prop, contract_type='real_estate_token',
            defaults={'contract_address': token_address, 'contract_name': f'RealEstateToken — {prop.title}'[:200],
                      'abi': abi_list(token_template.abi), 'compiler_version': token_template.compiler_version,
                      'constructor_args': {'parent_template': token_template.contract_address,
                                           'property_id': on_chain_id},
                      'status': 'active', 'deployment_transaction': reg.tx_hash,
                      'deployer_address': reg.deployer_address, 'deployment_block': reg.block_number,
                      'deployment_gas_used': reg.gas_used, 'metadata': {'terms': terms, 'registration': str(reg.pk)}})
        if distributor:
            dist_template = SmartContract.objects.filter(network=reg.network, contract_type='rental_distributor',
                                                         property_reference__isnull=True).first()
            SmartContract.objects.update_or_create(
                network=reg.network, property_reference=prop, contract_type='rental_distributor',
                defaults={'contract_address': distributor,
                          'contract_name': f'RentalIncomeDistributor — {prop.title}'[:200],
                          'abi': abi_list(dist_template.abi) if dist_template else [],
                          'compiler_version': dist_template.compiler_version if dist_template else '',
                          'constructor_args': {'parent_template': dist_template.contract_address if dist_template
                                               else ''},
                          'status': 'active', 'deployment_transaction': reg.tx_hash,
                          'deployer_address': reg.deployer_address, 'deployment_block': reg.block_number})
        reg.status = S.DONE
        reg.completed_at = timezone.now()
        reg.error = ''
        reg.save(update_fields=['status', 'completed_at', 'error'])
        transaction.on_commit(lambda: _after_done(reg.pk))


def _activate(reg, w3, account, factory, token_abi):
    """New properties come out of the factory as DRAFT; minting needs ACTIVE."""
    from .signer_lock import signer_lock
    from .signing import raw_transaction

    token = w3.eth.contract(address=w3.to_checksum_address(reg.token_address), abi=token_abi)
    if int(token.functions.properties(0).call()[3]) == 1:
        return
    call = factory.functions.activateProperty(int(reg.on_chain_property_id))
    with signer_lock(account.address):
        tx = call.build_transaction({
            'from': account.address, 'gas': ACTIVATE_GAS, 'gasPrice': int(w3.eth.gas_price),
            'nonce': w3.eth.get_transaction_count(account.address, 'pending'), 'chainId': reg.network.chain_id,
        })
        signed = w3.eth.account.sign_transaction(tx, account.key)
        tx_hash = w3.eth.send_raw_transaction(raw_transaction(signed))
        reg.activation_tx = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
        reg.save(update_fields=['activation_tx'])
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=RECEIPT_WAIT)
    if receipt['status'] != 1:
        raise RegistrationError(f'The contracts were created but activating them failed '
                                f'(transaction {reg.activation_tx}).')


def _after_done(registration_id):
    reg = PropertyChainRegistration.objects.select_related('property', 'network', 'requested_by').get(
        pk=registration_id)
    try:
        from investments.backfill import queue_unminted_holdings
        reg.holders_queued = queue_unminted_holdings(reg.property)
        reg.save(update_fields=['holders_queued'])
    except Exception:  # noqa: BLE001
        logger.exception('Queueing the existing holdings of %s failed', reg.property_id)
    _tell_requester(reg)


def _tell_requester(reg):
    user = reg.requested_by
    if user is None:
        return
    try:
        from notifications.services import NotificationService
        if reg.status == S.DONE:
            title = f'{reg.property.title} is on the blockchain'
            message = (f'{reg.property.title} was registered on {reg.network.name}. Token contract: '
                       f'{reg.token_address}. {reg.holders_queued} existing holding(s) are being minted to their '
                       f'owners. Download the tokenization report (Word) from the property page in the admin.')
        else:
            title = f'Blockchain registration of {reg.property.title} failed'
            message = f'{reg.error} Open the property in the admin to try again.'
        NotificationService.create_notification(
            user=user, title=title, message=message, notification_type='system',
            action_url=f'/admin/properties/property/{reg.property_id}/change/', action_label='Open',
            send_email=True)
    except Exception:  # noqa: BLE001
        logger.warning('Registration notice failed for %s', reg.pk, exc_info=True)


def check_sent():
    """
    Beat safety net: look up registrations whose transaction was sent but not confirmed, and
    start the ones whose worker never picked them up (nothing was sent for those yet).
    """
    stale = timezone.now() - timedelta(minutes=10)
    from django.db.models import Q
    pending = PropertyChainRegistration.objects.filter(Q(status=S.SENT) | Q(status=S.QUEUED, created_at__lt=stale))
    for pk in pending.values_list('pk', flat=True):
        try:
            run(str(pk))
        except Exception:  # noqa: BLE001
            logger.exception('Re-checking chain registration %s failed', pk)
