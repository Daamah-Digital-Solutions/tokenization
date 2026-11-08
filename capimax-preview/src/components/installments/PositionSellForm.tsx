/**
 * The form to put an installment plan up for sale as one position (client, Nov 2026): the
 * asking price, what the seller receives, and WHERE it is offered — the secondary market
 * (any investor buys at the asking price) and/or the liquidity providers (they buy or send
 * an offer). Used in the Installments page and in the secondary market's "Create listing".
 * The seller can sell part of the plan's shares (client, Nov 2026): the buyer takes over their
 * part of each remaining installment and the seller's installments get smaller.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Store, Landmark } from 'lucide-react';
import { PositionService, type PlanPosition } from '../../services/installments/PositionService';
import { formatMoney } from '../../utils/paymentPlan';

const n = (v: string | number | null | undefined) => Number(v) || 0;

export const ChannelChoice: React.FC<{
  toMarket: boolean;
  toProviders: boolean;
  onChange: (next: { toMarket: boolean; toProviders: boolean }) => void;
  disabled?: boolean;
}> = ({ toMarket, toProviders, onChange, disabled }) => {
  const { t } = useTranslation('plan');
  const box = (checked: boolean) =>
    `flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
      checked ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('positions.whereTitle')}</legend>
      <label className={box(toMarket)}>
        <input type="checkbox" className="mt-1" checked={toMarket} disabled={disabled}
               onChange={(e) => onChange({ toMarket: e.target.checked, toProviders })} />
        <Store className="w-4 h-4 mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="text-sm">
          <span className="font-semibold text-gray-900 dark:text-white block">{t('positions.whereMarket')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('positions.whereMarketDesc')}</span>
        </span>
      </label>
      <label className={box(toProviders)}>
        <input type="checkbox" className="mt-1" checked={toProviders} disabled={disabled}
               onChange={(e) => onChange({ toMarket, toProviders: e.target.checked })} />
        <Landmark className="w-4 h-4 mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="text-sm">
          <span className="font-semibold text-gray-900 dark:text-white block">{t('positions.whereProviders')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('positions.whereProvidersDesc')}</span>
        </span>
      </label>
      {!toMarket && !toProviders && <p className="text-xs text-red-600">{t('positions.whereNone')}</p>}
    </fieldset>
  );
};

export const PositionSellForm: React.FC<{
  planId: string;
  position: PlanPosition;
  onCancel?: () => void;
  onListed: (message: string) => void;
}> = ({ planId, position, onCancel, onListed }) => {
  const { t } = useTranslation('plan');
  const [price, setPrice] = useState(n(position.current_price).toFixed(2));
  const free = position.free_units ?? position.units;
  const [count, setCount] = useState(free);
  const part = count < position.units;
  const dueBlocks = part && !!position.payment_due;
  const [where, setWhere] = useState({ toMarket: true, toProviders: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNum = n(price);
  const value = count * priceNum;
  // Their part of what is still to pay (the server splits it to the cent)
  const remaining = Math.round((n(position.remaining_principal) * count) / Math.max(1, position.units) * 100) / 100;
  const cash = Math.max(0, Math.round((value - remaining) * 100) / 100);
  const fee = Math.round(cash * n(position.fee_percent)) / 100;
  const noChannel = !where.toMarket && !where.toProviders;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await PositionService.list(planId, priceNum, where, undefined, count);
      onListed(t(where.toMarket && where.toProviders ? 'positions.listedBoth'
        : where.toMarket ? 'positions.listedMarket' : 'positions.listedProviders'));
    } catch (err: any) {
      setError(err?.message || t('positions.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('positions.introPart', { units: position.units })}</p>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('positions.howMany')}
        <div className="mt-1 flex items-center gap-2">
          <input type="number" min={1} max={free} value={count}
                 onChange={(e) => setCount(Math.max(1, Math.min(free, Math.floor(Number(e.target.value)) || 1)))}
                 className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <span className="text-xs text-gray-500">{t('positions.ofFree', { units: free })}</span>
          {count !== free && (
            <button type="button" onClick={() => setCount(free)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('positions.detail.all', { units: free })}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500 block mt-1">
          {part ? t('positions.partKeep', { keep: position.units - count }) : t('positions.wholeGoes')}
          {' '}{t('positions.buyersPart')}
        </span>
      </label>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('positions.askPrice')}
        <input type="number" min={0.01} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
               className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        <span className="text-xs text-gray-500">{t('positions.floor', { price: formatMoney(position.floor_price), current: formatMoney(position.current_price) })}</span>
      </label>
      <dl className="mt-4 space-y-1.5 text-sm">
        {[
          [t('positions.positionValue', { units: count }), formatMoney(value)],
          [t(part ? 'positions.stillToPayPart' : 'positions.stillToPay'), `− ${formatMoney(remaining)}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between"><dt className="text-gray-500">{k}</dt><dd>{v}</dd></div>
        ))}
        <div className="flex justify-between font-semibold border-t border-gray-100 dark:border-gray-800 pt-1.5">
          <dt>{t('positions.youReceive')}</dt><dd className="text-emerald-700 dark:text-emerald-400">{formatMoney(cash)}</dd>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <dt>{t('positions.buyerFee', { pct: n(position.fee_percent) })}</dt><dd>{formatMoney(fee)}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <ChannelChoice toMarket={where.toMarket} toProviders={where.toProviders} onChange={setWhere} />
      </div>
      {cash <= 0 && <p className="mt-2 text-sm text-red-600">{t('positions.blocked.below_remaining')}</p>}
      {dueBlocks && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{t('positions.partDue')}</p>}
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium">
            {t('positions.cancel')}
          </button>
        )}
        <button disabled={busy || cash <= 0 || noChannel || dueBlocks || free < 1} onClick={submit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('positions.putForSale')}
        </button>
      </div>
    </div>
  );
};

export default PositionSellForm;
