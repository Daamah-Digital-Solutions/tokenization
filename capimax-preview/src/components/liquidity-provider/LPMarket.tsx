import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Loader2, X, AlertCircle, Clock, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { baseLanguage } from '../../utils/locale';
import { Button } from '../ui/Button';
import { LiquidityProviderService, type LPExitRequest } from '../../services/liquidity-provider/LiquidityProviderService';
import { PositionsForSale } from '../installments/PositionsForSale';

/**
 * The liquidity market (client voice notes, round 5): sale requests investors
 * sent to all providers. The provider sends an offer (or a better one, or takes
 * it back); the investor accepts the best one and the sale settles from the
 * provider's wallet. Below: every offer this provider made and how it ended.
 */

const OFFER_STYLE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  withdrawn: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  lapsed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const useFormat = () => {
  const { i18n } = useTranslation();
  const locale = baseLanguage(i18n.language);
  return {
    money: (v: string | number | null | undefined) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v || 0)),
    num: (v: number | string | null | undefined) => new Intl.NumberFormat(locale).format(Number(v || 0)),
    when: (iso?: string | null) =>
      iso ? new Date(iso).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  };
};

const OfferDialog: React.FC<{ request: LPExitRequest; onClose: () => void; onDone: (msg: string) => void }> = ({
  request, onClose, onDone,
}) => {
  const { t } = useTranslation('partners');
  const f = useFormat();
  const mine = (request.offers || []).find((o) => o.status === 'open');
  const [price, setPrice] = useState(String(Number(mine?.price_per_unit || request.requested_price_per_unit)));
  const [notes, setNotes] = useState(mine?.notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceNum = Number(price);
  const total = priceNum * request.units_requested;
  const fee = (total * Number(request.resale_fee_pct || 0)) / 100;
  const sharePrice = Number(request.share_price || 0);
  const vsPrice = sharePrice > 0 && priceNum > 0 ? ((sharePrice - priceNum) / sharePrice) * 100 : null;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await LiquidityProviderService.makeOffer(request.id, priceNum, notes);
      onDone(t('lp.market.sent'));
    } catch (err: any) {
      setError(err?.message || t('lp.requests.failed'));
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={strong ? 'font-semibold' : ''}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{request.property_name}</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400">
              {t('lp.market.asking', { units: f.num(request.units_requested), price: f.money(request.requested_price_per_unit) })}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('lp.requests.cancel')} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
            {t('lp.requests.offerPrice')}
            <input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
                   className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
          {sharePrice > 0 && row(t('lp.market.sharePrice'), f.money(sharePrice))}
          {vsPrice !== null && row(t('lp.market.belowPrice'), `${vsPrice.toFixed(2)}%`)}
          {row(t('lp.requests.offerTotal'), f.money(total), true)}
          {row(t('lp.market.fee', { pct: Number(request.resale_fee_pct || 0) }), f.money(fee))}
          {row(t('lp.market.youPay'), f.money(total + fee), true)}
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
            {t('lp.requests.notes')}
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('lp.requests.notesPlaceholder')}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
          <p className="text-xs text-neutral-500 dark:text-slate-400">{t('lp.market.offerNote')}</p>
          {error && <p role="alert" className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>{t('lp.requests.cancel')}</Button>
          <Button variant="primary" className="flex-1" onClick={send} disabled={busy || !(priceNum > 0)}>
            {busy ? t('lp.requests.submitting') : mine ? t('lp.market.improve') : t('lp.market.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const LPMarket: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t } = useTranslation('partners');
  const f = useFormat();
  const queryClient = useQueryClient();
  const [offering, setOffering] = useState<LPExitRequest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const marketQ = useQuery({ queryKey: ['lp', 'market'], queryFn: LiquidityProviderService.getMarket, retry: 1, refetchInterval: 60000 });
  const offersQ = useQuery({ queryKey: ['lp', 'offers'], queryFn: LiquidityProviderService.getMyOffers, retry: 1, enabled: !compact });
  const requests = compact ? (marketQ.data || []).slice(0, 3) : marketQ.data || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lp'] });

  const withdraw = async (r: LPExitRequest) => {
    setBusy(r.id);
    try {
      await LiquidityProviderService.withdrawOffer(r.id);
      setToast({ ok: true, text: t('lp.market.withdrawn') });
      refresh();
    } catch (err: any) {
      setToast({ ok: false, text: err?.message || t('lp.requests.failed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-5 border-b border-neutral-200 dark:border-slate-700 flex flex-wrap items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <Store className="w-5 h-5 text-cyan-600" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('lp.market.title')}</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400">{t('lp.market.desc')}</p>
          </div>
        </div>
        {toast && (
          <p role="status" className={cn('mx-5 mt-4 text-sm', toast.ok ? 'text-emerald-700' : 'text-red-600')}>{toast.text}</p>
        )}
        <div className="p-2 sm:p-4">
          {marketQ.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto my-8 text-neutral-400" />
          ) : requests.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500 dark:text-slate-400">{t('lp.market.empty')}</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-slate-700">
              {requests.map((r) => {
                const mine = (r.offers || []).find((o) => o.status === 'open');
                return (
                  <li key={r.id} className="py-4 px-2 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-slate-100 truncate">
                        {r.property_name}{r.property_city ? <span className="font-normal text-neutral-500"> · {r.property_city}</span> : null}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-slate-300">
                        {t('lp.market.asking', { units: f.num(r.units_requested), price: f.money(r.requested_price_per_unit) })}
                        {' · '}<strong>{f.money(r.total_requested_amount)}</strong>
                        {r.share_price ? <span className="text-neutral-500"> · {t('lp.market.sharePriceShort', { price: f.money(r.share_price) })}</span> : null}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />{t('lp.market.closes', { date: f.when(r.expires_at) })}
                      </p>
                      {mine && (
                        <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                          {t('lp.market.yourOffer', { price: f.money(mine.price_per_unit), total: f.money(mine.total_amount), date: f.when(mine.expires_at) })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {mine && (
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => withdraw(r)}>
                          {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('lp.market.withdraw')}
                        </Button>
                      )}
                      <Button size="sm" variant="primary" onClick={() => setOffering(r)}>
                        {mine ? t('lp.market.improve') : t('lp.market.makeOffer')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Installment plans for sale as one position: buy at the asking price or send an offer */}
      <PositionsForSale asProvider hideWhenEmpty={compact} />

      {!compact && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
          <div className="p-5 border-b border-neutral-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />{t('lp.market.myOffers')}
            </h3>
          </div>
          <div className="p-2 sm:p-4 overflow-x-auto">
            {(offersQ.data || []).length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500 dark:text-slate-400">{t('lp.market.noOffers')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-200 dark:border-slate-700">
                    {['lp.requests.property', 'lp.requests.units', 'lp.requests.requestedPrice', 'lp.requests.offerPrice',
                      'lp.requests.offerTotal', 'lp.requests.status', 'lp.statement.cols.date'].map((k) => (
                      <th key={k} className="py-2 px-3 font-medium text-start whitespace-nowrap">{t(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(offersQ.data || []).map((o) => (
                    <tr key={o.id} className="border-b border-neutral-100 dark:border-slate-700/60">
                      <td className="py-3 px-3 font-medium">{o.property_name}</td>
                      <td className="py-3 px-3">{f.num(o.units_requested)}</td>
                      <td className="py-3 px-3">{f.money(o.requested_price_per_unit)}</td>
                      <td className="py-3 px-3">{f.money(o.price_per_unit)}</td>
                      <td className="py-3 px-3 font-semibold">{f.money(o.total_amount)}</td>
                      <td className="py-3 px-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', OFFER_STYLE[o.status])}>
                          {t(`lp.market.offerStatus.${o.status}`)}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{f.when(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {offering && (
        <OfferDialog
          request={offering}
          onClose={() => setOffering(null)}
          onDone={(msg) => {
            setOffering(null);
            setToast({ ok: true, text: msg });
            refresh();
          }}
        />
      )}
    </div>
  );
};

export default LPMarket;
