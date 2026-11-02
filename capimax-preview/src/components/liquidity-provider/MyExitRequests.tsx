/**
 * The investor's sales to liquidity providers (client round 4, #13): status,
 * the LP's offer, and accept / decline / withdraw. Shown on My Properties
 * whenever there is at least one request.
 *
 * Round 5: a request sent to all providers lists every provider's offer to
 * compare and accept; each request shows until when it waits for an answer;
 * and a request still waiting, declined or closed can be sent again to
 * another provider or to all.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Droplets, Loader2, RotateCcw, Users } from 'lucide-react';
import { LiquidityProviderService, type InvestorExitRequest, type LPOffer } from '../../services/liquidity-provider/LiquidityProviderService';
import { SellToLPModal } from './SellToLPModal';
import { uiLocale } from '../../utils/locale';

const money = (v: string | number | null | undefined) =>
  `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  under_review: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const WAITING = ['pending', 'under_review'];
// Shown with "send again": still waiting, or closed without a sale
const RESENDABLE = ['pending', 'under_review', 'rejected', 'expired', 'cancelled'];

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
  const [resending, setResending] = useState<InvestorExitRequest | null>(null);
  const dateLocale = uiLocale(i18n.language);
  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(dateLocale) : '');

  // A request already sent again is not offered again
  const resent = useMemo(() => new Set(data.map(r => r.replaces).filter(Boolean)), [data]);

  if (!data.length) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-exit-requests'] });
    queryClient.invalidateQueries({ queryKey: ['my-properties-bookkeeping'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };

  const act = async (r: InvestorExitRequest, action: 'accept' | 'decline' | 'cancel', offer?: LPOffer) => {
    const amount = offer ? offer.total_amount : r.total_offered_amount;
    if (action === 'accept' && !window.confirm(t('lpSell.confirmAccept', { amount: money(amount) }))) return;
    setBusy(offer ? offer.id : r.id);
    setMessage(null);
    try {
      await LiquidityProviderService.answer(r.id, action, offer?.id);
      setMessage({ id: r.id, ok: true, text: action === 'accept' ? t('lpSell.accepted') : t('lpSell.updated') });
      refresh();
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
          const waiting = WAITING.includes(r.status);
          const offer = r.status === 'approved';
          const liveOffers = (r.offers || []).filter(o => o.live);
          const canResend = RESENDABLE.includes(r.status) && !resent.has(r.id);
          return (
            <div key={r.id} className="py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    {r.property_name} ·{' '}
                    {r.open_to_all
                      ? <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300"><Users className="w-3.5 h-3.5" />{t('lpSell.allProviders')}</span>
                      : r.lp_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('lpSell.line', { units: r.units_requested, price: money(r.requested_price_per_unit) })}
                    {offer && <> · <strong className="text-blue-700 dark:text-blue-300">{t('lpSell.offer', { price: money(r.offered_price_per_unit), total: money(r.total_offered_amount) })}</strong></>}
                    {offer && r.expires_at && <> · {t('lpSell.until', { date: when(r.expires_at) })}</>}
                    {waiting && r.expires_at && <> · {t('lpSell.waitsUntil', { date: when(r.expires_at) })}</>}
                  </p>
                  {r.lp_notes && <p className="text-xs text-slate-500 mt-0.5">“{r.lp_notes}”</p>}
                  {message?.id === r.id && (
                    <p className={`text-xs mt-1 ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
                  )}
                </div>
                <span className={`self-start sm:self-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {r.open_to_all && waiting
                    ? t('lpSell.offersCount', { count: liveOffers.length })
                    : t(`lpSell.status.${r.status}`, { defaultValue: r.status })}
                </span>
                <div className="flex flex-wrap gap-2">
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
                  {canResend && (
                    <button disabled={!!busy} onClick={() => setResending(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 text-sm font-medium disabled:opacity-50">
                      <RotateCcw className="w-3.5 h-3.5" />{t('lpSell.resend')}
                    </button>
                  )}
                  {waiting && (
                    <button disabled={!!busy} onClick={() => act(r, 'cancel')}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                      {t('lpSell.withdraw')}
                    </button>
                  )}
                </div>
              </div>

              {r.open_to_all && waiting && (
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{t('lpSell.offersTitle')}</p>
                  {liveOffers.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('lpSell.noOffersYet')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {liveOffers.map((o, i) => (
                        <li key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-slate-900 dark:text-white">{o.lp_name}</span>
                            {i === 0 && liveOffers.length > 1 && (
                              <span className="ms-2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">{t('lpSell.bestOffer')}</span>
                            )}
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {t('lpSell.offer', { price: money(o.price_per_unit), total: money(o.total_amount) })} · {t('lpSell.until', { date: when(o.expires_at) })}
                            </span>
                            {o.notes && <span className="block text-xs text-slate-500">“{o.notes}”</span>}
                          </div>
                          <div className="flex gap-2">
                            {busy === o.id && <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-center" />}
                            <button disabled={!!busy} onClick={() => act(r, 'accept', o)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                              {t('lpSell.accept')}
                            </button>
                            <button disabled={!!busy} onClick={() => act(r, 'decline', o)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50">
                              {t('lpSell.decline')}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {resending && (
        <SellToLPModal
          propertyId={resending.property_id}
          propertyName={resending.property_name}
          availableShares={resending.units_requested}
          sharePrice={Number(resending.share_price) || Number(resending.requested_price_per_unit) || 0}
          defaultUnits={resending.units_requested}
          defaultPrice={Number(resending.requested_price_per_unit) || undefined}
          previousProviderId={resending.liquidity_provider || null}
          replaces={resending.id}
          replacesOpen={WAITING.includes(resending.status)}
          onClose={() => { setResending(null); refresh(); }}
        />
      )}
    </div>
  );
};

export default MyExitRequests;
