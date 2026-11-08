"""In-app notices + emails for installment position sales (properties/positions.py). A notice never fails a sale."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _notice(user, title: str, message: str, url: str) -> None:
    if user is None:
        return
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='investment', action_url=url,
                                                action_label='Open', send_email=True)
    except Exception:  # noqa: BLE001
        logger.warning('Position notice failed: %s', title, exc_info=True)


def _units(listing) -> int:
    from .positions import listed_units
    return listed_units(listing)


def _title(listing) -> str:
    return listing.plan.property_investment.title


def position_sold(listing, fig, other_offers, seller_plan=None) -> None:
    """`listing` is the sold row (its plan is the buyer's); `seller_plan` = the seller's plan when part was sold."""
    plan = listing.plan
    if seller_plan is None:
        _notice(listing.seller, 'Installment position sold',
                f'Your installment position of {fig["units"]} shares of {_title(listing)} was sold for '
                f'${fig["cash"]:,.2f}, added to your wallet. The remaining installments '
                f'(${fig["remaining_principal"]:,.2f}) are now the buyer\'s.', '/dashboard?view=wallet')
    else:
        seller_plan.refresh_from_db()
        nxt = (f' Your next payment is ${seller_plan.total_due:,.2f} on {seller_plan.next_payment_date:%Y-%m-%d}.'
               if seller_plan.is_active and seller_plan.next_payment_date else '')
        _notice(listing.seller, 'Part of your installment plan sold',
                f'{fig["units"]} share(s) of your installment plan for {_title(listing)} were sold for '
                f'${fig["cash"]:,.2f}, added to your wallet. Their part of the remaining installments '
                f'(${fig["remaining_principal"]:,.2f}) is now the buyer\'s. You keep {seller_plan.token_allocation} '
                f'share(s) and your installments are smaller.{nxt}', '/dashboard?view=installments')
    nxt = (f' The next payment, ${fig["next_payment_amount"]:,.2f}, is due on {plan.next_payment_date:%Y-%m-%d}.'
           if plan.next_payment_date else '')
    _notice(listing.buyer, 'Installment position bought',
            f'You bought the installment position of {fig["units"]} share(s) of {_title(listing)} for '
            f'${fig["buyer_total"]:,.2f} (including the ${fig["fee"]:,.2f} fee). The plan is yours now: '
            f'{fig["remaining_payments"]} payment(s), ${fig["remaining_principal"]:,.2f} in total, are charged '
            f'from your wallet.{nxt}', '/dashboard?view=installments')
    for offer in other_offers:
        _notice(offer.liquidity_provider.user, 'Position sold to another buyer',
                f'The installment position of {fig["units"]} shares of {_title(listing)} was sold; your offer is '
                f'closed.', '/dashboard?view=lp-market')


def offers_closed(listing, offers, sold: bool) -> None:
    for offer in offers:
        _notice(offer.liquidity_provider.user, 'Position no longer for sale',
                f'The seller withdrew the installment position of {_units(listing)} share(s) of '
                f'{_title(listing)}; your offer is closed.', '/dashboard?view=lp-market')


def providers_closed(listing, offers) -> None:
    """The seller now offers the position on the secondary market only."""
    for offer in offers:
        _notice(offer.liquidity_provider.user, 'Position offered on the secondary market only',
                f'The seller of the installment position of {_units(listing)} share(s) of '
                f'{_title(listing)} now offers it on the secondary market only; your offer is closed. You can still '
                f'buy it there at the asking price.', '/dashboard?view=marketplace')


def offer_received(offer) -> None:
    listing = offer.listing
    from .positions import figures
    from .positions import listed_units
    fig = figures(listing.plan, offer.price_per_share, listed_units(listing))
    _notice(listing.seller, 'Offer for your installment position',
            f'{offer.liquidity_provider.legal_entity_name} offers ${offer.price_per_share:,.2f} per share for your '
            f'position of {fig["units"]} shares of {_title(listing)}: you would receive ${fig["cash"]:,.2f}. '
            f'Accept or decline it in Installments before {offer.expires_at:%Y-%m-%d %H:%M} UTC.',
            '/dashboard?view=installments')


def offer_declined(offer) -> None:
    _notice(offer.liquidity_provider.user, 'Position offer declined',
            f'The seller declined your offer of ${offer.price_per_share:,.2f} per share for the installment '
            f'position of {_title(offer.listing)}. You can send a better offer while it is for sale.',
            '/dashboard?view=lp-market')


def offer_lapsed(offer) -> None:
    _notice(offer.liquidity_provider.user, 'Position offer expired',
            f'The seller did not answer your offer for the installment position of {_title(offer.listing)} in time.',
            '/dashboard?view=lp-market')
