/**
 * Transfers between users (client round 4, extra #3 — like Capimax BRX):
 * send shares of a property or wallet balance to someone by email.
 */

import { apiClient } from '../api/ApiClient';

export type TransferStatus = 'scheduled' | 'waiting' | 'delivered' | 'cancelled' | 'expired' | 'failed' | 'declined';

/** Installment shares (asset "plan"): what the recipient takes over if they accept */
export interface PlanTerms {
  plan_units: number;
  paid_principal: string;
  remaining_principal: string;
  remaining_payments: number;
  remaining_total: string;
  payment_due: boolean;
  schedule: Array<{ number: number; kind: string; due_date: string; amount: string; fee: string; total: string }>;
}

export interface TransferRecord {
  id: string;
  reference: string;
  asset: 'units' | 'cash' | 'plan';
  status: TransferStatus;
  direction: 'sent' | 'received';
  sender_name: string;
  recipient_email: string;
  recipient_name: string;
  message: string;
  property_id: string | null;
  property_title: string | null;
  units: number;
  amount: string;
  fee_amount: string;
  deliver_on: string;
  expires_at: string | null;
  delivered_at: string | null;
  close_reason: string;
  created_at: string;
  plan_id?: string | null;
  accepted_at?: string | null;
  plan_terms?: PlanTerms | null;
}

export interface Giftable {
  properties: Array<{ property_id: string; title: string; free_units: number; unit_cost: string }>;
  balance: string;
  fee_percent: string;
  claim_days: number;
  /** Installment plans whose shares can be sent (client, Nov 2026) */
  plans?: Array<{ plan_id: string; property_id: string; title: string; plan_units: number; free_units: number;
                  payment_due: boolean; remaining_principal: string; remaining_payments: number }>;
}

export interface NewTransfer {
  asset: 'units' | 'cash' | 'plan';
  recipient_email: string;
  recipient_name?: string;
  message?: string;
  deliver_on?: string;
  property_id?: string;
  units?: number;
  amount?: number;
  plan_id?: string;
}

const asList = <T,>(res: any): T[] => (Array.isArray(res) ? res : res?.results ?? res?.data ?? []);

export const TransferService = {
  async list(): Promise<TransferRecord[]> {
    return asList<TransferRecord>(await apiClient.get('/transfers/'));
  },
  giftable(): Promise<Giftable> {
    return apiClient.get<Giftable>('/transfers/giftable/');
  },
  create(data: NewTransfer): Promise<TransferRecord> {
    return apiClient.post<TransferRecord>('/transfers/', data);
  },
  cancel(id: string): Promise<TransferRecord> {
    return apiClient.post<TransferRecord>(`/transfers/${id}/cancel/`);
  },
  /** The recipient of installment shares accepts them (and their part of the installments) or declines */
  accept(id: string): Promise<TransferRecord> {
    return apiClient.post<TransferRecord>(`/transfers/${id}/accept/`);
  },
  decline(id: string): Promise<TransferRecord> {
    return apiClient.post<TransferRecord>(`/transfers/${id}/decline/`);
  },
};

export default TransferService;
