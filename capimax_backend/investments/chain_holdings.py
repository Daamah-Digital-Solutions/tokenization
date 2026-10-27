"""
Platform holdings vs on-chain balances, per owner and tokenized property.

Platform side: completed purchases (and fully paid installment plans) of a
property with an active token contract. Chain side: balanceOf(token 0) summed
over every address the owner's shares may sit at — the custodial wallet, the
mint destinations and any external wallet shares were withdrawn to.

Pairs with a mint or a market transfer still in flight are skipped: they
settle within minutes and have their own checks.
"""

from __future__ import annotations

from collections import defaultdict

TOKEN_ID = 0
IN_FLIGHT_MINT = ('pending_mint', 'minting')
IN_FLIGHT_TRADE = ('pending', 'submitted')


def _web3(contract, cache: dict):
    from web3 import Web3

    from marketplace.chain_transfer import _web3 as connect

    url = getattr(contract.network, 'rpc_url', None) or ''
    if url not in cache:
        cache[url] = connect(contract)[0]
    return cache[url], Web3


def _busy_pairs() -> set:
    from investments.models import Investment
    from marketplace.models import TradeTransaction

    busy = set(Investment.objects.filter(status__in=IN_FLIGHT_MINT)
               .values_list('user_id', 'property_investment_id'))
    for seller, buyer, prop in (TradeTransaction.objects
                                .filter(status='completed', chain_status__in=IN_FLIGHT_TRADE)
                                .values_list('seller_id', 'buyer_id', 'property_traded_id')):
        busy.update({(seller, prop), (buyer, prop)})
    return busy


def compare() -> list:
    """[{user, property, contract, platform, on_chain, addresses}] for every owner of a tokenized property."""
    from accounts.models import User
    from blockchain.models import SmartContract, TokenBalance
    from investments.models import Investment, InvestmentStatus
    from properties.models import ConstructionInstallment

    contracts = {c.property_reference_id: c for c in SmartContract.objects.filter(
        contract_type='real_estate_token', status='active', property_reference__status='tokenized',
    ).select_related('network', 'property_reference')}
    if not contracts:
        return []

    shares = defaultdict(int)
    addresses = defaultdict(set)
    for user_id, prop_id, amount, dest in (Investment.objects
                                           .filter(status=InvestmentStatus.COMPLETED, token_amount__gt=0,
                                                   property_investment_id__in=contracts)
                                           .values_list('user_id', 'property_investment_id', 'token_amount',
                                                        'destination_wallet')):
        shares[(user_id, prop_id)] += amount
        if dest:
            addresses[(user_id, prop_id)].add(dest.lower())
    for user_id, prop_id, amount in (ConstructionInstallment.objects
                                     .filter(status='completed', property_investment_id__in=contracts)
                                     .values_list('investor_id', 'property_investment_id', 'token_allocation')):
        shares[(user_id, prop_id)] += amount
    for user_id, prop_id, addr in (TokenBalance.objects.filter(property_reference_id__in=contracts)
                                   .values_list('user_id', 'property_reference_id', 'wallet_address')):
        shares.setdefault((user_id, prop_id), 0)
        if addr:
            addresses[(user_id, prop_id)].add(addr.lower())

    users = User.objects.in_bulk({u for u, _ in shares})
    busy = _busy_pairs()
    cache: dict = {}
    rows = []
    for (user_id, prop_id), platform in shares.items():
        if (user_id, prop_id) in busy:
            continue
        user, contract = users[user_id], contracts[prop_id]
        addrs = set(addresses[(user_id, prop_id)])
        if user.wallet_address:
            addrs.add(user.wallet_address.lower())
        w3, Web3 = _web3(contract, cache)
        token = w3.eth.contract(address=Web3.to_checksum_address(contract.contract_address), abi=contract.abi)
        on_chain = sum(int(token.functions.balanceOf(Web3.to_checksum_address(a), TOKEN_ID).call())
                       for a in sorted(addrs))
        rows.append({'user': user, 'property': contract.property_reference, 'contract': contract,
                     'platform': platform, 'on_chain': on_chain, 'addresses': sorted(addrs)})
    return rows


def _hex(value) -> str:
    return (value.hex() if hasattr(value, 'hex') else str(value)).removeprefix('0x')


def delivered(contract, tx_hash: str, addresses, cache: dict):
    """Token-0 shares the transaction put at any of the addresses (this contract's TransferSingle logs);
    None when the hash is not a successful transaction on the contract's network (e.g. seed data)."""
    if not tx_hash:
        return None
    w3, Web3 = _web3(contract, cache)
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception:  # noqa: BLE001 — not found / malformed hash
        return None
    if not receipt or receipt['status'] != 1:
        return None
    event = _hex(Web3.keccak(text='TransferSingle(address,address,address,uint256,uint256)'))
    owners = {a.lower() for a in addresses}
    total = 0
    for log in receipt['logs']:
        topics = [_hex(t) for t in log['topics']]
        if (str(log['address']).lower() != contract.contract_address.lower() or len(topics) < 4
                or topics[0] != event or '0x' + topics[3][-40:] not in owners):
            continue
        data = _hex(log['data'])
        if int(data[:64], 16) == TOKEN_ID:
            total += int(data[64:128], 16)
    return total
