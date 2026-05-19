import { apiClient } from '../api/ApiClient';
import type { APIResponse, PaginatedResponse } from '../api/types';

export interface SecondaryMarketListing {
  id: string;
  property_listing: {
    id: string;
    title: string;
    location: string;
    city: string;
    image_url?: string;
    images?: Array<{ image: string }>;
    total_value: number;
    token_symbol?: string;
    property_type: string;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
  };
  listing_type: 'sell' | 'buy';
  tokens_offered: number;
  tokens_remaining: number;
  price_per_token: string;
  total_price: string;
  minimum_order_size: number;
  status: 'active' | 'partially_filled' | 'completed' | 'cancelled' | 'expired';
  expires_at: string;
  auto_extend: boolean;
  accepts_partial_fills: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface MarketplaceFilters {
  property_type?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  min_tokens?: number;
  max_tokens?: number;
  // Backend stores listing_type as 'sell'/'buy' on `MarketListing`.
  // The legacy IMMEDIATE/AUCTION values never matched a real column and
  // would silently drop the filter at the DRF filterset.
  listing_type?: 'sell' | 'buy';
  status?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'tokens_asc' | 'tokens_desc' | 'created_asc' | 'created_desc';
}

export interface CreateListingRequest {
  property_listing: string;
  listing_type: 'sell' | 'buy';
  tokens_offered: number;
  price_per_token: string;
  minimum_order_size?: number;
  expires_at?: string;
  auto_extend?: boolean;
  accepts_partial_fills?: boolean;
  notes?: string;
}

export interface TradeOrderRequest {
  listing: string;
  order_type?: 'market' | 'limit';
  tokens_requested: number;
  price_per_token: string;
}

export interface BidRequest {
  listing_id: string;
  bid_price_per_token: number;
  tokens_quantity: number;
}

export interface MarketplaceBid {
  id: string;
  bidder_id: string;
  listing_id: string;
  bid_price_per_token: number;
  tokens_quantity: number;
  total_bid_amount: number;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
}

export interface MarketplaceStats {
  total_listings: number;
  total_volume_24h: number;
  total_volume_all_time: number;
  average_price_per_token: number;
  total_transactions: number;
  active_auctions: number;
}

export interface MarketplaceActivity {
  id: string;
  type: 'LISTING_CREATED' | 'LISTING_SOLD' | 'BID_PLACED' | 'AUCTION_ENDED';
  listing_id: string;
  property: {
    name: string;
    image_url: string;
  };
  amount: number;
  tokens: number;
  price_per_token: number;
  user: {
    username: string;
    avatar_url?: string;
  };
  created_at: string;
}

export class MarketplaceService {
  // NB: ApiClient already prepends `/api/v1`. Do NOT include it here or
  // every call ends up at /api/v1/api/v1/marketplace/... and 404s.
  private readonly baseEndpoint = '/marketplace';

  /**
   * Get all marketplace listings with optional filters
   */
  async getListings(
    filters: MarketplaceFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = {
      ...filters,
      page,
      page_size: pageSize,
    };

    return await apiClient.get(`${this.baseEndpoint}/listings/`, params);
  }

  /**
   * Get a specific marketplace listing by ID
   */
  async getListing(listingId: string): Promise<SecondaryMarketListing> {
    return await apiClient.get(`${this.baseEndpoint}/listings/${listingId}/`);
  }

  /**
   * Create a new marketplace listing
   */
  async createListing(data: CreateListingRequest): Promise<SecondaryMarketListing> {
    return await apiClient.post(`${this.baseEndpoint}/listings/`, data);
  }

  /**
   * Update an existing marketplace listing
   */
  async updateListing(
    listingId: string,
    data: Partial<CreateListingRequest>
  ): Promise<SecondaryMarketListing> {
    return await apiClient.patch(`${this.baseEndpoint}/listings/${listingId}/`, data);
  }

  /**
   * Cancel a marketplace listing
   */
  async cancelListing(listingId: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.post(`${this.baseEndpoint}/listings/${listingId}/cancel/`);
  }

