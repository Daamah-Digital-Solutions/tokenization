import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/ApiClient';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';

interface WithdrawalRequest {
  id: string;
  amount: string;
  currency: string;
  withdrawal_method?: 'bank' | 'crypto';
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  crypto_asset?: string;
  crypto_network?: string;
  crypto_address?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  review_note: string;
  created_at: string;
  completed_at: string | null;
}

const WITHDRAWAL_STATUS_COPY: Record<WithdrawalRequest['status'], { label: string; tone: string; help: string }> = {
  pending:    { label: 'Pending Review',  tone: 'bg-amber-50 text-amber-800 border-amber-200',   help: 'Compliance is reviewing your request.' },
  approved:   { label: 'Approved',        tone: 'bg-blue-50 text-blue-800 border-blue-200',     help: 'Approved. Wire will be executed within 48h.' },
  processing: { label: 'Wire In Progress', tone: 'bg-blue-50 text-blue-800 border-blue-200',    help: 'Wire has been initiated — funds in transit.' },
  completed:  { label: 'Completed',       tone: 'bg-emerald-50 text-emerald-800 border-emerald-200', help: 'Funds have landed in your bank account.' },
  rejected:   { label: 'Rejected',        tone: 'bg-red-50 text-red-800 border-red-200',         help: 'Funds returned to your wallet balance.' },
  cancelled:  { label: 'Cancelled',       tone: 'bg-gray-100 text-gray-700 border-gray-200',     help: 'Cancelled before review.' },
};

export const WithdrawalRequestsSection: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet', 'withdraw-requests'],
    queryFn: async () => {
      // Backend route: GET /payments/wallet/withdraw-requests/
      const res: any = await apiClient.get('/payments/wallet/withdraw-requests/');
      const list: WithdrawalRequest[] = res?.requests ?? [];
      return list;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const requests = data ?? [];

  return (
    <Card variant="outline" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Text variant="h4" weight="semibold" className="mb-0.5">Your withdrawal requests</Text>
          <Text variant="caption" color="muted">
            Each request lists the bank account it&apos;s being sent to and where it is in the review pipeline. Pending and approved requests have already been locked from your available balance.
          </Text>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 py-6 text-center">Loading withdrawal history…</div>
      ) : error ? (
        <div className="text-sm text-red-600 py-6 text-center">Could not load your withdrawal history.</div>
      ) : requests.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          You haven&apos;t requested any withdrawals yet. Hit <strong>Withdraw</strong> above to move funds to your bank.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {requests.map((r) => {
            const copy = WITHDRAWAL_STATUS_COPY[r.status] ?? WITHDRAWAL_STATUS_COPY.pending;
            const isCrypto = r.withdrawal_method === 'crypto';
            const last4 = r.account_number && r.account_number.length > 4
              ? `…${r.account_number.slice(-4)}`
              : r.account_number || '';
            const addrShort = r.crypto_address && r.crypto_address.length > 12
              ? `${r.crypto_address.slice(0, 6)}…${r.crypto_address.slice(-4)}`
              : (r.crypto_address || '');
            const dest = isCrypto
              ? `${r.crypto_asset} · ${r.crypto_network} · ${addrShort}`
              : `${r.bank_name} ${last4}`;
            return (
              <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ${parseFloat(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      → {dest}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Requested {new Date(r.created_at).toLocaleString()}
                    {r.completed_at && ` · Completed ${new Date(r.completed_at).toLocaleString()}`}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {copy.help}
                  </div>
                  {r.status === 'rejected' && r.review_note && (
                    <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                      <strong>Compliance note:</strong> {r.review_note}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 inline-block text-xs font-semibold px-2 py-1 rounded-full border ${copy.tone}`}>
                  {copy.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
