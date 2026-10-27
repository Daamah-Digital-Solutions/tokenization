"""
One transaction at a time per signing wallet.

A wallet's transactions are numbered (nonce). Two workers signing from the
same wallet at once read the same next number and one of them is rejected
("nonce too low" / "replacement transaction underpriced") — which made bursts
of mints fail. Everything that signs from a shared wallet (the deployer for
mints, installment releases and gas top-ups; a custodial wallet for a
transfer) takes this lock around "read nonce → send → wait for the receipt".
The lock lives in the shared cache (Redis), so it holds across Celery workers.
"""

from __future__ import annotations

import time
from contextlib import contextmanager

from django.core.cache import cache

WAIT_SECONDS = 300


@contextmanager
def signer_lock(address: str, wait: int = WAIT_SECONDS):
    key = f'signer-lock:{(address or "").lower()}'
    deadline = time.monotonic() + wait
    while not cache.add(key, '1', timeout=wait + 120):
        if time.monotonic() > deadline:
            raise TimeoutError(f'Wallet {address} is busy with another transaction; try again shortly.')
        time.sleep(0.5)
    try:
        yield
    finally:
        cache.delete(key)
