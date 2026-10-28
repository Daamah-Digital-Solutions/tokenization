"""
Documents attached to partner applications (broker, liquidity provider) —
client round 4, #14. Private: stored under media/partner_documents/ (blocked by
nginx), served only to staff through the admin. PDF / JPG / PNG, 10 MB max.
"""

from __future__ import annotations

import hashlib
import os
import uuid

from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_BYTES = 10 * 1024 * 1024
MAX_FILES = 10


def upload_path(kind: str):
    """partner_documents/<kind>/<application id>/<random><ext> — never guessable from the name."""
    def _path(instance, filename):
        ext = os.path.splitext(filename)[1].lower()
        return f'partner_documents/{kind}/{instance.application_id}/{uuid.uuid4().hex}{ext}'
    _path.__name__ = f'partner_document_path_{kind}'
    return _path


def validate_upload(f) -> None:
    ext = os.path.splitext(getattr(f, 'name', '') or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f'{f.name}: only PDF, JPG or PNG files are accepted.')
    if (getattr(f, 'size', 0) or 0) > MAX_BYTES:
        raise ValidationError(f'{f.name}: the file is larger than 10 MB.')


def fingerprint(f) -> str:
    h = hashlib.sha256()
    for chunk in f.chunks():
        h.update(chunk)
    f.seek(0)
    return h.hexdigest()


def collect(request, default_type: str = 'other') -> list[tuple[str, object]]:
    """
    Files from a multipart request as [(document_type, file)].
    Accepts `documents` (+ a parallel `document_types` list) and the legacy
    single `supporting_documents` field.
    """
    files = request.FILES.getlist('documents')
    types = request.data.getlist('document_types') if hasattr(request.data, 'getlist') else []
    pairs = [(types[i] if i < len(types) and types[i] else default_type, f) for i, f in enumerate(files)]
    legacy = request.FILES.get('supporting_documents')
    if legacy is not None:
        pairs.append((default_type, legacy))
    if len(pairs) > MAX_FILES:
        raise ValidationError(f'At most {MAX_FILES} files can be attached.')
    for _, f in pairs:
        validate_upload(f)
    return pairs


def admin_file_link(url_name: str, doc) -> str:
    from django.urls import reverse
    from django.utils.html import format_html

    if not doc.pk or not doc.file:
        return '—'
    return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>',
                       reverse(url_name, args=[doc.pk]), doc.original_name or 'Open')
