"""
Issue and keep certificates in step with the holdings they certify.

sync_investment(inv) / sync_plan(plan) are idempotent and are called after every
save of a purchase or installment plan (signals.py), and by the backfill command:

- no confirmed payment yet         -> nothing
- paid, shares not final           -> a PROVISIONAL certificate
- shares delivered / plan paid off -> the certificate becomes FINAL (holder notified once)
- shares or amount changed         -> the old certificate is revoked and replaced
- holding ended (sold, refunded…)  -> the certificate is revoked
"""

from __future__ import annotations

import hashlib
import logging
import re
import secrets
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Certificate, CertificateStatus

logger = logging.getLogger(__name__)

PROVISIONAL_INVESTMENT = ('payment_confirmed', 'pending_mint', 'minting', 'mint_failed')
ENDED_INVESTMENT = {
    'transferred': 'All shares were sold or transferred.',
    'refunded': 'The purchase was refunded.',
    'cancelled': 'The purchase was cancelled.',
    'failed': 'The purchase did not complete.',
    'expired': 'The purchase was not completed in time.',
}
ENDED_PLAN = {
    'refunded': 'The installment plan was refunded.',
    'cancelled': 'The installment plan was cancelled.',
    'failed': 'The installment plan was not completed.',
}
TX_HASH = re.compile(r'^0x[0-9a-fA-F]{64}$')
SIX = Decimal('0.000001')


# ---------------------------------------------------------------------------
# snapshot helpers
# ---------------------------------------------------------------------------

def _investor_name(user) -> str:
    return (user.get_full_name() or '').strip() or (user.email or '').split('@')[0]


def _mask(value) -> str:
    s = str(value).replace('-', '')
    return f'****{s[-4:].upper()}' if len(s) >= 4 else '****'


def _location(prop) -> str:
    return ', '.join(p for p in (prop.city, getattr(prop, 'state', ''), prop.country) if p)


def _chain(prop) -> dict:
    """The property's token contract (blank while it is not tokenized on-chain)."""
    from blockchain.models import SmartContract

    contract = (SmartContract.objects.filter(property_reference=prop, contract_type='real_estate_token')
                .select_related('network').order_by('-created_at').first())
    if contract is None:
        addr = prop.smart_contract_address or ''
        return {'contract_address': addr, 'network_name': '', 'chain_id': None, 'contract_explorer_url': '',
                'tx_template': None}
    net = contract.network
    return {
        'contract_address': contract.contract_address or '',
        'network_name': net.name if net else '',
        'chain_id': net.chain_id if net else None,
        'contract_explorer_url': contract.explorer_url or '',
        'tx_template': net.block_explorer_tx_url if net else None,
    }


def _spv(prop) -> dict:
    from properties.spv import spv_details

    spv = spv_details(prop) or {}
    return {'spv_name': spv.get('name', ''), 'spv_registration_ref': spv.get('registration_number', ''),
            'spv_jurisdiction': spv.get('jurisdiction', '')}


def _ownership(units: int, total: int) -> Decimal:
    if not total:
        return Decimal('0')
    return (Decimal(units) * 100 / Decimal(total)).quantize(SIX, rounding=ROUND_HALF_UP)


