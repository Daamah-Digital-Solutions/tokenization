"""
Platform custodial wallet derivation.

Each user gets a deterministic Ethereum-compatible private key derived from
``PLATFORM_CUSTODY_MASTER_SEED`` + the user's UUID. The private key is never
persisted — it is re-derived on demand whenever the platform needs to sign a
transaction on the user's behalf (e.g. to transfer tokens out to a linked
external wallet).

Storing only the address in the DB means a DB compromise does not leak the
custody keys: those follow the master seed (which lives in the secret manager
/ environment, not the database).

Security notes
--------------
- The master seed is a single point of failure. Treat it like the AWS root
  key. Rotate by re-issuing all custodial addresses + moving balances on-chain.
- ``HMAC-SHA256`` is used as a KDF here for clarity. For higher-stakes
  deployments swap in ``HKDF-SHA256`` with a per-environment ``info`` parameter,
  or move to a KMS-backed signer.
- This module performs no I/O. All callers must explicitly opt-in to using
  the derived key for signing (see ``sign_transaction``).
"""

from __future__ import annotations

import hmac
import hashlib
import logging
import os
from dataclasses import dataclass
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class CustodyConfigurationError(RuntimeError):
    """Raised when custody is requested but the master seed is not configured."""


@dataclass(frozen=True)
class DerivedWallet:
    address: str          # checksummed Ethereum address (0x...)
    private_key_hex: str  # 64-character lowercase hex, NO 0x prefix


def _get_master_seed_bytes() -> bytes:
    """
    Return the 32-byte master seed used for custody derivation.

    The seed is sourced from ``settings.PLATFORM_CUSTODY_MASTER_SEED`` (which
    falls back to the env var of the same name). It must be a hex string of
    at least 64 characters (32 bytes). Anything shorter is refused — it would
    silently weaken the entire custody system.
    """
    raw = getattr(settings, 'PLATFORM_CUSTODY_MASTER_SEED', None) \
        or os.environ.get('PLATFORM_CUSTODY_MASTER_SEED', '').strip()
    if not raw:
        raise CustodyConfigurationError(
            "PLATFORM_CUSTODY_MASTER_SEED is not set. Custodial wallets cannot "
            "be derived. Generate one with: "
            "python -c 'import secrets; print(secrets.token_hex(32))'"
        )
    if raw.startswith('0x') or raw.startswith('0X'):
        raw = raw[2:]
    try:
        seed = bytes.fromhex(raw)
    except ValueError as exc:
        raise CustodyConfigurationError(
            "PLATFORM_CUSTODY_MASTER_SEED must be a hex string."
        ) from exc
    if len(seed) < 32:
        raise CustodyConfigurationError(
            f"PLATFORM_CUSTODY_MASTER_SEED must be at least 32 bytes "
            f"(64 hex chars). Got {len(seed)} bytes."
        )
    return seed


def is_custody_configured() -> bool:
    """Return True iff a usable master seed is present."""
    try:
        _get_master_seed_bytes()
        return True
    except CustodyConfigurationError:
        return False


def derive_custodial_wallet(user_id) -> DerivedWallet:
    """
    Derive the custodial wallet for the given user.

    Identical inputs always produce the same address (deterministic).
    Different user_ids yield uncorrelated addresses with overwhelming
    probability. The private key never leaves this function unless the
    caller explicitly extracts it.
    """
    if user_id is None:
        raise ValueError("user_id must not be None")
    seed = _get_master_seed_bytes()

    # HMAC-SHA256 over the stringified user UUID. user_id is a stable PK; we
    # encode it to UTF-8 so the same UUID always produces the same digest.
    message = str(user_id).encode('utf-8')
    digest = hmac.new(seed, message, hashlib.sha256).digest()

    # The 32-byte HMAC digest is taken as the secp256k1 private key. Values
    # >= the curve order would be invalid, but the probability is < 2^-128
    # — effectively impossible — and ``eth_account`` will raise if we ever
    # hit it, so we don't pre-check.
    from eth_account import Account
    acct = Account.from_key(digest)
    return DerivedWallet(
        address=acct.address,
        private_key_hex=digest.hex(),
    )


def address_for_user(user_id) -> str:
    """Convenience: just the address, no private key in the return value."""
    return derive_custodial_wallet(user_id).address


def sign_transaction(user_id, tx_dict):
    """
    Sign an Ethereum transaction on behalf of the custodial wallet for
    ``user_id``. Returns the signed transaction in eth_account's standard
    shape, ready to broadcast via ``w3.eth.send_raw_transaction``.

    Callers are expected to have already built ``tx_dict`` with the correct
    ``nonce``, ``from``, ``to``, ``gas``, ``gasPrice``/``maxFeePerGas`` etc.
    """
    from eth_account import Account
    derived = derive_custodial_wallet(user_id)
    if tx_dict.get('from') and tx_dict['from'].lower() != derived.address.lower():
        raise ValueError(
            f"Refusing to sign: tx.from={tx_dict['from']} does not match "
            f"user {user_id}'s custodial address {derived.address}"
        )
    return Account.sign_transaction(tx_dict, derived.private_key_hex)


def ensure_user_has_wallet(user) -> Optional[str]:
    """
    Idempotently assign a custodial wallet to the user if they have none.

    Returns the user's wallet address (newly assigned or pre-existing), or
    ``None`` if custody isn't configured (in which case the caller falls back
    to the legacy "no wallet linked" behavior).

    Safe to call repeatedly. Existing addresses are never overwritten — once
    a user has a wallet, that is their wallet for life.
    """
    if user.wallet_address:
        return user.wallet_address
    if not is_custody_configured():
        logger.warning(
            "ensure_user_has_wallet(user_id=%s) called but custody is not "
            "configured. Skipping.", user.pk,
        )
        return None
    derived = derive_custodial_wallet(user.pk)
    user.wallet_address = derived.address
    user.save(update_fields=['wallet_address'])
    logger.info(
        "Assigned custodial wallet %s to user %s", derived.address, user.pk,
    )
    return derived.address
