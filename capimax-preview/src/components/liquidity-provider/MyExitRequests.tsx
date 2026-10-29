/**
 * The investor's sales to liquidity providers (client round 4, #13): status,
 * the LP's offer, and accept / decline / withdraw. Shown on My Properties
 * whenever there is at least one request.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Droplets, Loader2 } from 'lucide-react';
import { LiquidityProviderService, type InvestorExitRequest } from '../../services/liquidity-provider/LiquidityProviderService';
import { uiLocale } from '../../utils/locale';

const money = (v: string | number | null | undefined) =>
  `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  under_review: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export const MyExitRequests: React.FC = () => {
  const { t, i18n } = useTranslation('market');
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ['my-exit-requests'],
    queryFn: () => LiquidityProviderService.myExitRequests(),
    refetchOnMount: 'always',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const dateLocale = uiLocale(i18n.language);

  if (!data.length) return null;

  const act = async (r: InvestorExitRequest, action: 'accept' | 'decline' | 'cancel') => {
    if (action === 'accept' && !window.confirm(t('lpSell.confirmAccept', { amount: money(r.total_offered_amount) }))) return;
    setBusy(r.id);
    setMessage(null);
    try {
      await LiquidityProviderService.answer(r.id, action);
      setMessage({ id: r.id, ok: true, text: action === 'accept' ? t('lpSell.accepted') : t('lpSell.updated') });
      queryClient.invalidateQueries({ queryKey: ['my-exit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties-bookkeeping'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    } catch (err: any) {
      setMessage({ id: r.id, ok: false, text: err?.message || t('lpSell.errGeneric') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-3">
        <Droplets className="w-5 h-5 text-blue-600" />{t('lpSell.myRequests')}
      </h3>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {data.map(r => {
          const open = ['pending', 'under_review'].includes(r.status);
          const offer = r.status === 'approved';
          return (
            <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{r.property_name} · {r.lp_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('lpSell.line', { units: r.units_requested, price: money(r.requested_price_per_unit) })}
                  {offer && <> · <strong className="text-blue-700 dark:text-blue-300">{t('lpSell.offer', { price: money(r.offered_price_per_unit), total: money(r.total_offered_amount) })}</strong></>}
                  {offer && r.expires_at && <> · {t('lpSell.until', { date: new Date(r.expires_at).toLocaleString(dateLocale) })}</>}
                </p>
                {r.lp_notes && <p className="text-xs text-slate-500 mt-0.5">“{r.lp_notes}”</p>}
                {message?.id === r.id && (
                  <p className={`text-xs mt-1 ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
                )}
              </div>
              <span className={`self-start sm:self-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {t(`lpSell.status.${r.status}`, { defaultValue: r.status })}
              </span>
              <div className="flex gap-2">
                {busy === r.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-center" />}
                {offer && (
                  <>
                    <button disabled={!!busy} onClick={() => act(r, 'accept')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                      {t('lpSell.accept')}
                    </button>
                    <button disabled={!!busy} onClick={() => act(r, 'decline')}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                      {t('lpSell.decline')}
                    </button>
                  </>
                )}
                {open && (
                  <button disabled={!!busy} onClick={() => act(r, 'cancel')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                    {t('lpSell.withdraw')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyExitRequests;
