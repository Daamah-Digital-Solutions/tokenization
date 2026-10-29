/**
 * Transfers (client round 4, extra #3): everything the user sent and received,
 * open transfers can be cancelled by the sender, and a "New transfer" button.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw, Repeat } from 'lucide-react';
import { TransferService, type TransferRecord } from '../../services/transfers/TransferService';
import { NewTransferDialog } from './NewTransferDialog';

const STATUS_STYLE: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  waiting: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

type Tab = 'all' | 'sent' | 'received' | 'open';

export const TransfersPanel: React.FC = () => {
  const { t, i18n } = useTranslation('transfers');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transfers'], queryFn: () => TransferService.list(), refetchOnMount: 'always',
  });
  const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : undefined;
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(locale) : '—');

  const rows = useMemo(() => data.filter(r =>
    tab === 'all' ? true : tab === 'open' ? ['scheduled', 'waiting'].includes(r.status) : r.direction === tab), [data, tab]);

  const what = (r: TransferRecord) => r.asset === 'units'
    ? t('row.units', { count: r.units, property: r.property_title })
    : `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cancel = async (r: TransferRecord) => {
    if (!window.confirm(t('row.confirmCancel'))) return;
    setBusy(r.id);
    setError(null);
    try {
      await TransferService.cancel(r.id);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers-giftable'] });
    } catch (err: any) {
      setError(err?.message || t('new.errGeneric'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-emerald-600" />{t('title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={t('refresh')}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" />{t('newTransfer')}
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto">
        {(['all', 'sent', 'received', 'open'] as Tab[]).map(k => (
          <button key={k} onClick={() => setTab(k)}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${tab === k
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {isLoading ? (
        <p className="py-12 text-center text-slate-500">…</p>
      ) : !rows.length ? (
        <div className="py-14 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <Repeat className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="font-medium text-slate-700 dark:text-slate-200">{t('emptyTitle')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('emptyText')}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map(r => {
            const sent = r.direction === 'sent';
            const cancellable = sent && ['scheduled', 'waiting'].includes(r.status);
            return (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${sent ? 'bg-slate-100 dark:bg-slate-700' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                  {sent ? <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {sent ? t('row.to', { what: what(r), who: r.recipient_name || r.recipient_email })
                      : t('row.from', { what: what(r), who: r.sender_name })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono" dir="ltr">{r.reference}</span> · {t('row.date', { date: fmtDate(r.delivered_at || r.deliver_on) })}
                    {r.status === 'waiting' && r.expires_at && <> · {t('row.until', { date: fmtDate(r.expires_at) })}</>}
                    {r.close_reason && <> · {r.close_reason}</>}
                  </p>
                  {r.message && <p className="text-xs text-slate-500 mt-0.5">“{r.message}”</p>}
                </div>
                <span className={`self-start sm:self-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {t(`status.${r.status}`)}
                </span>
                {cancellable && (
                  <button onClick={() => cancel(r)} disabled={busy === r.id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 text-sm font-medium disabled:opacity-50">
                    {t('row.cancel')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && <NewTransferDialog onClose={() => setOpen(false)} />}
    </div>
  );
};

export default TransfersPanel;
