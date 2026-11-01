"""
A row lock joined to other tables must name the row it locks. On PostgreSQL
(production) select_for_update() + select_related() of a nullable foreign key
raises NotSupportedError; SQLite ignores row locks, so the tests passed while
transfers, liquidity-provider sales and installment payments failed in production.
"""

import re
from pathlib import Path

from django.test import SimpleTestCase

BACKEND = Path(__file__).resolve().parent.parent
PATTERN = re.compile(r'\.select_for_update\(\)\s*\.\s*select_related\(')
SKIP = {'.venv', 'venv', 'node_modules', 'migrations', 'media', 'staticfiles', '__pycache__'}


class RowLockTests(SimpleTestCase):
    def test_locks_joined_to_other_tables_name_their_row(self):
        found = []
        for path in BACKEND.rglob('*.py'):
            if SKIP.intersection(path.parts) or path.name.startswith('test_'):
                continue
            if PATTERN.search(path.read_text(encoding='utf-8', errors='ignore')):
                found.append(str(path.relative_to(BACKEND)))
        self.assertEqual(found, [], "use select_for_update(of=('self',)) with select_related")
