/**
 * Withdrawals the PropShare way — to SAVED accounts only — and a receipt for
 * every wallet ledger row.
 *
 *   GET/POST     /payments/payout-accounts/
 *   PATCH/DELETE /payments/payout-accounts/<id>/
 *   GET/POST     /payments/withdrawals/                (POST takes an Idempotency-Key)
 *   GET          /payments/wallet/transactions/          (ledger)
 *   GET          /payments/wallet/transactions/<id>/receipt/
 */

import { apiClient } from '../api/ApiClient';

export type PayoutKind = 'bank' | 'crypto';

export interface PayoutAccount {
  id: string;
  kind: PayoutKind;
  label: string;
  display: string;
  is_default: boolean;
  created_at: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  routing_number?: string;
  swift_code?: string;
  bank_country?: string;
  currency?: string;
  crypto_asset?: string;
  crypto_network?: string;
  crypto_address?: string;
  crypto_memo?: string;
}

export interface WithdrawalRequest {
  id: string;
  reference: string | null;
  amount: string;
  currency: string;
  withdrawal_method: PayoutKind;
  destination_label: string;
  status: string;
  transfer_reference: string;
  failure_reason: string;
  review_note: string;
  created_at: string;
  completed_at: string | null;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  crypto_asset: string;
  crypto_network: string;
  crypto_address: string;
}

export interface LedgerRow {
  id: string;
  transaction_type: string;
  amount: string;
  currency: string;
  balance_before: string;
  balance_after: string;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export interface WalletReceipt {
  number: string;
  id: string;
  type: string;
  amount: string;
  currency: string;
  balance_before: string;
  balance_after: string;
  description: string;
  created_at: string;
  reference_id: string | null;
  holder: { name: string; email: string; account_id: string };
  related: {
    kind?: 'withdrawal' | 'payment' | 'investment';
    reference?: string;
    destination?: string;
    status?: string;
    transfer_reference?: string;
    payment_method?: string;
    property?: string;
    shares?: number;
  };
}

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class PayoutService {
  static async accounts(): Promise<PayoutAccount[]> {
    const res = await apiClient.get<{ accounts: PayoutAccount[] }>('/payments/payout-accounts/');
    return res?.accounts ?? [];
  }

  static addAccount(body: Partial<PayoutAccount> & { kind: PayoutKind }): Promise<PayoutAccount> {
    return apiClient.post('/payments/payout-accounts/', body);
  }

  static makeDefault(id: string): Promise<PayoutAccount> {
    return apiClient.patch(`/payments/payout-accounts/${id}/`, { is_default: true });
  }

  static removeAccount(id: string): Promise<unknown> {
    return apiClient.delete(`/payments/payout-accounts/${id}/`);
  }

  static withdraw(payoutAccountId: string, amount: number, idempotencyKey: string, notes = ''): Promise<WithdrawalRequest> {
    return apiClient.post(
      '/payments/withdrawals/',
      { payout_account_id: payoutAccountId, amount, notes },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  static async withdrawals(): Promise<WithdrawalRequest[]> {
    const res = await apiClient.get<{ requests: WithdrawalRequest[] }>('/payments/withdrawals/');
    return res?.requests ?? [];
  }

  static async ledger(page = 1, pageSize = 10): Promise<{ rows: LedgerRow[]; totalPages: number }> {
    const res = await apiClient.get<{ transactions: LedgerRow[]; pagination: { total_pages: number } }>(
      '/payments/wallet/transactions/', { page, page_size: pageSize });
    return { rows: res?.transactions ?? [], totalPages: res?.pagination?.total_pages ?? 1 };
  }

  static receipt(id: string): Promise<WalletReceipt> {
    return apiClient.get(`/payments/wallet/transactions/${id}/receipt/`);
  }

  static newIdempotencyKey = newKey;
}

export default PayoutService;
