"""
Wallet API endpoints — user-facing custodial + external wallet management.

Three endpoints:

- ``GET  /api/v1/auth/wallet/``               → current state
- ``POST /api/v1/auth/wallet/link-external/`` → connect a self-custody wallet
                                                (with sign-to-prove ownership)
- ``POST /api/v1/auth/wallet/unlink-external/`` → forget the external wallet

The link flow uses an EIP-191 ``personal_sign`` message that includes a
short-lived nonce + the user's email + the address being linked. The
backend recovers the signer from the signature and refuses to attach
anything that doesn't match. No private keys ever touch the server.
"""

from __future__ import annotations

import logging
import secrets
import time
from typing import Dict, Any

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils import create_success_response, create_error_response

from .models import WalletKind


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Nonce store — short-lived (5 min) tokens used during sign-to-prove.
# ---------------------------------------------------------------------------

NONCE_TTL_SECONDS = 300
NONCE_CACHE_PREFIX = 'wallet_link_nonce'


def _nonce_key(user_id, address: str) -> str:
    return f'{NONCE_CACHE_PREFIX}:{user_id}:{address.lower()}'


def _issue_nonce(user_id, address: str) -> str:
    nonce = secrets.token_urlsafe(24)
    cache.set(_nonce_key(user_id, address), nonce, NONCE_TTL_SECONDS)
    return nonce


def _consume_nonce(user_id, address: str) -> str | None:
    """Pop the nonce so each one is single-use."""
    key = _nonce_key(user_id, address)
    val = cache.get(key)
    if val is not None:
        cache.delete(key)
    return val


def _build_sign_message(email: str, address: str, nonce: str) -> str:
    """
    Build the message the user must sign in their wallet.

    Format kept human-readable so users can sanity-check it in MetaMask
    before approving. The platform name + nonce makes it impossible to
    replay a signature from a different context.
    """
    return (
        "Capimax — link wallet to account\n\n"
        f"Account: {email}\n"
        f"Wallet: {address}\n"
        f"Nonce: {nonce}\n"
        f"Expires-In: {NONCE_TTL_SECONDS}s\n\n"
        "Signing this message proves you control this wallet. It will not "
        "trigger an on-chain transaction or spend any funds."
    )


def _checksum(address: str) -> str:
    """Return the EIP-55 checksum form of an address, or '' if invalid."""
    try:
        from eth_utils import to_checksum_address
        return to_checksum_address(address)
    except Exception:  # noqa: BLE001
        return ''


# ---------------------------------------------------------------------------
# GET /auth/wallet/
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_info(request):
    """Return both wallet slots and which one is primary."""
    u = request.user
    body: Dict[str, Any] = {
        'primary_wallet': u.wallet_address,
        'primary_kind': u.wallet_kind,
        'external_wallet': u.external_wallet_address,
        'has_external': bool(u.external_wallet_address),
        'custody_explanation': (
            "Your Capimax wallet is platform-managed: you don't need to "
            "install MetaMask to invest with a card. You can optionally "
            "link a self-custody wallet (MetaMask / hardware) to receive "
            "crypto-paid investments directly, and to later withdraw "
            "tokens from custody."
            if u.wallet_kind == WalletKind.CUSTODIAL
            else "You are using a self-custody wallet."
        ),
    }
    return Response(create_success_response(
        data=body, message='Wallet info retrieved'
    ))


# ---------------------------------------------------------------------------
# POST /auth/wallet/link-external/
# ---------------------------------------------------------------------------
#
# Two-step flow:
#   1. POST {"address": "0x..."} with no signature   → server issues a nonce
#      and returns the exact message the wallet must sign.
#   2. POST {"address": "0x...", "signature": "0x..."} → server recovers the
#      signer from the signature, compares to the address, attaches if match.

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_external_wallet(request):
    raw_address = (request.data.get('address') or '').strip()
    signature = (request.data.get('signature') or '').strip()

    address = _checksum(raw_address)
    if not address:
        return Response(
            create_error_response(
                message='A valid Ethereum address is required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Step 1 — caller asked for a challenge.
    if not signature:
        nonce = _issue_nonce(request.user.pk, address)
        message = _build_sign_message(request.user.email, address, nonce)
        return Response(create_success_response(
            data={
                'step': 'sign_message',
                'address': address,
                'message_to_sign': message,
                'nonce': nonce,
                'expires_in_seconds': NONCE_TTL_SECONDS,
            },
            message='Sign this message with the wallet you want to link.',
        ))

    # Step 2 — caller submitted a signature; verify it.
    nonce = _consume_nonce(request.user.pk, address)
    if not nonce:
        return Response(
            create_error_response(
                message=(
                    'No active link challenge for this address. Request a '
                    'fresh message and try again.'
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    message = _build_sign_message(request.user.email, address, nonce)
    try:
        from eth_account.messages import encode_defunct
        from eth_account import Account
        recovered = Account.recover_message(encode_defunct(text=message), signature=signature)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            'link_external_wallet recovery failed for user %s: %s',
            request.user.pk, exc,
        )
        return Response(
            create_error_response(
                message='Could not recover signer from signature.',
                status_code=status.HTTP_400_BAD_REQUEST,
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    if recovered.lower() != address.lower():
        logger.warning(
            'link_external_wallet signer mismatch for user %s: expected %s, got %s',
            request.user.pk, address, recovered,
        )
        return Response(
            create_error_response(
                message=(
                    'Signature did not match the wallet address. Please '
                    'sign with the same wallet you are linking.'
                ),
                status_code=status.HTTP_400_BAD_REQUEST,
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.external_wallet_address = address
    request.user.save(update_fields=['external_wallet_address'])
    logger.info(
        'User %s linked external wallet %s',
        request.user.pk, address,
    )
    return Response(create_success_response(
        data={
            'address': address,
            'linked_at': int(time.time()),
        },
        message='External wallet linked successfully.',
    ))


# ---------------------------------------------------------------------------
# POST /auth/wallet/unlink-external/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlink_external_wallet(request):
    if not request.user.external_wallet_address:
        return Response(
            create_error_response(
                message='No external wallet is linked.',
                status_code=status.HTTP_400_BAD_REQUEST,
            ),
            status=status.HTTP_400_BAD_REQUEST,
        )

    previous = request.user.external_wallet_address
    request.user.external_wallet_address = None
    request.user.save(update_fields=['external_wallet_address'])
    logger.info(
        'User %s unlinked external wallet %s',
        request.user.pk, previous,
    )
    return Response(create_success_response(
        data={'unlinked_address': previous},
        message='External wallet unlinked. Custodial wallet remains active.',
    ))
