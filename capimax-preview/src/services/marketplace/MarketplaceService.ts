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
  listing_type?: 'IMMEDIATE' | 'AUCTION';
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
  private readonly baseEndpoint = '/api/v1/marketplace';

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

  /**
   * Place a bid on an auction listing
   */
  async placeBid(data: BidRequest): Promise<MarketplaceBid> {
    return await apiClient.post(`${this.baseEndpoint}/bids/`, data);
  }

  /**
   * Get bids for a specific listing
   */
  async getListingBids(
    listingId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceBid>> {
    const params = { page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/listings/${listingId}/bids/`, params);
  }

  /**
   * Get user's own bids
   */
  async getUserBids(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceBid>> {
    const params = { page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/my-bids/`, params);
  }

  /**
   * Accept a bid on a listing (for listing owners)
   */
  async acceptBid(bidId: string): Promise<{
    success: boolean;
    transaction_id: string;
    message: string;
  }> {
    return await apiClient.post(`${this.baseEndpoint}/bids/${bidId}/accept/`);
  }

  /**
   * Reject a bid on a listing (for listing owners)
   */
  async rejectBid(bidId: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.post(`${this.baseEndpoint}/bids/${bidId}/reject/`);
  }

  /**
   * Get user's own marketplace listings
   */
  async getUserListings(
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = {
      ...(status && { status }),
      page,
      page_size: pageSize,
    };
    return await apiClient.get(`${this.baseEndpoint}/my-listings/`, params);
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    return await apiClient.get(`${this.baseEndpoint}/stats/`);
  }

  /**
   * Get recent marketplace activity
   */
  async getMarketplaceActivity(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<MarketplaceActivity>> {
    const params = { page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/activity/`, params);
  }

  /**
   * Get property-specific marketplace listings
   */
  async getPropertyListings(
    propertyId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = { page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/properties/${propertyId}/listings/`, params);
  }

  /**
   * Get recommended listings for a user
   */
  async getRecommendedListings(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = { page, page_size: pageSize };
    return await apiClient.get(`${this.baseEndpoint}/recommended/`, params);
  }

  /**
   * Get trending properties in marketplace
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
    return await apiClient.get(`${this.baseEndpoint}/trending/`);
  }

  /**
   * Search marketplace listings
   */
  async searchListings(
    query: string,
    filters: MarketplaceFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<SecondaryMarketListing>> {
    const params = {
      q: query,
      ...filters,
      page,
      page_size: pageSize,
    };
    return await apiClient.get(`${this.baseEndpoint}/search/`, params);
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();