import { apiClient } from '../api/ApiClient';

/**
 * Liquidity-provider dashboard API (backend: liquidity_provider app,
 * mounted at /api/v1/liquidity-provider/). Client round 3, #9.
 */

export interface LPProfile {
  id: string;
  legal_entity_name: string;
  country: string;
  jurisdiction: string;
  registration_number: string;
  website: string | null;
  contact_person_name: string;
  contact_position: string;
  official_email: string;
  phone_number: string;
  liquidity_available: string;
  preferred_currencies: string[];
  target_ready_properties: boolean;
  target_under_construction: boolean;
  target_property_portfolios: boolean;
  discount_rate: string;
  max_per_transaction: string;
  max_per_month: string;
  current_month_total: string;
  remaining_monthly_capacity: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
}

export interface LPStats {
  open_market_requests: number;
  open_offers: number;
  total_exit_requests: number;
  pending_requests: number;
  approved_requests: number;
  completed_requests: number;
  rejected_requests: number;
  total_units_purchased: number;
  total_amount_spent: string;
  current_month_volume: string;
  remaining_monthly_capacity: string;
}

/** A provider's offer on a request open to all providers (round 5). */
export interface LPOffer {
  id: string;
  liquidity_provider: string;
  lp_name: string;
  lp_country: string;
  price_per_unit: string;
  total_amount: string;
  resale_fee: string;
  notes: string;
  status: 'open' | 'accepted' | 'declined' | 'withdrawn' | 'lapsed';
  live: boolean;
  expires_at: string;
  created_at: string;
}

/** One of the provider's own offers, with the request it answers. */
export interface LPMyOffer extends LPOffer {
  exit_request: string;
  property_name: string;
  units_requested: number;
  requested_price_per_unit: string;
  request_status: string;
}

export interface LPStatement {
  provider: string;
  from: string;
  to: string;
  opening_balance: string;
  closing_balance: string;
  summary: {
    bought_deals: number;
    bought_shares: number;
    bought_paid: string;
    sold_deals: number;
    sold_shares: number;
    sold_received: string;
    deposits: string;
    withdrawals: string;
    rent: string;
    fees: string;
  };
  bought: { date: string; reference: string; property: string; shares: number; price: string; total: string; fee: string }[];
  sold: { date: string; reference: string; property: string; shares: number; price: string; total: string }[];
  lines: { date: string; type: string; description: string; amount: string; balance: string }[];
}

export interface LPExitRequest {
  id: string;
  investor_name: string;
  property_name: string;
  property_id?: string;
  property_city?: string;
  share_price?: string | null;
  open_to_all?: boolean;
  resale_fee_pct?: string;
  offers?: LPOffer[];
  replaces?: string | null;
  units_requested: number;
  requested_price_per_unit: string;
  total_requested_amount: string;
  offered_price_per_unit: string | null;
  total_offered_amount: string | null;
  discount_percentage: string | null;
  lp_notes: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string | null;
}

export interface PublicLP {
  id: string;
  legal_entity_name: string;
  country: string;
  entity_type_display: string;
  discount_rate: string;
  max_per_transaction: string;
  target_ready_properties: boolean;
  target_under_construction: boolean;
}

export interface InvestorExitRequest extends LPExitRequest {
  property_id: string;
  lp_name: string | null;
  liquidity_provider: string | null;
  resale_fee: string | null;
}

export interface LPAsset {
  property_id: string;
  title: string;
  city: string;
  country: string;
  image: string | null;
  shares: number;
  total_shares: number;
  cost: string;
  share_price: string;
  value: string;
  gain: string;
  gain_pct: string;
  listed_shares: number;
  available_shares: number;
  bought_from_investors: { deals: number; shares: number; paid: string } | null;
  certificate: { id: string; number: string; status: 'provisional' | 'final' | 'revoked' } | null;
  since: string | null;
}

export interface LPPosition {
  plan: string;
  property_id: string;
  title: string;
  shares: number;
  value: string;
  equity: string;
  entry_price: string;
  remaining_principal: string;
  remaining_payments: number;
  next_payment_date: string | null;
  next_payment_amount: string;
  listed: boolean;
  certificate: { id: string; number: string; status: string } | null;
}

export interface LPAssets {
  assets: LPAsset[];
  /** Installment plans bought as a position, still being paid */
  positions?: LPPosition[];
  totals: {
    properties: number;
    shares: number;
    cost: string;
    value: string;
    gain: string;
    gain_pct: string;
    certificates: number;
    listed_shares: number;
  };
}

