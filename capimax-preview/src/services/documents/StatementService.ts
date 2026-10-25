/**
 * Official statements (client round 3, #16): the data behind the PDF
 * statements, from /documents/statements/<kind>/.
 */

import { apiClient } from '../api/ApiClient';

export type StatementKind = 'wallet' | 'transactions' | 'investments' | 'holdings';

export interface StatementHolder {
  name: string;
  email: string;
  account_id: string;
  kyc_status: string;
  wallet_address: string;
  member_since: string | null;
}

export interface StatementData {
  kind: StatementKind;
  holder: StatementHolder;
  period: { from: string; to: string };
  generated_at: string;
  summary: Record<string, any>;
  rows: Array<Record<string, string>>;
  plans?: Array<Record<string, string>>;
  linked?: Array<Record<string, string>>;
}

export class StatementService {
  static async get(kind: StatementKind, from?: string, to?: string): Promise<StatementData> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiClient.get(`/documents/statements/${kind}/`, params);
  }

  static async transactionsCsv(from?: string, to?: string): Promise<Blob> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return apiClient.get('/documents/statements/transactions/export/', params, { responseType: 'blob' } as any);
  }
}
