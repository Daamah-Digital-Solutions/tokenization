import { apiClient } from '../api/ApiClient';

/**
 * Installment plans sold as one position (backend: properties/positions.py, at
 * /api/v1/properties/positions/ — as on Capimax BRX). The buyer pays the seller what
 * the position is worth above the installments still to pay, plus the resale fee,
 * and takes over the plan.
 */

export interface PositionOffer {
  id: string;
  lp_name: string;
  price_per_share: string;
  cash: string;
  fee: string;
  notes: string;
  status: 'open' | 'accepted' | 'declined' | 'withdrawn' | 'lapsed';
  live: boolean;
  expires_at: string;
  created_at: string;
}

export interface PositionScheduleRow {
  number: number;
  kind: string;
  due_date: string;
  amount: string;
  fee: string;
  total: string;
  status: 'due' | 'overdue' | 'upcoming';
}

export interface PositionListing {
  id: string;
  plan: string;
  status: 'listed' | 'sold' | 'cancelled';
  property_id: string;
  property_title: string;
  property_city: string;
  property_country: string;
  /** Card (client, Nov 2026 — as on PropShare): the property photo and stage */
  property_image?: string;
  property_category?: 'under_construction' | 'ready_property' | string;
  property_type?: string;
  expected_completion_date?: string | null;
  current_price: string;
  /** What the seller paid per share, and the gain/loss on all the shares at the asking price */
  entry_price?: string;
  price_change?: string;
  price_per_share: string;
  units: number;
  total_units: number;
  position_value: string;
  paid_principal: string;
  remaining_principal: string;
  /** What the seller receives (and the buyer pays before the fee) */
  cash: string;
  fee_percent: string;
  fee: string;
  buyer_total: string;
  remaining_payments: number;
  next_payment_date: string | null;
  next_payment_amount: string;
  frequency: string;
  total_payments?: number;
  payments_made?: number;
  /** The installments the buyer takes over (unpaid rows of the plan) */
  schedule?: PositionScheduleRow[];
  remaining_total?: string;
  remaining_fees?: string;
  overdue_count?: number;
  note: string;
  /** Where the seller offers it: the secondary market and/or the liquidity providers */
  to_market: boolean;
  to_providers: boolean;
  created_at: string;
  mine: boolean;
  /** Seller's view */
  offers?: PositionOffer[];
  /** A liquidity provider's own open offer */
  my_offer?: PositionOffer | null;
  // mine/ only
  role?: 'seller' | 'buyer';
  sold_price_per_share?: string;
  seller_cash?: string;
  buyer_fee?: string;
  assumed_principal?: string;
  sold_at?: string | null;
}

/** The plan valued as one position, for its holder (on each plan of the Installments list). */
export interface PlanPosition {
  current_price: string;
  units: number;
  value: string;
  paid_principal: string;
  remaining_principal: string;
  equity: string;
  entry_price: string;
  gain: string;
  fee_percent: string;
  floor_price: string;
  blocked: null | 'not_active' | 'not_started' | 'fully_paid' | 'below_remaining';
  listing: PositionListing | null;
}

const listOf = <T,>(data: any): T[] => (Array.isArray(data) ? data : data?.results || data?.data || []);

export type PositionChannel = 'market' | 'providers';

export interface PositionChannels {
  toMarket: boolean;
  toProviders: boolean;
}

export class PositionService {
  /** 'market' — the secondary market page; 'providers' — the liquidity market */
  static async market(channel?: PositionChannel): Promise<PositionListing[]> {
    const q = channel ? `?channel=${channel}` : '';
    return listOf<PositionListing>(await apiClient.get(`/properties/positions/${q}`));
  }

  static async mine(): Promise<PositionListing[]> {
    return listOf<PositionListing>(await apiClient.get('/properties/positions/mine/'));
  }

  static list(plan: string, pricePerShare: number, channels: PositionChannels = { toMarket: true, toProviders: true },
              note?: string): Promise<PositionListing> {
    return apiClient.post('/properties/positions/', {
      plan, price_per_share: pricePerShare, note: note || '',
      to_market: channels.toMarket, to_providers: channels.toProviders,
    });
  }

  /** Change where an open listing is offered (dropping the providers closes their offers). */
  static channels(listingId: string, channels: PositionChannels): Promise<PositionListing> {
    return apiClient.post(`/properties/positions/${listingId}/channels/`, {
      to_market: channels.toMarket, to_providers: channels.toProviders,
    });
  }

  static cancel(listingId: string): Promise<unknown> {
    return apiClient.post(`/properties/positions/${listingId}/cancel/`, {});
  }

  /** Buy at the asking price; the amounts shown are confirmed (they move as installments are paid). */
  static buy(listingId: string, expectedCash: string, expectedFee: string): Promise<unknown> {
    return apiClient.post(`/properties/positions/${listingId}/buy/`, {
      expected_cash: expectedCash, expected_fee: expectedFee,
    });
  }

  static offer(listingId: string, pricePerShare: number, notes?: string): Promise<unknown> {
    return apiClient.post(`/properties/positions/${listingId}/offer/`, { price_per_share: pricePerShare, notes: notes || '' });
  }

  static withdrawOffer(listingId: string): Promise<unknown> {
    return apiClient.post(`/properties/positions/${listingId}/withdraw_offer/`, {});
  }

  static answer(listingId: string, offerId: string, action: 'accept' | 'decline'): Promise<unknown> {
    return apiClient.post(`/properties/positions/${listingId}/answer/`, { offer: offerId, action });
  }
}

export default PositionService;
