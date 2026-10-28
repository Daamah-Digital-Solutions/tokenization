"""
On-chain move of shares that changed hands on the platform ledger: a
secondary-market trade, or a sale to a liquidity provider (any record with
the chain_* fields and a ``chain_parts()`` describing seller, buyer, property
and amount).

A trade settles on the platform ledger at once (marketplace/settlement.py).
Right after, this moves the same number of tokens on-chain, from the
seller's custodial wallet to the buyer's, with the same custody path as a
token withdrawal (accounts/wallet_withdraw.py):

  * the property's token contract (one clone per property, token id 0);
  * the seller's custodial key is re-derived from the master seed (never
    stored) and checked against the address on the account;
  * the deployer tops the seller's custodial wallet up with gas if needed;
  * ``safeTransferFrom(seller, buyer, 0, amount, "")`` is signed and sent.

The trade records where this stands (``chain_status``): pending → submitted →
confirmed, or failed (retried by the reconcile job) and, after repeated
failures or when the platform cannot move the tokens (e.g. the seller moved
them to an external wallet), needs_review — staff are alerted. A property
that is not tokenized needs no transfer (not_required).

Never sends twice: a trade with a transaction hash is only checked, unless
that transaction is unknown to the network (dropped) — then it is resent.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

TOKEN_ID = 0                  # one token contract per property (clone), token id 0
TRANSFER_GAS_LIMIT = 300_000
MAX_ATTEMPTS = 5
RESEND_AFTER = timedelta(minutes=20)


class ChainUnavailable(Exception):
    """The network / custody is not reachable or configured — try again later."""


def _contract_for(prop):
    from blockchain.models import SmartContract
    return SmartContract.objects.filter(property_reference=prop, contract_type='real_estate_token',
                                        status='active').select_related('network').first()


def _web3(contract):
    from web3 import Web3

    rpc_url = getattr(contract.network, 'rpc_url', None) or settings.BLOCKCHAIN_SETTINGS.get('BNB_RPC_URL')
    if not rpc_url:
        raise ChainUnavailable('No RPC endpoint configured for this network.')
    w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 30}))
    return w3, getattr(contract.network, 'chain_id', None) or w3.eth.chain_id


def _custodial_address(user) -> str:
    """The user's custodial address; assigned from the master seed if the account has none yet."""
    from web3 import Web3

    from accounts.custody import derive_custodial_wallet
    derived = Web3.to_checksum_address(derive_custodial_wallet(user.pk).address)
    if not user.wallet_address:
        type(user).objects.filter(pk=user.pk).update(wallet_address=derived)
        user.wallet_address = derived
    return derived


def _parts(rec) -> dict:
    """Who sends what to whom. Trades describe themselves here; other records via chain_parts()."""
    if hasattr(rec, 'chain_parts'):
        return rec.chain_parts()
    return {'seller': rec.seller, 'buyer': rec.buyer, 'prop': rec.property_traded, 'amount': int(rec.tokens_traded),
            'settled': rec.status == 'completed', 'holding_key': ('trade_id', str(rec.pk)),
            'label': f'trade {str(rec.pk)[:8]}'}


def _set(trade, **fields):
    fields['chain_updated_at'] = timezone.now()
    names = {f.name for f in type(trade)._meta.fields}
    fields = {k: v for k, v in fields.items() if k in names}
    type(trade).objects.filter(pk=trade.pk).update(**fields)
    for k, v in fields.items():
        setattr(trade, k, v)


def _alert_staff(trade, reason: str) -> None:
    p = _parts(trade)
    logger.error('%s tokens need review: %s', p['label'], reason)
    try:
        from support.notify import _send, support_inbox
        _send(support_inbox(), f"[Blockchain] {p['label']} needs review",
              f"{p['amount']} shares of {p['prop'].title} moved from {p['seller'].email} to "
              f"{p['buyer'].email} on the platform ledger but NOT on-chain:\n{reason}\n\n"
              'Fix the cause, then set its chain status back to "pending" in the admin to retry.')
    except Exception:  # noqa: BLE001
        pass


