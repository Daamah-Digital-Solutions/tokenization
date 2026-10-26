import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2 } from 'lucide-react';
import { PayoutService, type LedgerRow } from '../../services/wallet/PayoutService';
import { cn } from '../../utils/cn';

/** Every movement of the wallet, newest first, each with its numbered receipt (PropShare model). */
export const WalletLedger: React.FC = () => {
  const { t, i18n } = useTranslation('payments');
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB';

  const { data, isLoading } = useQuery({
    queryKey: ['wallet-ledger', pages],
    queryFn: () => PayoutService.ledger(1, pages * 10),
    refetchInterval: 60_000,
  });
  const rows: LedgerRow[] = data?.rows ?? [];
  const more = (data?.totalPages ?? 1) > 1;

  const receipt = async (row: LedgerRow) => {
    setBusy(row.id);
    setError(null);
    try {
      const [data, { downloadWalletReceiptPdf }] = await Promise.all([
        PayoutService.receipt(row.id),
        import('../../utils/pdf/walletReceipt'),
      ]);
      await downloadWalletReceiptPdf(data, i18n.language || 'en');
    } catch (e) {
      console.error('Receipt failed:', e);
      setError(t('ledger.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5" data-testid="wallet-ledger">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-0.5">{t('ledger.title')}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('ledger.subtitle')}</p>
      {error && <div className="text-sm text-red-600 mb-2" role="alert">{error}</div>}
      {isLoading ? (
        <div className="text-sm text-slate-500 py-6 text-center">{t('ledger.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{t('ledger.empty')}</div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((row) => {
            const amount = Number(row.amount);
            return (
              <div key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {t(`ledger.types.${row.transaction_type}`, { defaultValue: row.transaction_type })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {new Date(row.created_at).toLocaleString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {row.description ? ` · ${row.description}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn('text-sm font-semibold tabular-nums', amount < 0 ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-600 dark:text-emerald-400')} dir="ltr">
                    {amount < 0 ? '−' : '+'}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => receipt(row)}
                    disabled={busy === row.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {busy === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    {t('ledger.receipt')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {more && (
        <button type="button" onClick={() => setPages((p) => p + 1)} className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          {t('ledger.more')}
        </button>
      )}
    </section>
  );
};

export default WalletLedger;
