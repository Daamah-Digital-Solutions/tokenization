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

export interface LPExitRequest {
  id: string;
  investor_name: string;
  property_name: string;
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
  lp_name: string;
  resale_fee: string | null;
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

  static async getExitRequests(): Promise<LPExitRequest[]> {
    return listOf<LPExitRequest>(await apiClient.get('/liquidity-provider/exit-requests/', { page_size: 100 }));
  }

  static async getTransactions(): Promise<LPTransaction[]> {
    // the LP's own purchases (my_transactions returns the caller's sales as an investor)
    return listOf<LPTransaction>(await apiClient.get('/liquidity-provider/transactions/', { page_size: 100 }));
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

  static requestExit(data: { property: string; liquidity_provider: string; units_requested: number;
    requested_price_per_unit: number }): Promise<unknown> {
    return apiClient.post('/liquidity-provider/exit-requests/', data);
  }

  static async myExitRequests(): Promise<InvestorExitRequest[]> {
    return listOf<InvestorExitRequest>(await apiClient.get('/liquidity-provider/exit-requests/my_requests/'));
  }

  static answer(requestId: string, action: 'accept' | 'decline' | 'cancel'): Promise<unknown> {
    return apiClient.post(`/liquidity-provider/exit-requests/${requestId}/investor_action/`, { action });
  }

  static updatePreferences(providerId: string, data: Partial<LPProfile>): Promise<unknown> {
    return apiClient.patch(`/liquidity-provider/providers/${providerId}/`, data);
  }
}

export default LiquidityProviderService;
