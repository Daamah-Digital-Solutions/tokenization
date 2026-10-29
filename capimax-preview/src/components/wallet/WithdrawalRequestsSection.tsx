import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/ApiClient';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { useUser } from '../../contexts/AuthContext';
import { downloadWithdrawalConfirmationPdf } from '../../utils/pdf/bankDocuments';
import { uiLocale } from '../../utils/locale';

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
  reference?: string | null;
  destination_label?: string;
  transfer_reference?: string;
  failure_reason?: string;
}

// Labels/help text live in the `payments` namespace under withdrawals.status.<key>.
const WITHDRAWAL_STATUS_COPY: Record<WithdrawalRequest['status'], { key: string; tone: string }> = {
  pending:    { key: 'pending',    tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved:   { key: 'approved',   tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  processing: { key: 'processing', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
  completed:  { key: 'completed',  tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected:   { key: 'rejected',   tone: 'bg-red-50 text-red-800 border-red-200' },
  cancelled:  { key: 'cancelled',  tone: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export const WithdrawalRequestsSection: React.FC = () => {
  const user: any = useUser();
  const { t, i18n } = useTranslation('payments');
  const dateLocale = uiLocale(i18n.language);
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
          <Text variant="h4" weight="semibold" className="mb-0.5">{t('withdrawals.title')}</Text>
          <Text variant="caption" color="muted">
            {t('withdrawals.subtitle')}
          </Text>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 py-6 text-center">{t('withdrawals.loading')}</div>
      ) : error ? (
        <div className="text-sm text-red-600 py-6 text-center">{t('withdrawals.loadError')}</div>
      ) : requests.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          {t('withdrawals.emptyBefore')}<strong>{t('withdrawals.emptyAction')}</strong>{t('withdrawals.emptyAfter')}
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {requests.map((r) => {
            // Official confirmation of the request (client round 3, #15).
            const downloadConfirmation = () =>
              downloadWithdrawalConfirmationPdf({
                holderName: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || '',
                holderEmail: user?.email,
                requestId: r.reference || r.id,
                amount: parseFloat(r.amount) || 0,
                currency: r.currency,
                method: r.withdrawal_method || 'bank',
                status: r.status,
                requestedAt: new Date(r.created_at),
                destination: r.withdrawal_method === 'crypto'
                  ? [[t('withdrawals.dest.asset'), r.crypto_asset || ''], [t('withdrawals.dest.network'), r.crypto_network || ''], [t('withdrawals.dest.address'), r.crypto_address || '']]
                  : [[t('withdrawals.dest.accountHolder'), r.account_holder_name], [t('withdrawals.dest.bank'), r.bank_name],
                     [t('withdrawals.dest.account'), r.account_number ? `…${r.account_number.slice(-4)}` : '']],
              }).catch((e) => console.error('Withdrawal PDF failed:', e));
            const copy = WITHDRAWAL_STATUS_COPY[r.status] ?? WITHDRAWAL_STATUS_COPY.pending;
            const isCrypto = r.withdrawal_method === 'crypto';
            const last4 = r.account_number && r.account_number.length > 4
              ? `…${r.account_number.slice(-4)}`
              : r.account_number || '';
            const addrShort = r.crypto_address && r.crypto_address.length > 12
              ? `${r.crypto_address.slice(0, 6)}…${r.crypto_address.slice(-4)}`
              : (r.crypto_address || '');
            const dest = r.destination_label || (isCrypto
              ? `${r.crypto_asset} · ${r.crypto_network} · ${addrShort}`
              : `${r.bank_name} ${last4}`);
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
                  {r.reference && (
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{r.reference}</div>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('withdrawals.requestedAt', { date: new Date(r.created_at).toLocaleString(dateLocale) })}
                    {r.completed_at && ` · ${t('withdrawals.completedAt', { date: new Date(r.completed_at).toLocaleString(dateLocale) })}`}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {t(`withdrawals.status.${copy.key}.help`)}
                  </div>
                  {r.status === 'completed' && r.transfer_reference && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      {t('withdrawals.transferRef', { ref: r.transfer_reference })}
                    </div>
                  )}
                  {r.status === 'rejected' && (r.failure_reason || r.review_note) && (
                    <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                      <strong>{t('withdrawals.complianceNote')}</strong> {r.failure_reason || r.review_note}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full border ${copy.tone}`}>
                    {t(`withdrawals.status.${copy.key}.label`)}
                  </span>
                  <button
                    type="button"
                    onClick={downloadConfirmation}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    title={t('withdrawals.pdfTitle')}
                  >
                    {t('withdrawals.pdf')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
