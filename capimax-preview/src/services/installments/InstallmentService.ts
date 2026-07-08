/**
 * InstallmentService — the real construction-installment API (client edit #3).
 *
 * Talks to the `properties` app's ConstructionInstallment ViewSet under
 * /properties/installments/ (the old ConstructionService installment helpers
 * were dead stubs that threw). Powers the dashboard "Installments" panel and
 * the buy-in-instalments checkout.
 *
 * apiClient.unwrap() only strips the {success, data} envelope; these endpoints
 * return raw DRF/flat bodies, so list responses come back as a paginated
 * object ({results,...}) and the action responses come back flat.
 */

import { apiClient } from '../api/ApiClient';

export interface InstallmentPlan {
  id: string;
  property_investment: string;
  property_title?: string;
  property_address?: string;
  property_category?: string;
  total_investment_amount: string | number;
  token_allocation: number;
  installment_amount: string | number;
  total_installments: number;
  frequency: string;
  payments_made: number;
  total_amount_paid: string | number;
  tokens_released: number;
  next_payment_date: string;
  completion_date?: string | null;
  status: string;
  graduated_release: boolean;
  remaining_amount: string | number;
  remaining_payments: number;
  completion_percentage: string | number;
  tokens_pending_release: number;
  is_completed: boolean;
  is_active: boolean;
}

export interface PayInstallmentResult {
  success: boolean;
  message: string;
  amount_paid?: number;
  tokens_released?: number;
  payment_number?: number;
  remaining_payments?: number;
  completion_percentage?: number;
}

export interface CreateInstallmentPlanPayload {
  property_investment: string;
  token_allocation: number;
  total_installments: number;
  frequency?: string;
  graduated_release?: boolean;
  notes?: string;
}

export class InstallmentService {
  private static readonly BASE = '/properties/installments';

  /** All installment plans belonging to the current investor. */
  static async getMyInstallments(): Promise<InstallmentPlan[]> {
    const res: any = await apiClient.get(`${InstallmentService.BASE}/`);
    if (Array.isArray(res)) return res;
    return res?.results ?? [];
  }

  /**
   * Pay the next due installment from the wallet. The amount is fixed by the
   * plan server-side. Throws ApiError (e.g. "Insufficient wallet balance") on 400.
   */
  static async payInstallment(id: string): Promise<PayInstallmentResult> {
    return apiClient.post(`${InstallmentService.BASE}/${id}/process-payment/`, {});
  }

  /** Full projected schedule for a plan (remaining payments). */
  static async getPaymentSchedule(id: string): Promise<any> {
    return apiClient.get(`${InstallmentService.BASE}/${id}/payment-schedule/`);
  }

  /** Create a new installment plan (used by the buy-in-instalments checkout). */
  static async createPlan(payload: CreateInstallmentPlanPayload): Promise<InstallmentPlan> {
    return apiClient.post(`${InstallmentService.BASE}/`, payload);
  }

  /** Cancel an installment plan. */
  static async cancelPlan(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${InstallmentService.BASE}/${id}/cancel/`, {});
  }
}

export default InstallmentService;
