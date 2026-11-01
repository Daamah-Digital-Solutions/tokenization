"""
The bytes of a signed transaction, on every eth-account version: older ones (with
web3 6, as in production) call the field rawTransaction, newer ones (web3 7)
raw_transaction. Code that used one name worked on one machine and failed on the
other: on-chain transfers of sold or sent shares raised AttributeError in production.
"""


def raw_transaction(signed) -> bytes:
    raw = getattr(signed, 'raw_transaction', None)
    return raw if raw is not None else signed.rawTransaction