def _record_success(trade, contract, seller_addr, buyer_addr, receipt, gas_price) -> None:
    from blockchain.models import TokenBalance, TokenTransaction

    p = _parts(trade)
    amount, prop = p['amount'], p['prop']
    with transaction.atomic():
        seller_row = TokenBalance.objects.select_for_update().filter(
            contract=contract, user=p['seller'], property_reference=prop, token_id=TOKEN_ID,
            wallet_address__iexact=seller_addr).first()
        if seller_row is not None:
            seller_row.balance = max(Decimal('0'), Decimal(seller_row.balance or 0) - amount)
            seller_row.save(update_fields=['balance'])
        buyer_row, _ = TokenBalance.objects.select_for_update().get_or_create(
            contract=contract, user=p['buyer'], property_reference=prop, token_id=TOKEN_ID,
            wallet_address=buyer_addr, defaults={'balance': 0})
        buyer_row.balance = Decimal(buyer_row.balance or 0) + amount
        buyer_row.save(update_fields=['balance'])
        TokenTransaction.objects.create(
            contract=contract, property_reference=prop, user=p['buyer'], transaction_type='transfer',
            transaction_hash=trade.transaction_hash, from_address=seller_addr, to_address=buyer_addr,
            token_amount=amount, status='confirmed', block_number=receipt.blockNumber, gas_used=receipt.gasUsed)
        gas_fee = (Decimal(receipt.gasUsed) * Decimal(gas_price or 0) / Decimal(10 ** 18)).quantize(Decimal('1e-8'))
        _set(trade, chain_status='confirmed', blockchain_confirmed=True, chain_error='', gas_fee=gas_fee)
        # The receiver's holding shows the on-chain transfer (explorer link).
        from investments.models import Investment
        key, value = p['holding_key']
        Investment.objects.filter(user=p['buyer'], **{f'payment_method__{key}': value}).update(
            transaction_hash=trade.transaction_hash, blockchain_confirmed=True)


def _fail(trade, reason: str, *, final: bool = False) -> str:
    attempts = trade.chain_attempts + 1
    if final or attempts >= MAX_ATTEMPTS:
        _set(trade, chain_status='needs_review', chain_attempts=attempts, chain_error=reason[:2000])
        _alert_staff(trade, reason)
        return 'needs_review'
    _set(trade, chain_status='failed', chain_attempts=attempts, chain_error=reason[:2000])
    return 'failed'


