"""
Share price changes (client, Nov 2026 — as on Capimax BRX "Unit prices").

The admin changes a property's share price from the "Share prices" admin page
(a price phase reaching its start date and a new valuation go through here too).
record_price, in one transaction:

  * writes an append-only PropertyPriceChange row (the price history) and keeps
    the first price as Property.launch_price;
  * sets the new share price; the property value and the minimum investment
    move in the same proportion (the minimum stays the same number of shares);
  * records a valuation at the new value, so every holder's position is valued
    at the new price (portfolio and dashboards read the latest valuation);
  * after commit, tells every owner — shareholders, investors with an
    installment plan, sellers with an open listing — in-app and by email.

Not changed: installment plans already started keep their price, secondary
market listings and installment positions keep the seller's own price, and a
purchase quoted at the old price is refused at checkout (price_changed).

A property that is not public yet and has no sale just gets the new price:
there is nobody to tell and no history to show yet.
"""

from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
MAX_STEP_CHANGE = Decimal('0.25')  # a bigger change needs the admin's explicit confirmation


class PriceError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def is_live(prop) -> bool:
    """A price change is recorded and announced once the property is public or has sold a share."""
    return bool(prop.is_published or (prop.tokens_sold or 0) > 0 or prop.price_history.exists())


def parse_price(value) -> Decimal:
    try:
        price = Decimal(str(value).strip().replace(',', '').replace('$', '')).quantize(CENT, ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise PriceError('invalid', 'Enter the new share price in USD, e.g. 12.50.')
    if price <= 0:
        raise PriceError('invalid', 'The share price must be more than 0.')
    return price


def change_pct(old, new) -> Decimal | None:
    old, new = Decimal(old or 0), Decimal(new or 0)
    if old <= 0:
        return None
    return ((new - old) / old * 100).quantize(CENT, ROUND_HALF_UP)


def validate_new_price(prop, new_price, *, confirm_large: bool = False) -> Decimal:
    price = parse_price(new_price)
    old = Decimal(prop.token_price or 0)
    if price == old:
        raise PriceError('same_price', f'The share price is already ${old}.')
    if old > 0 and abs(price - old) / old > MAX_STEP_CHANGE and not confirm_large:
        raise PriceError('large_change',
                         f'This changes the price by {change_pct(old, price)}%. Tick "I confirm a change of more '
                         f'than 25%" to apply it.')
    return price


def _scale(value, ratio: Decimal):
    if value is None:
        return None
    return (Decimal(value) * ratio).quantize(CENT, ROUND_HALF_UP)


def record_price(prop, new_price, *, by=None, label: str = '', note: str = '', source: str = 'admin',
                 confirm_large: bool = True, total_value=None):
    """
    Apply a new share price. Returns the PropertyPriceChange, or None when the
    property is not live yet (price set silently) or the price is unchanged.
    """
    from .models import Property, PropertyPriceChange, PropertyValuation

    with transaction.atomic():
        locked = Property.objects.select_for_update().get(pk=prop.pk)
        price = parse_price(new_price)
        old = Decimal(locked.token_price or 0)
        if price == old:
            if total_value is not None:  # a valuation that keeps the share price still sets the value
                Property.objects.filter(pk=locked.pk).update(total_value=total_value, updated_at=timezone.now())
                prop.total_value = total_value
            return None
        if source == PropertyPriceChange.Source.ADMIN:
            validate_new_price(locked, price, confirm_large=confirm_large)

        ratio = price / old if old > 0 else None
        fields = {'token_price': price}
        if total_value is not None:
            fields['total_value'] = Decimal(total_value).quantize(CENT, ROUND_HALF_UP)
        elif ratio is not None:
            fields['total_value'] = _scale(locked.total_value, ratio)
        if ratio is not None and locked.minimum_investment:
            fields['minimum_investment'] = max(_scale(locked.minimum_investment, ratio), CENT)

        if not is_live(locked):
            Property.objects.filter(pk=locked.pk).update(**fields, updated_at=timezone.now())
            _copy(prop, fields)
            return None

        if locked.launch_price is None:
            fields['launch_price'] = old
        change = PropertyPriceChange.objects.create(
            property=locked, previous_price=old, price=price, label=(label or '')[:80],
            note=(note or '')[:280], source=source, created_by=by if getattr(by, 'pk', None) else None)
        Property.objects.filter(pk=locked.pk).update(**fields, updated_at=timezone.now())
        _copy(prop, fields)

        if source != PropertyPriceChange.Source.VALUATION:
            # Holders' positions are valued from the latest valuation: record one at the new value.
            PropertyValuation.objects.create(
                property=locked, current_value=fields.get('total_value') or locked.total_value,
                valuation_date=timezone.now(), valuation_method='Share price change',
                appraiser='Capimax RT', notes=f'Share price ${old} → ${price}' + (f' ({label})' if label else ''))

        _touch_listings(locked)
        transaction.on_commit(lambda: notify_price_change(change.pk))
    return change


def _copy(prop, fields: dict) -> None:
    for k, v in fields.items():
        setattr(prop, k, v)


def _touch_listings(prop) -> None:
    try:
        from marketplace.models import MarketListing
        MarketListing.objects.filter(property_listing=prop, status='active').update(updated_at=timezone.now())
    except Exception:  # noqa: BLE001
        logger.warning('Touching listings after a price change failed', exc_info=True)


# --------------------------------------------------------------------------
# Who is told, and what
# --------------------------------------------------------------------------

LISTING_NOTE = (' Your open listing for sale keeps the price you set — cancel it and list again if you want to '
                'change it.')


def owners(prop) -> tuple[set, set]:
    """(everyone to tell, the subset with an open listing for sale)."""
    from .models import ConstructionInstallment, PositionListing
    from .rent_distribution import holdings

    users = set(holdings(prop).keys())
    users |= set(ConstructionInstallment.objects.filter(
        property_investment=prop, status__in=('awaiting_payment', 'pending', 'processing', 'completed'),
    ).values_list('investor_id', flat=True))
    sellers: set = set()
    try:
        from marketplace.models import MarketListing
        sellers |= set(MarketListing.objects.filter(property_listing=prop, status='active')
                       .values_list('seller_id', flat=True))
    except Exception:  # noqa: BLE001
        logger.warning('Listing sellers lookup failed', exc_info=True)
    sellers |= set(PositionListing.objects.filter(plan__property_investment=prop, status='open')
                   .values_list('seller_id', flat=True))
    users |= sellers
    users.discard(None)
    return users, sellers


def message_for(change, has_listing: bool) -> tuple[str, str]:
    prop = change.property
    pct = change.change_pct
    pct_txt = f' ({pct:+}%)' if pct is not None else ''
    label = f' — {change.label}' if change.label else ''
    note = f' {change.note.strip()}' if change.note.strip() else ''
    title = f'New share price for {prop.title}'
    body = (f'The share price of {prop.title} changed from ${change.previous_price:,.2f} to ${change.price:,.2f}'
            f'{pct_txt}{label}. Your shares are now valued at the new price. Installment plans you already started '
            f'keep their price.{note}{LISTING_NOTE if has_listing else ""} Prices can go down as well as up.')
    return title, body


def notify_price_change(change_id) -> int:
    from accounts.models import User
    from notifications.services import NotificationService
    from .models import PropertyPriceChange

    change = PropertyPriceChange.objects.select_related('property').filter(pk=change_id).first()
    if change is None:
        return 0
    users, sellers = owners(change.property)
    sent = 0
    for user in User.objects.filter(pk__in=users):
        title, body = message_for(change, user.pk in sellers)
        try:
            NotificationService.create_notification(
                user=user, title=title, message=body, notification_type='property', priority='high',
                action_url=f'/property-detail?id={change.property_id}', action_label='View the price history',
                send_email=True, content_object=change.property)
            sent += 1
        except Exception:  # noqa: BLE001
            logger.warning('Price change notice failed for %s', user.pk, exc_info=True)
    change.owners_notified = sent
    change.save(update_fields=['owners_notified'])
    return sent


# --------------------------------------------------------------------------
# What investors see
# --------------------------------------------------------------------------

def price_summary(prop) -> dict:
    history = list(prop.price_history.order_by('created_at'))
    current = Decimal(prop.token_price or 0)
    launch = Decimal(prop.launch_price) if prop.launch_price is not None else (
        history[0].previous_price if history else current)
    start = prop.published_at or prop.created_at
    points = [{'date': start.isoformat() if start else None, 'price': str(launch), 'previous_price': None,
               'label': '', 'note': '', 'change_pct': None}]
    for h in history:
        points.append({'date': h.created_at.isoformat(), 'price': str(h.price),
                       'previous_price': str(h.previous_price), 'label': h.label, 'note': h.note,
                       'change_pct': str(h.change_pct) if h.change_pct is not None else None})
    last = history[-1] if history else None
    pct = change_pct(launch, current)
    return {
        'launch_price': str(launch),
        'current_price': str(current),
        'change_pct': str(pct) if pct is not None else None,
        'label': last.label if last else '',
        'updated_at': last.created_at.isoformat() if last else None,
        'changes': len(history),
        'points': points,
    }