def _investment_snapshot(inv) -> dict:
    prop, user = inv.property_investment, inv.user
    chain = _chain(prop)
    method = (inv.payment_method or {}).get('type', '') if isinstance(inv.payment_method, dict) else ''
    unit_price = inv.unit_price_snapshot or prop.token_price or Decimal('0')
    tx = inv.transaction_hash if inv.transaction_hash and TX_HASH.match(inv.transaction_hash) else ''
    return {
        'user': user, 'property_ref': prop,
        'investor_name': _investor_name(user), 'investor_id_masked': _mask(user.pk),
        **_spv(prop),
        'property_name': prop.title, 'property_location': _location(prop),
        'units': inv.token_amount, 'total_units': prop.total_tokens or 0,
        'unit_price': Decimal(str(unit_price)).quantize(Decimal('0.01')),
        'investment_amount': Decimal(str(inv.investment_amount or 0)).quantize(Decimal('0.01')),
        'ownership_percentage': _ownership(inv.token_amount, prop.total_tokens),
        'acquisition': 'market' if method == 'secondary_market' else (method or 'purchase'),
        'subscription_date': (inv.created_at or timezone.now()).date(),
        'holder_wallet': inv.destination_wallet or user.wallet_address or '',
        'contract_address': chain['contract_address'], 'network_name': chain['network_name'],
        'chain_id': chain['chain_id'], 'contract_explorer_url': chain['contract_explorer_url'],
        'mint_tx_hash': tx,
        'mint_tx_url': chain['tx_template'].format(tx_hash=tx) if tx and chain['tx_template'] else '',
    }


def _plan_snapshot(plan) -> dict:
    prop, user = plan.property_investment, plan.investor
    chain = _chain(prop)
    units = plan.token_allocation
    return {
        'user': user, 'property_ref': prop,
        'investor_name': _investor_name(user), 'investor_id_masked': _mask(user.pk),
        **_spv(prop),
        'property_name': prop.title, 'property_location': _location(prop),
        'units': units, 'total_units': prop.total_tokens or 0,
        'unit_price': (Decimal(str(plan.total_investment_amount or 0)) / units).quantize(Decimal('0.01'))
        if units else Decimal('0'),
        'investment_amount': Decimal(str(plan.total_investment_amount or 0)).quantize(Decimal('0.01')),
        'ownership_percentage': _ownership(units, prop.total_tokens),
        'acquisition': 'installments',
        'subscription_date': (plan.created_at or timezone.now()).date(),
        'holder_wallet': user.wallet_address or '',
        'contract_address': chain['contract_address'], 'network_name': chain['network_name'],
        'chain_id': chain['chain_id'], 'contract_explorer_url': chain['contract_explorer_url'],
        'mint_tx_hash': '', 'mint_tx_url': '',
    }


# Fields whose change means the certificate no longer describes the holding.
MATERIAL = ('units', 'investment_amount', 'property_name')
# Fields refreshed in place (they complete the record, e.g. the contract is deployed or the mint lands).
LIVE = ('holder_wallet', 'contract_address', 'network_name', 'chain_id', 'contract_explorer_url', 'mint_tx_hash',
        'mint_tx_url', 'spv_name', 'spv_registration_ref', 'spv_jurisdiction', 'investor_name', 'property_location',
        'total_units', 'ownership_percentage')


def signature_hash(cert: Certificate) -> str:
    """Tamper-evident digest over the certificate's material fields (SHA-256, as BRX)."""
    canonical = '|'.join(str(x) for x in (
        cert.certificate_id, cert.investor_name, cert.investor_id_masked, cert.property_name, cert.spv_name,
        cert.investment_amount, cert.units, cert.unit_price, cert.ownership_percentage, cert.verification_code))
    return hashlib.sha256(canonical.encode()).hexdigest()


def _new_id(prop_name: str) -> str:
    token = ''.join(c for c in (prop_name or '') if c.isalnum()).upper()[:4] or 'PROP'
    while True:
        cert_id = f'CERT-{timezone.now().year}-{token}-{secrets.token_hex(3).upper()}'
        if not Certificate.objects.filter(certificate_id=cert_id).exists():
            return cert_id


def _issue(source: dict, snap: dict, final: bool) -> Certificate:
    cert = Certificate(**source, **{k: v for k, v in snap.items()},
                       certificate_id=_new_id(snap['property_name']),
                       verification_code=secrets.token_urlsafe(16),
                       authorized_signatory=getattr(settings, 'CERTIFICATE_AUTHORIZED_SIGNATORY',
                                                    'Capimax RT — Authorized Signatory'),
                       status=CertificateStatus.FINAL if final else CertificateStatus.PROVISIONAL,
                       finalized_at=timezone.now() if final else None)
    cert.digital_signature_hash = signature_hash(cert)
    cert.save()
    return cert


