"""
The SPV (special purpose company) that owns a property, as shown to investors
on the property page, in the Verification Center and on certificates.

`Property.spv_entity` (legal.LegalEntity) is authoritative; the legacy
free-text spv_* columns are the fallback. Nothing is invented: a missing value
stays empty and the page says "pending registration".
"""

from __future__ import annotations

import re

WYOMING_BUSINESS_SEARCH = 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx'
WYOMING = re.compile(r'wyoming|\bwy\b', re.I)


def spv_details(prop) -> dict | None:
    entity = getattr(prop, 'spv_entity', None)
    if entity is not None:
        data = {
            'name': entity.name,
            'entity_type': entity.get_entity_type_display(),
            'jurisdiction': entity.jurisdiction,
            'registration_number': entity.registration_number,
            'formation_date': entity.formation_date.isoformat() if entity.formation_date else None,
            'status': entity.status,
            'status_display': entity.get_status_display(),
            'registered_agent': entity.registered_agent_name,
        }
    elif prop.spv_company_name or prop.spv_registration_number:
        data = {
            'name': prop.spv_company_name or '',
            'entity_type': '',
            'jurisdiction': '',
            'registration_number': prop.spv_registration_number or '',
            'formation_date': prop.spv_establishment_date.isoformat() if prop.spv_establishment_date else None,
            'status': '',
            'status_display': '',
            'registered_agent': '',
        }
    else:
        return None
    # Capimax RT SPVs are Wyoming companies; an unstated jurisdiction is looked up there too
    data['is_wyoming'] = not data['jurisdiction'] or bool(WYOMING.search(data['jurisdiction']))
    data['registry_url'] = WYOMING_BUSINESS_SEARCH if data['is_wyoming'] else None
    return data
