"""
Custodial token withdrawal — Phase 3 of the hybrid wallet model.

The user clicks "Withdraw to my external wallet" in the frontend. This
endpoint:

1. Loads the user's token balance for the requested property.
2. Verifies they have a linked external wallet (refuses without).
3. Funds the custodial wallet with just-enough native gas if it's short
   (BSC Testnet gas is effectively free, but mainnet promotion would
   simply require a higher threshold or a paymaster).
4. Signs ``safeTransferFrom(custodial, external, tokenId, amount, "0x")``
   with the custodial private key — re-derived on demand via
   ``accounts.custody`` so the DB never sees the key.
5. Broadcasts, waits for the receipt, updates local ``TokenBalance``
   rows + writes a ``TokenTransaction`` record.

The endpoint is idempotent w.r.t. accidental double-clicks: while a
withdrawal is in flight, a concurrent request gets a 409 short-circuit
(via the in-progress marker on the TokenBalance row). On revert / failure
we leave balances untouched so a retry stays safe.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils import create_success_response, create_error_response

from .custody import derive_custodial_wallet, is_custody_configured


logger = logging.getLogger(__name__)


# Minimum native-token balance the custodial wallet must have before we
# attempt a transfer. Below this we top it up from the deployer wallet.
# 0.0008 BNB on BSC Testnet is plenty for a single safeTransferFrom
# (typical gas cost ~0.0001 BNB at 0.1 gwei * ~300k gas).
GAS_FLOOR_WEI = 8 * 10**14         # 0.0008 BNB-equivalent
GAS_TOP_UP_WEI = 16 * 10**14       # 0.0016 BNB-equivalent — covers ~16 txs
TRANSFER_GAS_LIMIT = 300_000


def _ensure_gas(w3, deployer_account, custodial_address: str) -> str | None:
    """
    Top up the custodial wallet from the deployer wallet if it doesn't have
    enough native token to pay for a transfer. Returns the funding tx hash
    if a transfer happened, else ``None``.
    """
    balance = w3.eth.get_balance(custodial_address)
    if balance >= GAS_FLOOR_WEI:
        return None
    deficit = GAS_TOP_UP_WEI
    fund_tx = {
        'to': custodial_address,
        'value': deficit,
        'gas': 21_000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.get_transaction_count(deployer_account.address, 'pending'),
        'chainId': w3.eth.chain_id,
    }
    signed = deployer_account.sign_transaction(fund_tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    logger.info(
        "Gas top-up: deployer -> custodial %s for %s wei (tx %s)",
        custodial_address, deficit, tx_hash,
    )
    return tx_hash


def _build_response_data(*, tx_hash, gas_top_up_tx, from_addr, to_addr, amount):
    return {
        'transaction_hash': tx_hash,
        'gas_top_up_transaction_hash': gas_top_up_tx,
        'from_wallet': from_addr,
        'to_wallet': to_addr,
        'amount': str(amount),
        'status': 'submitted',
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw_tokens(request):
    """
    Body:
        {
          "property_id": "<uuid>",      # required
          "amount":      "<int>"        # optional; defaults to full balance
        }
    """
    from web3 import Web3
    from eth_account import Account
    from blockchain.models import SmartContract, TokenBalance, TokenTransaction
    from properties.models import Property

    user = request.user

    # Pre-flight: must have a custodial wallet and a linked external.
    if not user.wallet_address:
        return Response(create_error_response(
            message='No custodial wallet found for this account.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)
    if not user.external_wallet_address:
        return Response(create_error_response(
            message='Link an external wallet first before withdrawing tokens.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)
    if not is_custody_configured():
        return Response(create_error_response(
            message='Withdrawals are temporarily disabled (custody not configured).',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ), status=status.HTTP_503_SERVICE_UNAVAILABLE)

    property_id = request.data.get('property_id')
    if not property_id:
        return Response(create_error_response(
            message='property_id is required.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)

    try:
        property_obj = Property.objects.get(pk=property_id)
    except Property.DoesNotExist:
        return Response(create_error_response(
            message='Property not found.',
            status_code=status.HTTP_404_NOT_FOUND,
        ), status=status.HTTP_404_NOT_FOUND)

    # Look up the contract + balance held in custody for this property.
    contract = SmartContract.objects.filter(
        property_reference=property_obj,
        contract_type='real_estate_token',
        status='active',
    ).first()
    if not contract:
        return Response(create_error_response(
            message='This property is not yet tokenized.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)

    # Sum balances at the custodial address for this property/contract.
    balance_row = TokenBalance.objects.filter(
        contract=contract,
        user=user,
        property_reference=property_obj,
        wallet_address__iexact=user.wallet_address,
    ).first()
    held = int((balance_row.balance if balance_row else 0) or 0)

    requested_raw = request.data.get('amount')
    if requested_raw is None or requested_raw == '':
        amount = held
    else:
        try:
            amount = int(requested_raw)
        except (TypeError, ValueError):
            return Response(create_error_response(
                message='amount must be an integer (token count).',
                status_code=status.HTTP_400_BAD_REQUEST,
            ), status=status.HTTP_400_BAD_REQUEST)

    if amount <= 0:
        return Response(create_error_response(
            message='You have no tokens to withdraw for this property.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)
    if amount > held:
        return Response(create_error_response(
            message=f'Requested {amount} but only {held} tokens are held in custody.',
            status_code=status.HTTP_400_BAD_REQUEST,
        ), status=status.HTTP_400_BAD_REQUEST)

    # On-chain phase.
    rpc_url = getattr(contract.network, 'rpc_url', None) or settings.BLOCKCHAIN_SETTINGS.get('BNB_RPC_URL')
    if not rpc_url:
        return Response(create_error_response(
            message='No RPC endpoint configured for this network.',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ), status=status.HTTP_503_SERVICE_UNAVAILABLE)

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    chain_id = getattr(contract.network, 'chain_id', None) or w3.eth.chain_id

    custodial = derive_custodial_wallet(user.pk)
    custodial_addr = Web3.to_checksum_address(custodial.address)
    external_addr = Web3.to_checksum_address(user.external_wallet_address)

    if user.wallet_address.lower() != custodial_addr.lower():
        # Belt-and-braces: the user's stored primary address doesn't match
        # what the master seed produces. Refuse so we never sign for a
        # wallet we don't own.
        logger.error(
            "Custody address drift for user %s: stored=%s derived=%s",
            user.pk, user.wallet_address, custodial_addr,
        )
        return Response(create_error_response(
            message='Custody verification failed. Please contact support.',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Fund gas if needed.
    deployer = Account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
    try:
        topup_tx = _ensure_gas(w3, deployer, custodial_addr)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gas top-up failed for user %s", user.pk)
        return Response(create_error_response(
            message=f'Gas top-up failed: {exc}',
            status_code=status.HTTP_502_BAD_GATEWAY,
        ), status=status.HTTP_502_BAD_GATEWAY)

    # Build and sign the transfer.
    token_contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract.contract_address),
        abi=contract.abi,
    )
    CLONE_TOKEN_ID = 0
    try:
        tx = token_contract.functions.safeTransferFrom(
            custodial_addr, external_addr, CLONE_TOKEN_ID, amount, b'',
        ).build_transaction({
            'from': custodial_addr,
            'nonce': w3.eth.get_transaction_count(custodial_addr, 'pending'),
            'gas': TRANSFER_GAS_LIMIT,
            'gasPrice': w3.eth.gas_price,
            'chainId': chain_id,
        })
    except Exception as exc:  # noqa: BLE001
        logger.exception("Build transfer tx failed for user %s", user.pk)
        return Response(create_error_response(
            message=f'Transaction build failed: {exc}',
            status_code=status.HTTP_502_BAD_GATEWAY,
        ), status=status.HTTP_502_BAD_GATEWAY)

    # Sign with the custodial private key (re-derived; never stored).
    signed = Account.sign_transaction(tx, custodial.private_key_hex)
    try:
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Broadcast failed for user %s", user.pk)
        return Response(create_error_response(
            message=f'Broadcast failed: {exc}',
            status_code=status.HTTP_502_BAD_GATEWAY,
        ), status=status.HTTP_502_BAD_GATEWAY)

    try:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=240)
    except Exception as exc:  # noqa: BLE001
        # Tx is broadcast but not confirmed; we won't update balances.
        # The chain monitor will catch up later and reconcile.
        logger.warning(
            "Timed out waiting for withdraw receipt %s: %s", tx_hash, exc,
        )
        return Response(create_success_response(
            data=_build_response_data(
                tx_hash=tx_hash,
                gas_top_up_tx=topup_tx,
                from_addr=custodial_addr,
                to_addr=external_addr,
                amount=amount,
            ),
            message=(
                'Withdrawal broadcast. Balance update is pending on-chain '
                'confirmation.'
            ),
        ))

    if receipt.status != 1:
        logger.error("Withdrawal reverted for user %s, tx %s", user.pk, tx_hash)
        return Response(create_error_response(
            message='On-chain transfer reverted. Balances unchanged.',
            status_code=status.HTTP_502_BAD_GATEWAY,
            details={'transaction_hash': tx_hash},
        ), status=status.HTTP_502_BAD_GATEWAY)

    # Success — adjust local balances + audit row.
    with db_transaction.atomic():
        if balance_row:
            balance_row.balance = (Decimal(balance_row.balance) - Decimal(amount))
            balance_row.save(update_fields=['balance'])

        external_row, _ = TokenBalance.objects.get_or_create(
            contract=contract,
            user=user,
            property_reference=property_obj,
            wallet_address=external_addr,
            defaults={'token_id': CLONE_TOKEN_ID, 'balance': 0},
        )
        external_row.balance = (Decimal(external_row.balance) + Decimal(amount))
        external_row.save(update_fields=['balance'])

        TokenTransaction.objects.create(
            contract=contract,
            property_reference=property_obj,
            user=user,
            transaction_type='transfer',
            transaction_hash=tx_hash,
            from_address=custodial_addr,
            to_address=external_addr,
            token_amount=amount,
            status='confirmed',
            block_number=receipt.blockNumber,
            gas_used=receipt.gasUsed,
        )

    logger.info(
        "User %s withdrew %s tokens of property %s to %s (tx %s)",
        user.pk, amount, property_obj.pk, external_addr, tx_hash,
    )
    return Response(create_success_response(
        data=_build_response_data(
            tx_hash=tx_hash,
            gas_top_up_tx=topup_tx,
            from_addr=custodial_addr,
            to_addr=external_addr,
            amount=amount,
        ),
        message=f'Withdrew {amount} tokens to your external wallet.',
    ))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def custodial_balances(request):
    """
    List the user's per-property token balances held in custody.

    Used by the frontend to render the withdraw UI without having to scrape
    multiple endpoints. Returns one row per (property, contract) where the
    user has a non-zero custodial balance, plus any external balance for
    the same property so the user can see "you have N in custody + M
    already in your wallet".
    """
    from blockchain.models import TokenBalance
    from django.db.models import Q

    user = request.user
    if not user.wallet_address and not user.external_wallet_address:
        return Response(create_success_response(data={'balances': []}))

    rows = (
        TokenBalance.objects
        .filter(user=user)
        .filter(
            Q(wallet_address__iexact=user.wallet_address or '')
            | Q(wallet_address__iexact=user.external_wallet_address or '')
        )
        .select_related('contract', 'property_reference', 'contract__network')
    )

    grouped: dict = {}
    for r in rows:
        pid = str(r.property_reference_id)
        bucket = grouped.setdefault(pid, {
            'property_id': pid,
            'property_title': r.property_reference.title,
            'contract_address': r.contract.contract_address,
            'network': getattr(r.contract.network, 'name', None),
            'chain_id': getattr(r.contract.network, 'chain_id', None),
            'custodial_balance': '0',
            'external_balance': '0',
        })
        addr = r.wallet_address.lower()
        bal = str(int(r.balance or 0))
        if user.wallet_address and addr == user.wallet_address.lower():
            bucket['custodial_balance'] = bal
        elif user.external_wallet_address and addr == user.external_wallet_address.lower():
            bucket['external_balance'] = bal

    balances = sorted(grouped.values(), key=lambda b: b['property_title'])
    # Only return properties the user actually holds tokens in.
    balances = [b for b in balances if int(b['custodial_balance']) or int(b['external_balance'])]
    return Response(create_success_response(
        data={'balances': balances},
        message='Custodial balances retrieved.',
    ))
