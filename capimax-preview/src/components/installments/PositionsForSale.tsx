/**
 * Installment positions for sale (client, Nov 2026 — shown as on Capimax PropShare / BRX):
 * each position is a property card (photo, title, city, "Installment position" badge, price,
 * shares sold together, what is paid now and what is taken over). Opening it shows the whole
 * deal before buying: position value, the installments still to pay, what the seller gets,
 * the fee, and the table of the installments the buyer takes over, with a consent tick.
 * Used on the secondary market (investors) and in the liquidity market (providers, who can
 * also send a lower offer the seller accepts or declines).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, CalendarClock, Layers, Loader2, MapPin, X } from 'lucide-react';
import { PositionService, type PositionListing } from '../../services/installments/PositionService';
import { formatMoney, formatPlanDate } from '../../utils/paymentPlan';
import { useRouter } from '../../utils/router';
import { cn } from '../../utils/cn';

const n = (v: string | number | null | undefined) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** The amounts of a position at a given price per share (the asking price, or a provider's offer). */
export const positionFigures = (p: PositionListing, pricePerShare: number) => {
  const value = r2(p.units * pricePerShare);
  const cash = Math.max(0, r2(value - n(p.remaining_principal)));
  const fee = r2((cash * n(p.fee_percent)) / 100);
  const change = r2(p.units * (pricePerShare - n(p.entry_price || p.price_per_share)));
  return { value, cash, fee, total: r2(cash + fee), change };
};

const PositionImage: React.FC<{ p: PositionListing; className?: string }> = ({ p, className }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn('relative bg-gradient-to-br from-indigo-100 via-emerald-50 to-amber-50 dark:from-indigo-900/30 dark:via-emerald-900/20 dark:to-amber-900/20 overflow-hidden', className)}>
      {p.property_image && !broken ? (
        <img src={p.property_image} alt={p.property_title} className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="w-14 h-14 text-indigo-300 dark:text-indigo-700" />
        </div>
      )}
    </div>
  );
};

