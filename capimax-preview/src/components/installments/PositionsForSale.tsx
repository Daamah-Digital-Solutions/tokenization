/**
 * Installment positions for sale (client, Nov 2026 — as on Capimax BRX), for a buyer: what
 * it costs now (the seller's share + the resale fee) and what is taken over (the remaining
 * installments). Shown on the secondary market for investors, and in the liquidity market
 * for providers, who can also send a lower offer the seller accepts or declines.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Loader2, X, CalendarClock } from 'lucide-react';
import { PositionService, type PositionListing } from '../../services/installments/PositionService';
import { formatMoney, formatPlanDate } from '../../utils/paymentPlan';
import { useRouter } from '../../utils/router';

const n = (v: string | number | null | undefined) => Number(v) || 0;

export const PositionsForSale: React.FC<{ asProvider?: boolean; hideWhenEmpty?: boolean }> = ({
  asProvider = false, hideWhenEmpty = false,
}) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const queryClient = useQueryClient();
  const { navigate } = useRouter();
  const channel = asProvider ? 'providers' : 'market';
  const q = useQuery({ queryKey: ['positions-market', channel], queryFn: () => PositionService.market(channel),
                       refetchInterval: 60000 });
  const [buying, setBuying] = useState<PositionListing | null>(null);
  const [offering, setOffering] = useState<PositionListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [notes, setNotes] = useState('');

  const rows = q.data || [];
  // Hidden when nothing is for sale — but not before the buyer sees the result of their purchase
  if (hideWhenEmpty && !q.isLoading && rows.length === 0 && !done) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['positions-market'] });
    queryClient.invalidateQueries({ queryKey: ['my-installments'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    queryClient.invalidateQueries({ queryKey: ['lp'] });
  };

  const close = () => { setBuying(null); setOffering(null); setError(null); };

  const buy = async (p: PositionListing) => {
    setBusy(true);
    setError(null);
    try {
      await PositionService.buy(p.id, p.cash, p.fee);
      setDone(t('positions.bought'));
      close();
      refresh();
    } catch (err: any) {
      // The amounts moved (an installment was paid): reload, close, and let the buyer look again
      if (err?.details?.code === 'POSITION_CHANGED') {
        refresh();
        close();
        setDone(t('positions.changed'));
        return;
      }
      setError(err?.message || t('positions.failed'));
    } finally {
      setBusy(false);
    }
  };

  const sendOffer = async (p: PositionListing) => {
    setBusy(true);
    setError(null);
    try {
      await PositionService.offer(p.id, n(offerPrice), notes);
      setDone(t('positions.offerSent'));
      close();
      refresh();
    } catch (err: any) {
      setError(err?.message || t('positions.failed'));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (p: PositionListing) => {
    try {
      await PositionService.withdrawOffer(p.id);
      setDone(t('positions.offerWithdrawn'));
      refresh();
    } catch (err: any) {
      setDone(err?.message || t('positions.failed'));
    }
  };

  const offerCash = offering ? Math.max(0, Math.round((offering.units * n(offerPrice) - n(offering.remaining_principal)) * 100) / 100) : 0;
  const offerFee = offering ? Math.round(offerCash * n(offering.fee_percent)) / 100 : 0;

  return (
    <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-slate-800">
      <div className="p-5 border-b border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('positions.marketTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{asProvider ? t('positions.marketDescProvider') : t('positions.marketDesc')}</p>
        </div>
      </div>
      {done && <p role="status" className="mx-5 mt-4 text-sm text-emerald-700 dark:text-emerald-400">{done}</p>}
      <div className="p-2 sm:p-4">
        {q.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto my-8 text-gray-400" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('positions.marketEmpty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {rows.map((p) => (
              <li key={p.id} className="py-4 px-2 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate('property-detail' as any, { id: p.property_id })}
                          className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 text-start">
                    {p.property_title}{p.property_city ? <span className="font-normal text-gray-500"> · {p.property_city}</span> : null}
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('positions.rowLine', { units: t('positions.sharesCount', { count: p.units }), price: formatMoney(p.price_per_share), now: formatMoney(p.buyer_total) })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {t('positions.takeOver', { count: p.remaining_payments, amount: formatMoney(p.remaining_principal),
                      date: p.next_payment_date ? formatPlanDate(p.next_payment_date, lang) : '—' })}
                  </p>
                  {asProvider && p.my_offer && (
                    <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                      {t('positions.yourOffer', { price: formatMoney(p.my_offer.price_per_share), cash: formatMoney(p.my_offer.cash) })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {asProvider && p.my_offer && (
                    <button onClick={() => withdraw(p)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">
                      {t('positions.withdrawOffer')}
                    </button>
                  )}
                  {asProvider && (
                    <button onClick={() => { setDone(null); setOfferPrice(n(p.my_offer?.price_per_share || p.price_per_share).toFixed(2)); setNotes(''); setOffering(p); }}
                            className="px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300 text-sm font-medium">
                      {p.my_offer ? t('positions.changeOffer') : t('positions.makeOffer')}
                    </button>
                  )}
                  <button onClick={() => { setDone(null); setBuying(p); }}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                    {t('positions.buy')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(buying || offering) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={close}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
               className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6">
            {(() => {
              const p = (buying || offering)!;
              return (
                <>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{buying ? t('positions.buyTitle') : t('positions.offerTitle')}</h3>
                      <p className="text-xs text-gray-500">{p.property_title} · {t('positions.sharesCount', { count: p.units })}</p>
                    </div>
                    <button onClick={close} aria-label={t('positions.close')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {offering && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('positions.offerPrice')}
                      <input type="number" min={0.01} step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
                             className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
                      <span className="text-xs text-gray-500">{t('positions.askedPrice', { price: formatMoney(p.price_per_share) })}</span>
                    </label>
                  )}
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('positions.payNow')}</p>
                  <dl className="mt-1 space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">{t('positions.toSeller')}</dt><dd>{formatMoney(offering ? offerCash : p.cash)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">{t('positions.buyerFee', { pct: n(p.fee_percent) })}</dt><dd>{formatMoney(offering ? offerFee : p.fee)}</dd></div>
                    <div className="flex justify-between font-semibold border-t border-gray-100 dark:border-gray-800 pt-1.5">
                      <dt>{t('positions.total')}</dt><dd>{formatMoney(offering ? offerCash + offerFee : p.buyer_total)}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs font-semibold text-gray-600 dark:text-gray-300">{t('positions.thenYouPay')}</p>
                  <dl className="mt-1 space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">{t('positions.remainingInstallments')}</dt><dd>{p.remaining_payments} · {formatMoney(p.remaining_principal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">{t('positions.nextPayment')}</dt>
                      <dd>{formatMoney(p.next_payment_amount)}{p.next_payment_date ? ` · ${formatPlanDate(p.next_payment_date, lang)}` : ''}</dd></div>
                  </dl>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {t('positions.youGet', { units: p.units, value: formatMoney(n(p.units) * n(offering ? offerPrice : p.price_per_share)) })}
                  </p>
                  {offering && <>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('positions.notes')}
                              className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
                    <p className="mt-1 text-xs text-gray-500">{t('positions.offerNote')}</p>
                  </>}
                  {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">{t('positions.cancel')}</button>
                    <button disabled={busy || (!!offering && offerCash <= 0)}
                            onClick={() => (buying ? buy(buying) : sendOffer(offering!))}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold">
                      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                      {buying ? t('positions.confirmBuy', { amount: formatMoney(p.buyer_total) }) : t('positions.sendOffer')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsForSale;
