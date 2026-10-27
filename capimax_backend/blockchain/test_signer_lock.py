"""One transaction at a time per signing wallet (no more 'nonce too low' on bursts of mints)."""

from django.test import SimpleTestCase

from blockchain.signer_lock import signer_lock


class SignerLockTests(SimpleTestCase):
    def test_a_busy_wallet_waits_then_gives_up(self):
        with signer_lock('0xAbC'):
            with self.assertRaises(TimeoutError):
                with signer_lock('0xabc', wait=1):
                    pass
        with signer_lock('0xabc', wait=1):  # free again
            pass

    def test_different_wallets_do_not_wait(self):
        with signer_lock('0x1'):
            with signer_lock('0x2', wait=1):
                pass
