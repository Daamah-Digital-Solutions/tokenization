"""
On-chain check for a Pronova payment (client round 3, #14).

The confirmation task used to accept any confirmed BSC transaction hash.
A payment is now accepted only if the transaction carries an ERC-20
``Transfer`` of the Pronova token (``PRONOVA_CONFIG['CONTRACT_ADDRESS']``)
to the platform wallet for at least the expected amount, and the hash has
not already paid for another Pronova payment.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Tuple

TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'


def _hex(value) -> str:
    if hasattr(value, 'hex'):
        value = value.hex()
    value = str(value).lower()
    return value if value.startswith('0x') else '0x' + value


def _topic_address(topic) -> str:
    return '0x' + _hex(topic)[-40:]


def verify_pronova_transfer(w3, pronova, *, contract_address: str, decimals: int = 18) -> Tuple[bool, str]:
    """Return (ok, reason)."""
    from .models import PronovaPayment

    if PronovaPayment.objects.filter(tx_hash__iexact=pronova.tx_hash).exclude(pk=pronova.pk).exists():
        return False, 'This transaction hash was already used for another payment.'
    if not contract_address:
        return False, 'PRONOVA_CONTRACT_ADDRESS is not configured.'

    receipt = w3.eth.get_transaction_receipt(pronova.tx_hash)
    recipient = (pronova.platform_wallet_address or '').lower()
    sender = (pronova.sender_wallet_address or '').lower()
    needed = int(Decimal(pronova.pronova_amount) * (Decimal(10) ** decimals))

    paid = 0
    for log in receipt.get('logs', []):
        if (log.get('address') or '').lower() != contract_address.lower():
            continue
        topics = log.get('topics') or []
        if len(topics) < 3 or _hex(topics[0]) != TRANSFER_TOPIC:
            continue
        if _topic_address(topics[2]) != recipient:
            continue
        if sender and _topic_address(topics[1]) != sender:
            continue
        paid += int(_hex(log.get('data')), 16)

    if paid == 0:
        return False, 'No Pronova transfer to the platform wallet was found in this transaction.'
    if paid < needed:
        return False, f'Transfer amount is below the required {pronova.pronova_amount} PRN.'
    return True, ''
