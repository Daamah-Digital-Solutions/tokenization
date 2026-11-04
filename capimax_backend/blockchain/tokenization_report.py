"""
Tokenization report (Word) for one property on the blockchain (client, Nov 2026).

The client writes a "Tokenization Report" for the investors of each property. This gives them,
in a .docx they can edit, everything about the property's blockchain registration: the network,
the contracts and their explorer links, the registration transaction, and the token terms — read
live from the contract when the network answers (otherwise from the platform's record, and the
document says so). Built from the property's done registration (blockchain/registration.py), or,
for properties registered before the admin button existed, from their contract records.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone as dt_tz
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import ChainRegistrationStatus as S, PropertyChainRegistration, SmartContract
from .registration import FREQUENCIES, abi_list, is_mainnet

logger = logging.getLogger(__name__)

STATUS_NAMES = {0: 'Draft', 1: 'Active', 2: 'Paused', 3: 'Completed', 4: 'Cancelled'}
CATEGORY_NAMES = {0: 'Under construction', 1: 'Ready property'}


class ReportError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass
class ChainFacts:
    network: object
    token_address: str
    distributor_address: str = ''
    factory_address: str = ''
    tx_hash: str = ''
    block_number: int | None = None
    registered_at: datetime | None = None
    deployer: str = ''
    on_chain_property_id: int | None = None
    terms: dict = field(default_factory=dict)   # from the platform record
    live: dict | None = None                    # read from the contract now
    live_error: str = ''


def _money(v) -> str:
    return f'${Decimal(str(v or 0)):,.2f}'


def _pct_bps(bps) -> str:
    return f'{Decimal(int(bps or 0)) / 100:.2f}%'


def _months(seconds: int) -> str:
    days = int(seconds) // 86400
    if days == 0:
        return 'None — shares can be transferred right away'
    months = days // 30
    return f'{months} month(s) ({days} days) from each purchase' if days % 30 == 0 else f'{days} days from each purchase'


def _date(d) -> str:
    return d.strftime('%d %B %Y, %H:%M UTC') if d else '—'


def _args(value) -> dict:
    """constructor_args is a dict on new rows, a JSON string on some older ones."""
    if isinstance(value, str):
        import json
        try:
            value = json.loads(value)
        except ValueError:
            return {}
    return value if isinstance(value, dict) else {}


def facts(prop) -> ChainFacts:
    reg = prop.chain_registrations.filter(status=S.DONE).select_related('network').first()
    if reg is not None:
        f = ChainFacts(network=reg.network, token_address=reg.token_address,
                       distributor_address=reg.distributor_address, factory_address=reg.factory_address,
                       tx_hash=reg.tx_hash, block_number=reg.block_number, registered_at=reg.completed_at,
                       deployer=reg.deployer_address, on_chain_property_id=reg.on_chain_property_id,
                       terms={'total_supply': reg.total_supply, 'token_price': reg.token_price,
                              'lockup_seconds': reg.lockup_months * 30 * 86400,
                              'early_exit_fee_bps': reg.early_exit_fee_bps, 'rental_yield_bps': reg.rental_yield_bps,
                              'distribution_frequency': reg.distribution_frequency, 'category': reg.category})
    else:
        token = SmartContract.objects.filter(property_reference=prop, contract_type='real_estate_token') \
            .select_related('network').first()
        if token is None or not prop.smart_contract_address:
            raise ReportError('This property is not on the blockchain yet. Use "Register on the blockchain" first.')
        dist = SmartContract.objects.filter(property_reference=prop, contract_type='rental_distributor').first()
        factory = SmartContract.objects.filter(network=token.network, contract_type='property_factory',
                                               property_reference__isnull=True).first()
        f = ChainFacts(network=token.network, token_address=token.contract_address,
                       distributor_address=dist.contract_address if dist else '',
                       factory_address=factory.contract_address if factory else '',
                       tx_hash=token.deployment_transaction or '', block_number=token.deployment_block,
                       registered_at=token.created_at, deployer=token.deployer_address or '',
                       on_chain_property_id=_args(token.constructor_args).get('property_id'))
    _read_live(f)
    return f


def _read_live(f: ChainFacts) -> None:
    """The token terms as the contract holds them now (index order = PropertyInfo struct)."""
    try:
        from .services.web3_service import Web3Service
        token_sc = SmartContract.objects.filter(contract_address__iexact=f.token_address).first()
        svc = Web3Service()
        if token_sc is None or not svc.initialize_network(str(f.network.pk)) or svc.w3 is None:
            f.live_error = 'the network could not be reached'
            return
        w3 = svc.w3
        token = w3.eth.contract(address=w3.to_checksum_address(f.token_address), abi=abi_list(token_sc.abi))
        info = token.functions.properties(0).call()
        f.live = {
            'total_supply': int(info[0]), 'current_supply': int(info[1]), 'category': int(info[2]),
            'status': int(info[3]), 'lockup_seconds': int(info[4]), 'early_exit_fee_bps': int(info[5]),
            'rental_yield_bps': int(info[6]), 'manager': info[7], 'uri': info[8],
            'token_price': Decimal(w3.from_wei(int(info[9]), 'ether')),
            'created_at': datetime.fromtimestamp(int(info[10]), tz=dt_tz.utc) if int(info[10]) else None,
        }
        if not f.registered_at and f.live['created_at']:
            f.registered_at = f.live['created_at']
        if (not f.deployer or int(f.deployer, 16) == 0) and f.live['manager']:
            f.deployer = f.live['manager']  # older rows recorded no deployer: the contract's manager
    except Exception as exc:  # noqa: BLE001 — the report still works from the platform record
        logger.warning('Live read of %s failed: %s', f.token_address, exc)
        f.live_error = 'the contract could not be read'


def _explorer(network, kind, value) -> str:
    base = (network.explorer_url or '').rstrip('/')
    return f'{base}/{kind}/{value}' if base and value else ''


def _ownership(prop) -> dict:
    from investments.models import Investment, InvestmentStatus
    done = Investment.objects.filter(property_investment=prop, status=InvestmentStatus.COMPLETED, token_amount__gt=0)
    on_chain = done.exclude(Q(transaction_hash__isnull=True) | Q(transaction_hash=''))
    a = done.aggregate(n=Count('user', distinct=True), t=Sum('token_amount'))
    b = on_chain.aggregate(n=Count('user', distinct=True), t=Sum('token_amount'))
    return {'holders': a['n'] or 0, 'shares': a['t'] or 0, 'chain_holders': b['n'] or 0, 'chain_shares': b['t'] or 0}


# --------------------------------------------------------------------------- the document

def build(prop) -> bytes:
    from docx import Document
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Pt, RGBColor

    from properties.spv import spv_details

    f = facts(prop)
    net = f.network
    live = f.live or {}
    terms = live or f.terms
    test_net = not is_mainnet(net)

    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(10.5)

    def hyperlink(paragraph, url, text=None):
        part = paragraph.part
        r_id = part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
                              is_external=True)
        link = OxmlElement('w:hyperlink')
        link.set(qn('r:id'), r_id)
        run = OxmlElement('w:r')
        rpr = OxmlElement('w:rPr')
        color = OxmlElement('w:color')
        color.set(qn('w:val'), '1F5FBF')
        underline = OxmlElement('w:u')
        underline.set(qn('w:val'), 'single')
        rpr.append(color)
        rpr.append(underline)
        run.append(rpr)
        t = OxmlElement('w:t')
        t.text = text or url
        t.set(qn('xml:space'), 'preserve')
        run.append(t)
        link.append(run)
        paragraph._p.append(link)

    def table(rows):
        tbl = doc.add_table(rows=0, cols=2)
        tbl.style = 'Light Grid Accent 1'
        tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
        look = tbl._tbl.tblPr.find(qn('w:tblLook'))
        if look is None:
            look = OxmlElement('w:tblLook')
            tbl._tbl.tblPr.append(look)
        look.set(qn('w:firstRow'), '0')  # label/value rows, no header row
        look.set(qn('w:val'), '0000')
        for label, value, url in rows:
            cells = tbl.add_row().cells
            cells[0].text = label
            for p in cells[0].paragraphs:
                for r in p.runs:
                    r.bold = True
            if url:
                cells[1].text = ''
                hyperlink(cells[1].paragraphs[0], url, value or url)
            else:
                cells[1].text = str(value if value not in (None, '') else '—')
        doc.add_paragraph()

    def row(label, value, url=''):
        return (label, value, url)

    doc.add_heading(f'Tokenization Report — {prop.title}', level=0)
    sub = doc.add_paragraph()
    sub.add_run(f'Capimax RT · prepared {timezone.now():%d %B %Y}').italic = True

    if test_net:
        note = doc.add_paragraph()
        r = note.add_run(f'Test network. This property is registered on {net.name}, the network used before going '
                         f'live. The contracts and transactions below are real and can be checked on the explorer, '
                         f'but tokens on a test network carry no monetary value. The report will be issued again '
                         f'when the property moves to the main network.')
        r.font.color.rgb = RGBColor(0xB4, 0x53, 0x09)

    doc.add_heading('1. The property', level=1)
    table([
        row('Name', prop.title),
        row('Type', prop.get_property_type_display() if prop.property_type else ''),
        row('Stage', prop.get_property_category_display() if prop.property_category else ''),
        row('Address', ', '.join(x for x in [prop.address, prop.city, prop.country] if x)),
        row('Property value', _money(prop.total_value)),
        row('Number of shares', f'{int(prop.total_tokens or 0):,}'),
        row('Price per share', _money(prop.token_price)),
        row('Expected annual return', f'{prop.expected_return}%' if prop.expected_return is not None else ''),
        row('Rental yield', f'{prop.rental_yield}%' if prop.rental_yield is not None else ''),
    ])

    doc.add_heading('2. The owning company (SPV)', level=1)
    spv = spv_details(prop)
    if spv:
        table([
            row('Company', spv.get('name')),
            row('Type', spv.get('entity_type')),
            row('Jurisdiction', spv.get('jurisdiction')),
            row('Registration number', spv.get('registration_number')),
            row('Formed on', spv.get('formation_date')),
            row('Registered agent', spv.get('registered_agent')),
            row('Public registry', 'Search the registry' if spv.get('registry_url') else '', spv.get('registry_url') or ''),
        ])
    else:
        doc.add_paragraph('Pending registration — the owning company has not been entered for this property yet.')

    doc.add_heading('3. Blockchain registration', level=1)
    table([
        row('Network', f'{net.name} (chain ID {net.chain_id})'),
        row('Network type', 'Test network' if test_net else 'Main network'),
        row('Token standard', 'ERC-1155 (one contract per property; the property is token ID 0)'),
        row('Token contract', f.token_address, _explorer(net, 'address', f.token_address)),
        row('Rent distribution contract', f.distributor_address or 'Not created (under-construction property)',
            _explorer(net, 'address', f.distributor_address)),
        row('Created by (platform factory)', f.factory_address, _explorer(net, 'address', f.factory_address)),
        row('Property number in the factory', f.on_chain_property_id),
        row('Registration transaction', f.tx_hash or 'Not recorded (registered before the admin button)',
            _explorer(net, 'tx', f.tx_hash)),
        row('Block', f'{f.block_number:,}' if f.block_number else ''),
        row('Registered on', _date(f.registered_at)),
        row('Platform wallet', f.deployer if f.deployer and int(f.deployer, 16) else '',
            _explorer(net, 'address', f.deployer) if f.deployer and int(f.deployer, 16) else ''),
    ])

    src = (f'Read from the blockchain on {timezone.now():%d %B %Y}.' if f.live
           else f'From the platform\'s record ({f.live_error or "not read"} at the time of this report).')
    doc.add_heading('4. Token terms written in the contract', level=1)
    doc.add_paragraph(src).runs[0].italic = True
    terms_rows = [
        row('Total supply', f'{int(terms.get("total_supply") or 0):,} shares'),
        row('Price per share (in the contract)', _money(terms.get('token_price'))),
        row('Lock-up', _months(int(terms.get('lockup_seconds') or 0))),
        row('Early-exit fee', _pct_bps(terms.get('early_exit_fee_bps'))),
        row('Rental yield', _pct_bps(terms.get('rental_yield_bps'))),
    ]
    if 'distribution_frequency' in terms:
        terms_rows.append(row('Rent paid', FREQUENCIES.get(int(terms['distribution_frequency']), '')))
    if live:
        terms_rows += [row('Shares issued so far', f'{live["current_supply"]:,}'),
                       row('Contract status', STATUS_NAMES.get(live['status'], live['status'])),
                       row('Stage (in the contract)', CATEGORY_NAMES.get(live['category'], live['category']))]
    table(terms_rows)
    contract_price = Decimal(str(terms.get('token_price') or 0))
    if contract_price and prop.token_price and contract_price != Decimal(str(prop.token_price)):
        doc.add_paragraph(f'The share price on the platform is now {_money(prop.token_price)}. The contract keeps the '
                          f'price it was created with ({_money(contract_price)}); purchases are priced by the '
                          f'platform, so this does not change what investors pay or hold.')

    doc.add_heading('5. Ownership today', level=1)
    own = _ownership(prop)
    table([
        row('Owners on the platform', f'{own["holders"]:,} holding {own["shares"]:,} shares'),
        row('Of which issued on the blockchain', f'{own["chain_holders"]:,} owner(s), {own["chain_shares"]:,} shares'),
    ])
    doc.add_paragraph('Shares still being paid for in installments are recorded on the platform and are not '
                      'included above.')

    doc.add_heading('6. How an investor can check this', level=1)
    for step in [
        'Open the token contract link above in the block explorer.',
        'The contract page lists every share issue (mint) and transfer, with its date and transaction.',
        'An investor\'s own wallet address (shown in their Capimax account) shows the shares they hold '
        '(token ID 0 on this contract).',
        'The registration transaction shows when, and by which platform wallet, the property was created.',
    ]:
        doc.add_paragraph(step, style='List Number')

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


def filename(prop) -> str:
    safe = ''.join(ch if ch.isalnum() or ch in ' -_' else '' for ch in prop.title).strip().replace(' ', '-')
    return f'Tokenization-Report-{safe[:60] or prop.pk}.docx'