export interface LPTransaction {
  id: string;
  reference_number: string;
  investor_name: string;
  property_name: string;
  units_purchased: number;
  price_per_unit: string;
  total_amount: string;
  platform_fee: string;
  completed_at: string;
}

const listOf = <T,>(data: any): T[] => (Array.isArray(data) ? data : data?.results || data?.data || []);

export class LiquidityProviderService {
  static getProfile(): Promise<LPProfile> {
    return apiClient.get<LPProfile>('/liquidity-provider/providers/my_profile/');
  }

  static getStats(): Promise<LPStats> {
    return apiClient.get<LPStats>('/liquidity-provider/providers/dashboard_stats/');
  }

  /** The shares this LP owns, per property (bought from investors or otherwise). */
  static getAssets(): Promise<LPAssets> {
    return apiClient.get<LPAssets>('/liquidity-provider/providers/assets/');
  }

  static async getExitRequests(): Promise<LPExitRequest[]> {
    return listOf<LPExitRequest>(await apiClient.get('/liquidity-provider/exit-requests/', { page_size: 100 }));
  }

  static async getTransactions(): Promise<LPTransaction[]> {
    // the LP's own purchases (my_transactions returns the caller's sales as an investor)
    return listOf<LPTransaction>(await apiClient.get('/liquidity-provider/transactions/', { page_size: 100 }));
  }

  /** Requests open to all providers (the liquidity market), with this provider's own offer. */
  static async getMarket(): Promise<LPExitRequest[]> {
    return listOf<LPExitRequest>(await apiClient.get('/liquidity-provider/exit-requests/market/'));
  }

  static async getMyOffers(): Promise<LPMyOffer[]> {
    return listOf<LPMyOffer>(await apiClient.get('/liquidity-provider/exit-requests/my_offers/'));
  }

  static makeOffer(requestId: string, pricePerUnit: number, notes?: string): Promise<unknown> {
    return apiClient.post(`/liquidity-provider/exit-requests/${requestId}/make_offer/`, {
      price_per_unit: pricePerUnit, notes: notes || '',
    });
  }

  static withdrawOffer(requestId: string): Promise<unknown> {
    return apiClient.post(`/liquidity-provider/exit-requests/${requestId}/withdraw_offer/`, {});
  }

  static getStatement(from?: string, to?: string): Promise<LPStatement> {
    return apiClient.get<LPStatement>('/liquidity-provider/providers/statement/', {
      ...(from ? { from } : {}), ...(to ? { to } : {}),
    });
  }

  static decide(
    requestId: string,
    action: 'approve' | 'reject',
    offeredPricePerUnit?: number,
    notes?: string,
  ): Promise<unknown> {
    return apiClient.post(`/liquidity-provider/exit-requests/${requestId}/lp_action/`, {
      action,
      ...(action === 'approve' ? { offered_price_per_unit: offeredPricePerUnit } : {}),
      notes: notes || '',
    });
  }

  // ---- investor side: sell shares to a liquidity provider (client round 4, #13) ----

  static async listActiveProviders(): Promise<PublicLP[]> {
    return listOf<PublicLP>(await apiClient.get('/liquidity-provider/providers/list_active/'));
  }

  /** No `liquidity_provider` = open to all providers; `replaces` = send an earlier request again. */
  static requestExit(data: { property: string; liquidity_provider?: string | null; units_requested: number;
    requested_price_per_unit: number; replaces?: string }): Promise<unknown> {
    return apiClient.post('/liquidity-provider/exit-requests/', data);
  }

  static async myExitRequests(): Promise<InvestorExitRequest[]> {
    return listOf<InvestorExitRequest>(await apiClient.get('/liquidity-provider/exit-requests/my_requests/'));
  }

  /** `offerId`: which provider's offer, on a request open to all providers. */
  static answer(requestId: string, action: 'accept' | 'decline' | 'cancel', offerId?: string): Promise<unknown> {
    return apiClient.post(`/liquidity-provider/exit-requests/${requestId}/investor_action/`, {
      action, ...(offerId ? { offer: offerId } : {}),
    });
  }

  static updatePreferences(providerId: string, data: Partial<LPProfile>): Promise<unknown> {
    return apiClient.patch(`/liquidity-provider/providers/${providerId}/`, data);
  }
}

export default LiquidityProviderService;