  /**
   * Create a trade order to buy tokens from a marketplace listing
   */
  async createTradeOrder(data: TradeOrderRequest): Promise<{
    success: boolean;
    order_id: string;
    message: string;
  }> {
    return await apiClient.post(`${this.baseEndpoint}/orders/`, data);
  }

  // -------------------------------------------------------------------
  // Bids — NOT YET IMPLEMENTED on the backend.
  //
  // There is no Bid model or BidViewSet in marketplace/. These methods
  // throw rather than silently 404 so the UI can surface a clear error
  // instead of pretending an auction action succeeded.
  // -------------------------------------------------------------------

  async placeBid(_data: BidRequest): Promise<MarketplaceBid> {
    throw new Error('Bid placement is not yet implemented on the backend.');
  }

  async getListingBids(
    _listingId: string,
    _page: number = 1,
    _pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceBid>> {
    throw new Error('Bid listing is not yet implemented on the backend.');
  }

  async getUserBids(
    _page: number = 1,
    _pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceBid>> {
    throw new Error('User bid history is not yet implemented on the backend.');
  }

  async acceptBid(_bidId: string): Promise<{
    success: boolean;
    transaction_id: string;
    message: string;
  }> {
    throw new Error('Bid acceptance is not yet implemented on the backend.');
  }

  async rejectBid(_bidId: string): Promise<{ success: boolean; message: string }> {
    throw new Error('Bid rejection is not yet implemented on the backend.');
  }

  /**
   * Get user's own marketplace listings.
   *
   * Backend supports this via the `my_listings=true` query parameter on
   * the main listings endpoint — there is no separate `/my-listings/`
   * route.
   */
  async getUserListings(
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params: any = {
      my_listings: 'true',
      page,
      page_size: pageSize,
    };
    if (status) params.status = status;
    return await apiClient.get(`${this.baseEndpoint}/listings/`, params);
  }

  /**
   * Get marketplace statistics.
   *
   * Mapped to the analytics overview action — `/analytics/overview/`.
   * Shape differs slightly from the `MarketplaceStats` interface; callers
   * should treat the response as best-effort.
   */
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    return await apiClient.get(`${this.baseEndpoint}/analytics/overview/`);
  }

  /**
   * Get recent marketplace activity.
   *
   * No dedicated activity feed exists yet — the closest backend equivalent
   * is the transactions list, but the response shape is different. Throw
   * rather than return wrong data.
   */
  async getMarketplaceActivity(
    _page: number = 1,
    _pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceActivity>> {
    throw new Error('Marketplace activity feed is not yet implemented on the backend.');
  }

  /**
   * Get property-specific marketplace listings.
   *
   * Mapped to `?property_id=<id>` on the main listings endpoint, which the
   * backend honours via custom queryset filtering.
   */
  async getPropertyListings(
    propertyId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = { property_id: propertyId, page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/listings/`, params);
  }

  /**
   * Get recommended listings for a user.
   *
   * No recommendation engine in marketplace yet. Throw rather than 404.
   */
  async getRecommendedListings(
    _page: number = 1,
    _pageSize: number = 10
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    throw new Error('Marketplace recommendations are not yet implemented on the backend.');
  }

  /**
   * Get trending properties in marketplace.
   *
   * No trending endpoint exists. Throw rather than 404.
   */
  async getTrendingProperties(): Promise<{
    most_traded: Array<{
      property_id: string;
      property_name: string;
      volume_24h: number;
      price_change_24h: number;
    }>;
    highest_volume: Array<{
      property_id: string;
      property_name: string;
      total_volume: number;
    }>;
  }> {
    throw new Error('Marketplace trending data is not yet implemented on the backend.');
  }

  /**
   * Search marketplace listings.
   *
   * Backend supports SearchFilter on `/listings/?search=<q>` — there is no
   * dedicated `/search/` route.
   */
  async searchListings(
    query: string,
    filters: MarketplaceFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = {
      search: query,
      ...filters,
      page,
      page_size: pageSize,
    };
    return await apiClient.get(`${this.baseEndpoint}/listings/`, params);
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();