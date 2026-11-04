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


def _title(listing) -> str:
    return listing.plan.property_investment.title


def position_sold(listing, fig, other_offers) -> None:
    plan = listing.plan
    _notice(listing.seller, 'Installment position sold',
            f'Your installment position of {fig["units"]} shares of {_title(listing)} was sold for '
            f'${fig["cash"]:,.2f}, added to your wallet. The remaining installments '
            f'(${fig["remaining_principal"]:,.2f}) are now the buyer\'s.', '/dashboard?view=wallet')
    nxt = (f' The next payment, ${fig["next_payment_amount"]:,.2f}, is due on {plan.next_payment_date:%Y-%m-%d}.'
           if plan.next_payment_date else '')
    _notice(listing.buyer, 'Installment position bought',
            f'You bought the installment position of {fig["units"]} shares of {_title(listing)} for '
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
                f'The seller withdrew the installment position of {listing.plan.token_allocation} shares of '
                f'{_title(listing)}; your offer is closed.', '/dashboard?view=lp-market')


def offer_received(offer) -> None:
    listing = offer.listing
    from .positions import figures
    fig = figures(listing.plan, offer.price_per_share)
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
