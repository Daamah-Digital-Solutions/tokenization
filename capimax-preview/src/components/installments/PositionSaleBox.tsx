/**
 * The seller's side of an installment position (client, Nov 2026 — as on Capimax BRX): the
 * plan valued as ONE position at today's share price, the holder's share of it and their
 * gain, and "Sell this position". The buyer takes over the remaining installments. While it
 * is for sale: the asking price, liquidity providers' offers (accept / decline) and withdraw.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, Loader2, X, TrendingUp, TrendingDown } from 'lucide-react';
import { PositionService, type PlanPosition } from '../../services/installments/PositionService';
import { ChannelChoice, PositionSellForm } from './PositionSellForm';
import { formatMoney } from '../../utils/paymentPlan';

const n = (v: string | number | null | undefined) => Number(v) || 0;

export const PositionSaleBox: React.FC<{
  planId: string;
  position: PlanPosition;
  /** The plan leaves this holder (sold): the message is shown by the page, this card disappears */
  onSold?: (message: string) => void;
}> = ({ planId, position, onSold }) => {
  const { t, i18n } = useTranslation('plan');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language);

  const listing = position.listing;
  const gain = n(position.gain);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-installments'] });
    queryClient.invalidateQueries({ queryKey: ['positions-market'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
  };

  const run = async (key: string, fn: () => Promise<unknown>, ok: string, sold = false) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      if (sold && onSold) onSold(ok);
      else setMessage({ ok: true, text: ok });
      setOpen(false);
      refresh();
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || t('positions.failed') });
    } finally {
      setBusy(null);
    }
  };

  // Fully paid plans are ordinary shares: nothing to show here
  if (position.blocked === 'fully_paid' || position.blocked === 'not_active') return null;

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-900/10 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('positions.title')}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
          {gain >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {t('positions.gain', { amount: formatMoney(gain), price: formatMoney(position.entry_price) })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-3">
        <div>
          <div className="text-xs text-gray-400">{t('positions.valueToday', { price: formatMoney(position.current_price) })}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{formatMoney(position.value)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">{t('positions.stillToPay')}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{formatMoney(position.remaining_principal)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">{t('positions.yourShare')}</div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-300">{formatMoney(position.equity)}</div>
        </div>
      </div>

      {message && <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">{message.text}</p>}

      {listing ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/40 p-3">
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {t('positions.forSaleUnits', { units: listing.offered_units ?? listing.units,
                                             price: formatMoney(listing.price_per_share), cash: formatMoney(listing.cash) })}
            </span>
            <button disabled={!!busy} onClick={() => run('cancel', () => PositionService.cancel(listing.id), t('positions.withdrawn'))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50">
              {busy === 'cancel' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('positions.withdraw')}
            </button>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900/40 p-3">
            <ChannelChoice
              toMarket={listing.to_market !== false}
              toProviders={listing.to_providers !== false}
              disabled={!!busy}
              onChange={(next) => {
                if (!next.toMarket && !next.toProviders) return;
                if (listing.to_providers !== false && !next.toProviders && (listing.offers || []).some((o) => o.live)
                    && !window.confirm(t('positions.confirmDropProviders'))) return;
                run('channels', () => PositionService.channels(listing.id, next), t('positions.channelsSaved'));
              }}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{t('positions.offersTitle')}</p>
            {listing.to_providers === false ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('positions.noProviders')}</p>
            ) : (listing.offers || []).filter((o) => o.live).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('positions.noOffers')}</p>
            ) : (
              <ul className="space-y-2">
                {(listing.offers || []).filter((o) => o.live).map((o) => (
                  <li key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white">{o.lp_name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {t('positions.offerLineUnits', { units: o.units ?? listing.units, price: formatMoney(o.price_per_share),
                                                         cash: formatMoney(o.cash), date: when(o.expires_at) })}
                      </span>
                      {o.notes && <span className="block text-xs text-gray-500">“{o.notes}”</span>}
                    </div>
                    <div className="flex gap-2">
                      <button disabled={!!busy}
                              onClick={() => window.confirm(t('positions.confirmAccept', { cash: formatMoney(o.cash) })) &&
                                run(o.id, () => PositionService.answer(listing.id, o.id, 'accept'), t('positions.sold'), true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                        {busy === o.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('positions.accept')}
                      </button>
                      <button disabled={!!busy} onClick={() => run(`d${o.id}`, () => PositionService.answer(listing.id, o.id, 'decline'), t('positions.declined'))}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50">
                        {t('positions.decline')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : position.blocked ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t(`positions.blocked.${position.blocked}`)}</p>
      ) : (position.free_units ?? 1) < 1 ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('positions.allInTransfer')}</p>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
            {t('positions.howPart')}
            {n(position.in_transfer) > 0 && <> {t('positions.inTransfer', { units: n(position.in_transfer) })}</>}
          </p>
          <button onClick={() => { setMessage(null); setOpen(true); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2">
            <Layers className="w-4 h-4" />{t('positions.sell')}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('positions.sell')} onClick={(e) => e.stopPropagation()}
               className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">{t('positions.sell')}</h3>
              <button onClick={() => setOpen(false)} aria-label={t('positions.close')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <PositionSellForm planId={planId} position={position} onCancel={() => setOpen(false)}
                              onListed={(msg) => { setOpen(false); setMessage({ ok: true, text: msg }); refresh(); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionSaleBox;
