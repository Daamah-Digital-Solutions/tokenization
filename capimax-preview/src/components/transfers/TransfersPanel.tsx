/**
 * Transfers (client round 4, extra #3): everything the user sent and received,
 * open transfers can be cancelled by the sender, and a "New transfer" button.
 * Installment shares sent to the user wait for their answer: what they take over
 * (the remaining installments of those shares) and Accept / Decline (client, Nov 2026).
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Layers, Plus, RefreshCw, Repeat } from 'lucide-react';
import { TransferService, type TransferRecord } from '../../services/transfers/TransferService';
import { NewTransferDialog } from './NewTransferDialog';
import { uiLocale } from '../../utils/locale';
import { formatMoney, formatPlanDate } from '../../utils/paymentPlan';

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
  const locale = uiLocale(i18n.language);
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(locale) : '—');

  const rows = useMemo(() => data.filter(r =>
    tab === 'all' ? true : tab === 'open' ? ['scheduled', 'waiting'].includes(r.status) : r.direction === tab), [data, tab]);

  const what = (r: TransferRecord) => r.asset === 'units'
    ? t('row.units', { count: r.units, property: r.property_title })
    : r.asset === 'plan' ? t('row.planUnits', { count: r.units, property: r.property_title })
    : `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [shown, setShown] = useState<string | null>(null);
  const answer = async (r: TransferRecord, how: 'accept' | 'decline') => {
    if (how === 'decline' && !window.confirm(t('plan.confirmDecline'))) return;
    setBusy(r.id);
    setError(null);
    try {
      await (how === 'accept' ? TransferService.accept(r.id) : TransferService.decline(r.id));
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['my-installments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    } catch (err: any) {
      setError(err?.message || t('new.errGeneric'));
    } finally {
      setBusy(null);
    }
  };

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
            const terms = !sent && r.asset === 'plan' && r.status === 'waiting' ? r.plan_terms : null;
            return (
              <div key={r.id}>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
              {terms && (
                <div className="mx-4 mb-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 p-4 text-sm">
                  <p className="flex items-start gap-2 font-semibold text-slate-900 dark:text-white">
                    <Layers className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />{t('plan.title')}
                  </p>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {t('plan.body', { payments: terms.remaining_payments, total: formatMoney(terms.remaining_total),
                                      paid: formatMoney(terms.paid_principal) })}
                  </p>
                  {terms.payment_due && <p className="mt-1 text-amber-800 dark:text-amber-300">{t('plan.due')}</p>}
                  <button onClick={() => setShown(shown === r.id ? null : r.id)} className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    {shown === r.id ? t('plan.hide') : t('plan.show')}
                  </button>
                  {shown === r.id && (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <table className="w-full text-xs">
                        <thead className="text-slate-500"><tr>
                          <th className="px-3 py-1.5 text-start font-medium">#</th>
                          <th className="px-3 py-1.5 text-start font-medium">{t('plan.colDue')}</th>
                          <th className="px-3 py-1.5 text-end font-medium">{t('plan.colAmount')}</th>
                          <th className="px-3 py-1.5 text-end font-medium">{t('plan.colFee')}</th>
                          <th className="px-3 py-1.5 text-end font-medium">{t('plan.colTotal')}</th>
                        </tr></thead>
                        <tbody>{terms.schedule.map(s => (
                          <tr key={s.number} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-1.5">{s.number}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">{formatPlanDate(s.due_date, i18n.language || 'en')}</td>
                            <td className="px-3 py-1.5 text-end">{formatMoney(s.amount)}</td>
                            <td className="px-3 py-1.5 text-end text-slate-500">{formatMoney(s.fee)}</td>
                            <td className="px-3 py-1.5 text-end font-medium">{formatMoney(s.total)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button onClick={() => answer(r, 'accept')} disabled={busy === r.id || terms.payment_due}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                      {t('plan.accept')}
                    </button>
                    <button onClick={() => answer(r, 'decline')} disabled={busy === r.id}
                            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                      {t('plan.decline')}
                    </button>
                  </div>
                </div>
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