def transfer_trade(trade) -> str:
    """Move a settled trade's (or any share move's) tokens on-chain. Returns the resulting chain_status."""
    from eth_account import Account
    from web3 import Web3

    from accounts.custody import derive_custodial_wallet, is_custody_configured
    from accounts.wallet_withdraw import _ensure_gas
    from blockchain.signer_lock import signer_lock

    if trade.chain_status in ('confirmed', 'not_required', 'needs_review'):
        return trade.chain_status
    p = _parts(trade)
    if not p['settled']:
        _set(trade, chain_status='not_required')
        return 'not_required'
    contract = _contract_for(p['prop'])
    if contract is None:
        _set(trade, chain_status='not_required', chain_error='Property not tokenized: ownership is on the ledger.')
        return 'not_required'
    if not is_custody_configured():
        raise ChainUnavailable('Custody is not configured (PLATFORM_CUSTODY_MASTER_SEED).')

    w3, chain_id = _web3(contract)
    seller, buyer = p['seller'], p['buyer']
    seller_addr = _custodial_address(seller)
    buyer_addr = _custodial_address(buyer)
    if seller.wallet_address.lower() != seller_addr.lower():
        return _fail(trade, f'The seller account address {seller.wallet_address} is not the custodial '
                            f'address derived for it ({seller_addr}).', final=True)

    # Already sent: only check it (never send twice), unless the network dropped it.
    if trade.transaction_hash:
        try:
            receipt = w3.eth.get_transaction_receipt(trade.transaction_hash)
        except Exception:  # noqa: BLE001 — not mined (yet)
            receipt = None
        if receipt is not None:
            if receipt.status == 1:
                tx = w3.eth.get_transaction(trade.transaction_hash)
                _record_success(trade, contract, seller_addr, buyer_addr, receipt, tx.get('gasPrice'))
                return 'confirmed'
            return _fail(trade, f'Transfer {trade.transaction_hash} reverted on-chain.')
        try:
            w3.eth.get_transaction(trade.transaction_hash)
            known = True
        except Exception:  # noqa: BLE001
            known = False
        if known or (trade.chain_updated_at and timezone.now() - trade.chain_updated_at < RESEND_AFTER):
            return 'submitted'
        _set(trade, transaction_hash=None)  # dropped by the network: send again below

    token = w3.eth.contract(address=Web3.to_checksum_address(contract.contract_address), abi=contract.abi)
    amount = p['amount']
    held = token.functions.balanceOf(seller_addr, TOKEN_ID).call()
    if held < amount:
        return _fail(trade, f'The seller custodial wallet {seller_addr} holds {held} tokens on-chain, fewer than '
                            f'the {amount} sold (tokens withdrawn to an external wallet, or not minted).', final=True)

    deployer = Account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
    _ensure_gas(w3, deployer, seller_addr)
    with signer_lock(seller_addr):
        gas_price = w3.eth.gas_price
        tx = token.functions.safeTransferFrom(seller_addr, buyer_addr, TOKEN_ID, amount, b'').build_transaction({
            'from': seller_addr,
            'nonce': w3.eth.get_transaction_count(seller_addr, 'pending'),
            'gas': TRANSFER_GAS_LIMIT,
            'gasPrice': gas_price,
            'chainId': chain_id,
        })
        signed = Account.sign_transaction(tx, derive_custodial_wallet(seller.pk).private_key_hex)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
        if not tx_hash.startswith('0x'):
            tx_hash = '0x' + tx_hash
        _set(trade, transaction_hash=tx_hash, chain_status='submitted')

    try:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    except Exception:  # noqa: BLE001 — still pending: the reconcile job checks it later
        return 'submitted'
    if receipt.status != 1:
        return _fail(trade, f'Transfer {tx_hash} reverted on-chain (lockup period, compliance, or balance).')
    _record_success(trade, contract, seller_addr, buyer_addr, receipt, gas_price)
    return 'confirmed'


def _due(now):
    """Every record whose tokens still have to move on-chain (trades, then liquidity-provider sales)."""
    from django.db.models import Q

    from liquidity_provider.models import LiquidityTransaction

    from .models import TradeTransaction

    due = Q(chain_status__in=['pending', 'submitted']) | Q(chain_status='failed',
                                                           chain_updated_at__lt=now - timedelta(hours=1))
    yield from (TradeTransaction.objects.filter(status='completed').filter(due)
                .select_related('seller', 'buyer', 'property_traded').order_by('completed_at'))
    yield from (LiquidityTransaction.objects.filter(due)
                .select_related('investor', 'liquidity_provider__user',
                                'exit_request__investment__property_investment')
                .order_by('completed_at'))


def reconcile(limit: int = 50) -> dict:
    """Every few minutes: send pending transfers, check submitted ones, retry failed ones (hourly)."""
    from itertools import islice

    now = timezone.now()
    stats: dict = {}
    for trade in islice(_due(now), limit):
        try:
            outcome = transfer_trade(trade)
        except (ChainUnavailable, OSError) as exc:  # RPC down (requests errors are OSErrors)
            logger.warning('On-chain transfers paused: %s', exc)
            stats['unavailable'] = str(exc)
            break
        except Exception as exc:  # noqa: BLE001
            logger.exception('On-chain transfer of %s failed', _parts(trade)['label'])
            outcome = _fail(trade, f'{type(exc).__name__}: {exc}')
        stats[outcome] = stats.get(outcome, 0) + 1
    return stats
