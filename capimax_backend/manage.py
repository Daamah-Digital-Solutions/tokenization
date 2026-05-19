#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

# Load .env BEFORE Django settings are imported. settings/*.py read directly
# from os.environ, so the file is silently ignored if loaded any later.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / '.env', override=False)
except ImportError:
    # python-dotenv is listed in requirements.txt; missing locally means an
    # incomplete install but shouldn't block CLI commands like `pip install`.
    pass


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