def revoke(cert: Certificate, reason: str, replaced_by: Certificate | None = None) -> None:
    cert.status = CertificateStatus.REVOKED
    cert.revoked_at = timezone.now()
    cert.revocation_reason = reason[:300]
    cert.replaced_by = replaced_by
    cert.save(update_fields=['status', 'revoked_at', 'revocation_reason', 'replaced_by', 'updated_at'])


def _notify_final(cert: Certificate) -> None:
    try:
        from notifications.services import NotificationService

        NotificationService.create_notification(
            user=cert.user,
            title='Your ownership certificate is ready',
            message=(f'Your certificate {cert.certificate_id} for {cert.units} share(s) of {cert.property_name} '
                     f'is final. You can view it, download the PDF and verify it with its QR code from '
                     f'My Certificates.'),
            notification_type='success',
            action_url='/dashboard?view=certificates',
            action_label='My Certificates',
            send_email=True,
        )
    except Exception:  # noqa: BLE001 — a notice must never break issuance
        logger.exception('Certificate notification failed (%s)', cert.certificate_id)


def _sync(source: dict, snap: dict | None, final: bool, ended_reason: str | None, notify: bool):
    current = (Certificate.objects.select_for_update().filter(**source)
               .exclude(status=CertificateStatus.REVOKED).order_by('-created_at').first())
    if ended_reason:
        if current:
            revoke(current, ended_reason)
        return None
    if snap is None or not snap['units']:
        return current

    if current and any(getattr(current, f) != snap[f] for f in MATERIAL):
        old_units = current.units
        new = _issue(source, snap, final)
        revoke(current, f'Holding changed from {old_units} to {snap["units"]} share(s); replaced by '
                        f'{new.certificate_id}.', replaced_by=new)
        return new
    if current is None:
        cert = _issue(source, snap, final)
        if final and notify:
            transaction.on_commit(lambda: _notify_final(cert))
        return cert

    changed = [f for f in LIVE if getattr(current, f) != snap[f]]
    for f in changed:
        setattr(current, f, snap[f])
    became_final = final and current.status == CertificateStatus.PROVISIONAL
    if became_final:
        current.status = CertificateStatus.FINAL
        current.finalized_at = timezone.now()
        changed += ['status', 'finalized_at']
    if changed:
        current.digital_signature_hash = signature_hash(current)
        current.save(update_fields=[*changed, 'digital_signature_hash', 'updated_at'])
    if became_final and notify:
        transaction.on_commit(lambda: _notify_final(current))
    return current


def sync_investment(inv, notify: bool = True):
    """Issue / update / revoke the certificate of one purchase."""
    status = inv.status
    if status in ENDED_INVESTMENT or (status == 'completed' and not inv.token_amount):
        with transaction.atomic():
            return _sync({'investment': inv}, None, False,
                         ENDED_INVESTMENT.get(status, 'All shares were sold or transferred.'), notify)
    if status not in PROVISIONAL_INVESTMENT and status != 'completed':
        return None
    with transaction.atomic():
        return _sync({'investment': inv}, _investment_snapshot(inv), status == 'completed', None, notify)


def sync_plan(plan, notify: bool = True):
    if plan.status in ENDED_PLAN:
        with transaction.atomic():
            return _sync({'installment_plan': plan}, None, False, ENDED_PLAN[plan.status], notify)
    paid = (plan.payments_made or 0) > 0 or Decimal(str(plan.total_amount_paid or 0)) > 0
    if plan.status != 'completed' and not paid:
        return None
    with transaction.atomic():
        return _sync({'installment_plan': plan}, _plan_snapshot(plan), plan.status == 'completed', None, notify)


sync_investment.related = ('user', 'property_investment')
sync_plan.related = ('investor', 'property_investment')
