/**
 * Transfers between users (client round 4, extra #3 — like Capimax BRX):
 * send shares of a property or wallet balance to someone by email.
 */

import { apiClient } from '../api/ApiClient';

export type TransferStatus = 'scheduled' | 'waiting' | 'delivered' | 'cancelled' | 'expired' | 'failed';

export interface TransferRecord {
  id: string;
  reference: string;
  asset: 'units' | 'cash';
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
}

export interface Giftable {
  properties: Array<{ property_id: string; title: string; free_units: number; unit_cost: string }>;
  balance: string;
  fee_percent: string;
  claim_days: number;
}

export interface NewTransfer {
  asset: 'units' | 'cash';
  recipient_email: string;
  recipient_name?: string;
  message?: string;
  deliver_on?: string;
  property_id?: string;
  units?: number;
  amount?: number;
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
};

export default TransferService;
