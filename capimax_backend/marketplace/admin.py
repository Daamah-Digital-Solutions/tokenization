"""
Django admin for marketplace models.

Built for operator/admin moderation:
- Browse and filter listings, orders, trades, escrows, analytics
- Bulk-cancel suspicious listings
- Bulk-cancel pending orders
- Mark stuck trades as failed
- Release / refund escrows

The list views deliberately keep most rows ``readonly`` because the state
transitions on these models also drive token movement and money settlement;
free-text editing in admin would corrupt the matching engine. Use the bulk
actions instead.
"""

from django.contrib import admin
from django.utils import timezone

from .models import (
    EscrowAccount,
    EscrowStatus,
    ListingStatus,
    MarketAnalytics,
    MarketListing,
    OrderStatus,
    TradeOrder,
    TradeTransaction,
    TradingPair,
    TransactionStatus,
)


# --------------------------------------------------------------------------- #
# Listings
# --------------------------------------------------------------------------- #


@admin.register(MarketListing)
class MarketListingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "property_listing",
        "seller",
        "listing_type",
        "tokens_offered",
        "tokens_remaining",
        "price_per_token",
        "status",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "listing_type", "created_at", "expires_at")
    search_fields = (
        "property_listing__title",
        "property_listing__city",
        "seller__email",
        "seller__first_name",
        "seller__last_name",
    )
    autocomplete_fields = ("property_listing", "seller")
    readonly_fields = (
        "id",
        "tokens_filled",
        "fill_percentage",
        "current_value",
        "is_active",
        "created_at",
        "updated_at",
        "completed_at",
    )
    date_hierarchy = "created_at"
    list_select_related = ("property_listing", "seller")
    ordering = ("-created_at",)

    actions = ("cancel_listings", "expire_listings")

    @admin.action(description="Cancel selected listings")
    def cancel_listings(self, request, queryset):
        eligible = queryset.filter(
            status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED]
        )
        count = eligible.update(status=ListingStatus.CANCELLED, updated_at=timezone.now())
        self.message_user(
            request,
            f"{count} listing(s) cancelled. Already-completed/cancelled listings were skipped.",
        )

    @admin.action(description="Mark selected listings as expired")
    def expire_listings(self, request, queryset):
        eligible = queryset.filter(
            status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED]
        )
        count = eligible.update(status=ListingStatus.EXPIRED, updated_at=timezone.now())
        self.message_user(request, f"{count} listing(s) marked as expired.")


# --------------------------------------------------------------------------- #
# Trade orders
# --------------------------------------------------------------------------- #


@admin.register(TradeOrder)
class TradeOrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "listing",
        "buyer",
        "order_type",
        "tokens_requested",
        "tokens_filled",
        "price_per_token",
        "status",
        "created_at",
    )
    list_filter = ("status", "order_type", "created_at")
    search_fields = (
        "listing__property_listing__title",
        "buyer__email",
        "buyer__first_name",
        "buyer__last_name",
    )
    autocomplete_fields = ("listing", "buyer")
    readonly_fields = (
        "id",
        "tokens_remaining",
        "fill_percentage",
        "total_amount",
        "trading_fee",
        "net_amount",
        "created_at",
        "updated_at",
        "executed_at",
        "execution_price",
        "transaction_hash",
    )
    date_hierarchy = "created_at"
    list_select_related = ("listing", "listing__property_listing", "buyer")
    ordering = ("-created_at",)

    actions = ("cancel_orders",)

    @admin.action(description="Cancel selected orders")
    def cancel_orders(self, request, queryset):
        eligible = queryset.filter(
            status__in=[OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED]
        )
        count = eligible.update(status=OrderStatus.CANCELLED, updated_at=timezone.now())
        self.message_user(request, f"{count} order(s) cancelled.")


# --------------------------------------------------------------------------- #
# Trade transactions
# --------------------------------------------------------------------------- #


@admin.register(TradeTransaction)
class TradeTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "property_traded",
        "buyer",
        "seller",
        "tokens_traded",
        "price_per_token",
        "total_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "id",
        "property_traded__title",
        "buyer__email",
        "seller__email",
        "transaction_hash",
    )
    autocomplete_fields = ("listing", "order", "buyer", "seller", "property_traded")
    readonly_fields = (
        "id",
        "ownership_percentage_traded",
        "platform_fee",
        "buyer_fee",
        "seller_fee",
        "net_amount_to_seller",
        "created_at",
        "processed_at",
        "completed_at",
        "transaction_hash",
        "market_cap_at_trade",
        "volume_24h",
    )
    date_hierarchy = "created_at"
    list_select_related = ("buyer", "seller", "property_traded")
    ordering = ("-created_at",)

    actions = ("mark_failed",)

    @admin.action(description="Mark selected trades as FAILED (manual intervention)")
    def mark_failed(self, request, queryset):
        stuck = queryset.exclude(
            status__in=[TransactionStatus.COMPLETED, TransactionStatus.FAILED]
        )
        count = stuck.update(status=TransactionStatus.FAILED)
        self.message_user(
            request,
            f"{count} trade(s) marked as FAILED. Completed/already-failed trades skipped.",
        )


# --------------------------------------------------------------------------- #
# Escrow accounts
# --------------------------------------------------------------------------- #


@admin.register(EscrowAccount)
class EscrowAccountAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "transaction",
        "amount_held",
        "tokens_held",
        "status",
        "timeout_at",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("id", "transaction__id", "transaction__buyer__email")
    autocomplete_fields = ("transaction",)
    readonly_fields = ("id", "created_at", "released_at", "timeout_at")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    actions = ("force_release", "force_refund")

    @admin.action(description="Force release escrow → buyer receives tokens / seller funds")
    def force_release(self, request, queryset):
        eligible = queryset.filter(status=EscrowStatus.HOLDING)
        count = eligible.update(status=EscrowStatus.RELEASED, released_at=timezone.now())
        self.message_user(request, f"{count} escrow(s) released. Non-holding escrows skipped.")

    @admin.action(description="Force refund escrow → buyer gets funds back")
    def force_refund(self, request, queryset):
        # The model uses ``released_at`` for both release/refund timestamps —
        # the ``status`` field carries the directionality.
        eligible = queryset.filter(status=EscrowStatus.HOLDING)
        count = eligible.update(status=EscrowStatus.REFUNDED, released_at=timezone.now())
        self.message_user(request, f"{count} escrow(s) refunded. Non-holding escrows skipped.")


# --------------------------------------------------------------------------- #
# Analytics + trading pairs (read-only operational reference)
# --------------------------------------------------------------------------- #


@admin.register(MarketAnalytics)
class MarketAnalyticsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "property_analyzed",
        "timeframe",
        "volume_usd",
        "trade_count",
        "active_listings_count",
        "period_start",
        "period_end",
    )
    list_filter = ("timeframe", "period_start")
    search_fields = ("property_analyzed__title",)
    autocomplete_fields = ("property_analyzed",)
    readonly_fields = [f.name for f in MarketAnalytics._meta.fields]
    date_hierarchy = "period_start"
    ordering = ("-period_start",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TradingPair)
class TradingPairAdmin(admin.ModelAdmin):
    list_display = (
        "symbol",
        "pair_type",
        "base_property_pair",
        "quote_property_pair",
        "status",
        "created_at",
    )
    list_filter = ("status", "pair_type", "created_at")
    search_fields = (
        "symbol",
        "base_property_pair__title",
        "quote_property_pair__title",
    )
    autocomplete_fields = ("base_property_pair", "quote_property_pair")
    readonly_fields = ("created_at", "updated_at")
