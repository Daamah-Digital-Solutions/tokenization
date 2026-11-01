"""Signed transactions are read the same way on web3 6 (production) and web3 7."""

import re
from pathlib import Path
from types import SimpleNamespace

from django.test import SimpleTestCase

from blockchain.signing import raw_transaction

BACKEND = Path(__file__).resolve().parent.parent
SKIP = {'.venv', 'venv', 'node_modules', 'migrations', 'media', 'staticfiles', '__pycache__'}


class RawTransactionTests(SimpleTestCase):
    def test_both_field_names(self):
        self.assertEqual(raw_transaction(SimpleNamespace(rawTransaction=b'old')), b'old')
        self.assertEqual(raw_transaction(SimpleNamespace(raw_transaction=b'new')), b'new')

    def test_nothing_reads_the_field_directly(self):
        found = []
        pattern = re.compile(r'send_raw_transaction\(\s*\w+\.(raw_transaction|rawTransaction)')
        for path in BACKEND.rglob('*.py'):
            if SKIP.intersection(path.parts) or path.name.startswith('test_'):
                continue
            if pattern.search(path.read_text(encoding='utf-8', errors='ignore')):
                found.append(str(path.relative_to(BACKEND)))
        self.assertEqual(found, [], 'use blockchain.signing.raw_transaction')