export const PositionCard: React.FC<{
  p: PositionListing;
  asProvider?: boolean;
  onOpen: (p: PositionListing) => void;
  onOffer?: (p: PositionListing) => void;
  onWithdrawOffer?: (p: PositionListing) => void;
}> = ({ p, asProvider, onOpen, onOffer, onWithdrawOffer }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const made = n(p.payments_made);
  const total = Math.max(1, n(p.total_payments) || made + n(p.remaining_payments));
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => onOpen(p)}
    >
      <div className="relative">
        <PositionImage p={p} className="h-44" />
        <span className="absolute top-3 start-3 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />{t('positions.card.badge')}
        </span>
        {p.property_category && (
          <span className="absolute top-3 end-3 px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
            {t(`positions.card.category.${p.property_category}`, { defaultValue: '' })}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-1">{p.property_title}</h3>
          {p.property_city && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4 me-1" />{p.property_city}{p.property_country ? `, ${p.property_country}` : ''}
            </div>
          )}
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('positions.card.shares')}</dt>
            <dd className="font-semibold text-gray-900 dark:text-white">{t('positions.sharesCount', { count: p.units })}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('positions.card.pricePerShare')}</dt>
            <dd className="font-bold text-lg text-gray-900 dark:text-white">{formatMoney(p.price_per_share)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('positions.card.payNow')}</dt>
            <dd className="font-semibold text-indigo-700 dark:text-indigo-300">{formatMoney(p.buyer_total)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">{t('positions.card.then', { count: p.remaining_payments })}</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{formatMoney(p.remaining_total || p.remaining_principal)}</dd></div>
        </dl>
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('positions.card.progress', { made, total })}</span>
            {p.next_payment_date && (
              <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />
                {t('positions.card.next', { date: formatPlanDate(p.next_payment_date, lang) })}</span>
            )}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (made / total) * 100)}%` }} />
          </div>
        </div>
        {asProvider && p.my_offer && (
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {t('positions.yourOffer', { price: formatMoney(p.my_offer.price_per_share), cash: formatMoney(p.my_offer.cash) })}
          </p>
        )}
        <div className="mt-auto flex gap-2 flex-wrap pt-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onOpen(p)}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
            {t('positions.card.view')}
          </button>
          {asProvider && onOffer && (
            <button onClick={() => onOffer(p)}
                    className="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300 text-sm font-medium">
              {p.my_offer ? t('positions.changeOffer') : t('positions.makeOffer')}
            </button>
          )}
          {asProvider && p.my_offer && onWithdrawOffer && (
            <button onClick={() => onWithdrawOffer(p)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">
              {t('positions.withdrawOffer')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** The whole deal before buying (or before sending an offer). */
export const PositionDealDialog: React.FC<{
  p: PositionListing;
  mode: 'buy' | 'offer';
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onBuy: (p: PositionListing) => void;
  onOffer: (p: PositionListing, price: number, notes: string) => void;
}> = ({ p, mode, busy, error, onClose, onBuy, onOffer }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const { navigate } = useRouter();
  const [offerPrice, setOfferPrice] = useState(n(p.my_offer?.price_per_share || p.price_per_share).toFixed(2));
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const price = mode === 'offer' ? n(offerPrice) : n(p.price_per_share);
  const fig = mode === 'offer' ? positionFigures(p, price)
    : { value: n(p.position_value), cash: n(p.cash), fee: n(p.fee), total: n(p.buyer_total), change: n(p.price_change) };
  const schedule = p.schedule || [];
  const remainingTotal = n(p.remaining_total || p.remaining_principal);
  const signedMoney = (v: number) => `${v >= 0 ? '+' : '−'} ${formatMoney(Math.abs(v))}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
           className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex gap-4 p-5 border-b border-gray-100 dark:border-gray-800">
          <PositionImage p={p} className="w-24 h-20 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <Layers className="w-3 h-3" />{t('positions.card.badge')}
            </span>
            <h3 className="mt-1 font-bold text-gray-900 dark:text-white">
              {mode === 'offer' ? t('positions.offerTitle') : t('positions.detail.title', { title: p.property_title })}
            </h3>
            <button onClick={() => navigate('property-detail' as any, { id: p.property_id })}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              {p.property_title}{p.property_city ? ` · ${p.property_city}` : ''} — {t('positions.detail.seeProperty')}
            </button>
          </div>
          <button onClick={onClose} aria-label={t('positions.close')} className="self-start p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('positions.detail.intro', { units: p.units })}</p>

          {mode === 'offer' && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('positions.offerPrice')}
              <input type="number" min={0.01} step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
                     className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <span className="text-xs text-gray-500">{t('positions.askedPrice', { price: formatMoney(p.price_per_share) })}</span>
            </label>
          )}

          {/* 1. The position */}
          <section className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">{t('positions.detail.positionValue', { units: p.units, price: formatMoney(price) })}</dt><dd>{formatMoney(fig.value)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">{t('positions.detail.stillToPay')}</dt><dd dir="ltr">− {formatMoney(p.remaining_principal)}</dd></div>
              <div className="flex justify-between gap-3 font-semibold border-t border-gray-200 dark:border-gray-700 pt-1.5"><dt>{t('positions.detail.sellerGets')}</dt><dd>{formatMoney(fig.cash)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('positions.detail.breakdown', { paid: formatMoney(p.paid_principal), change: `\u2066${signedMoney(fig.change)}\u2069` })}
            </p>
          </section>

          {/* 2. What leaves the wallet now */}
          <section className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 mb-2">{t('positions.detail.walletNow')}</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">{t('positions.detail.toSeller')}</dt><dd>{formatMoney(fig.cash)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">{t('positions.detail.fee', { pct: n(p.fee_percent) })}</dt><dd>{formatMoney(fig.fee)}</dd></div>
              <div className="flex justify-between gap-3 font-bold text-base border-t border-gray-100 dark:border-gray-800 pt-1.5"><dt>{t('positions.detail.totalNow')}</dt><dd className="text-indigo-700 dark:text-indigo-300">{formatMoney(fig.total)}</dd></div>
            </dl>
          </section>

          {/* 3. The installments taken over */}
          <section>
            <h4 className="font-semibold text-gray-900 dark:text-white">{t('positions.detail.takeOverTitle', { count: p.remaining_payments })}</h4>
            {n(p.overdue_count) > 0 && (
              <p className="mt-2 flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{t('positions.detail.overdue', { count: n(p.overdue_count) })}
              </p>
            )}
            <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t('positions.detail.colNo')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('positions.detail.colDue')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('positions.detail.colAmount')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('positions.detail.colFee')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('positions.detail.colTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.number} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{row.number}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatPlanDate(row.due_date, lang)}
                        {row.status !== 'upcoming' && (
                          <span className="ms-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            {t(`positions.detail.status.${row.status}`)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-end">{formatMoney(row.amount)}</td>
                      <td className="px-3 py-2 text-end text-gray-500">{formatMoney(row.fee)}</td>
                      <td className="px-3 py-2 text-end font-medium">{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700 font-semibold">
                    <td className="px-3 py-2" colSpan={4}>{t('positions.detail.totalStill')}</td>
                    <td className="px-3 py-2 text-end">{formatMoney(remainingTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('positions.detail.autoCharge')}</p>
          </section>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('positions.youGet', { units: p.units, value: formatMoney(fig.value) })}
          </p>

          {mode === 'offer' ? (
            <>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('positions.notes')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500">{t('positions.offerNote')}</p>
            </>
          ) : (
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>{t('positions.detail.consent', { count: p.remaining_payments, total: formatMoney(remainingTotal) })}</span>
            </label>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">{t('positions.cancel')}</button>
            <button
              disabled={busy || (mode === 'buy' ? !agreed : fig.cash <= 0)}
              onClick={() => (mode === 'buy' ? onBuy(p) : onOffer(p, price, notes))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'buy' ? t('positions.detail.pay', { amount: formatMoney(fig.total) }) : t('positions.sendOffer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PositionsForSale: React.FC<{ asProvider?: boolean; hideWhenEmpty?: boolean }> = ({
  asProvider = false, hideWhenEmpty = false,
}) => {
  const { t } = useTranslation('plan');
  const queryClient = useQueryClient();
  const channel = asProvider ? 'providers' : 'market';
  const q = useQuery({ queryKey: ['positions-market', channel], queryFn: () => PositionService.market(channel),
                       refetchInterval: 60000 });
  const [open, setOpen] = useState<{ p: PositionListing; mode: 'buy' | 'offer' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const rows = q.data || [];
  // Hidden when nothing is for sale — but not before the buyer sees the result of their purchase
  if (hideWhenEmpty && !q.isLoading && rows.length === 0 && !done) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['positions-market'] });
    queryClient.invalidateQueries({ queryKey: ['my-installments'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    queryClient.invalidateQueries({ queryKey: ['lp'] });
  };
  const close = () => { setOpen(null); setError(null); };
  const show = (p: PositionListing, mode: 'buy' | 'offer') => { setDone(null); setError(null); setOpen({ p, mode }); };

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

  const sendOffer = async (p: PositionListing, price: number, notes: string) => {
    setBusy(true);
    setError(null);
    try {
      await PositionService.offer(p.id, price, notes);
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

  return (
    <section>
      <div className="flex items-start gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('positions.marketTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{asProvider ? t('positions.marketDescProvider') : t('positions.marketDesc')}</p>
        </div>
      </div>
      {done && <p role="status" className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{done}</p>}
      {q.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto my-8 text-gray-400" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          {t('positions.marketEmpty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rows.map((p) => (
            <PositionCard key={p.id} p={p} asProvider={asProvider}
                          onOpen={(x) => show(x, 'buy')} onOffer={(x) => show(x, 'offer')} onWithdrawOffer={withdraw} />
          ))}
        </div>
      )}

      {open && (
        <PositionDealDialog p={open.p} mode={open.mode} busy={busy} error={error}
                            onClose={close} onBuy={buy} onOffer={sendOffer} />
      )}
    </section>
  );
};

export default PositionsForSale;
