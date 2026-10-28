/**
 * "Sell to a liquidity provider" (client round 4, #13): the investor picks an
 * active LP, the number of shares and an asking price; the LP answers with an
 * offer the investor accepts (money + shares move) or declines.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Droplets, X, Loader2 } from 'lucide-react';
import { LiquidityProviderService } from '../../services/liquidity-provider/LiquidityProviderService';

interface Props {
  propertyId: string;
  propertyName: string;
  availableShares: number;
  sharePrice: number;
  onClose: () => void;
}

export const SellToLPModal: React.FC<Props> = ({ propertyId, propertyName, availableShares, sharePrice, onClose }) => {
  const { t } = useTranslation('market');
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ['active-lps'], queryFn: () => LiquidityProviderService.listActiveProviders() });
  const [lpId, setLpId] = useState('');
  const [units, setUnits] = useState(Math.min(availableShares, 1));
  const [price, setPrice] = useState(sharePrice ? sharePrice.toFixed(2) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const lp = useMemo(() => providers.data?.find(p => p.id === lpId), [providers.data, lpId]);
  const total = (Number(price) || 0) * (units || 0);

  const submit = async () => {
    setError(null);
    if (!lpId) return setError(t('lpSell.errChoose'));
    if (!units || units < 1 || units > availableShares) return setError(t('lpSell.errUnits', { max: availableShares }));
    if (!(Number(price) > 0)) return setError(t('lpSell.errPrice'));
    setBusy(true);
    try {
      await LiquidityProviderService.requestExit({
        property: propertyId, liquidity_provider: lpId, units_requested: units,
        requested_price_per_unit: Number(price),
      });
      queryClient.invalidateQueries({ queryKey: ['my-exit-requests'] });
      setDone(true);
    } catch (err: any) {
      const details = err?.details && typeof err.details === 'object'
        ? Object.values(err.details).flat().filter((v: any) => typeof v === 'string').join(' ') : '';
      setError(details || err?.message || t('lpSell.errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-label={t('lpSell.title')}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('lpSell.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{propertyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={t('lpSell.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="font-semibold text-slate-900 dark:text-white">{t('lpSell.sentTitle')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{t('lpSell.sentText')}</p>
            <button onClick={onClose} className="mt-5 px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold">{t('lpSell.close')}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('lpSell.intro')}</p>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lpSell.provider')}</span>
              <select value={lpId} onChange={e => setLpId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                <option value="">{providers.isLoading ? '…' : t('lpSell.choose')}</option>
                {(providers.data || []).map(p => (
                  <option key={p.id} value={p.id}>{p.legal_entity_name} — {p.country}</option>
                ))}
              </select>
              {providers.data && providers.data.length === 0 && (
                <span className="text-xs text-amber-600 mt-1 block">{t('lpSell.none')}</span>
              )}
              {lp && (
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  {t('lpSell.lpTerms', { discount: Number(lp.discount_rate).toFixed(1), max: Number(lp.max_per_transaction).toLocaleString() })}
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lpSell.units')}</span>
                <input type="number" min={1} max={availableShares} value={units}
                       onChange={e => setUnits(parseInt(e.target.value, 10) || 0)}
                       className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                <span className="text-xs text-slate-500">{t('lpSell.available', { count: availableShares })}</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lpSell.price')}</span>
                <input type="number" min={0.01} step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                       className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                <span className="text-xs text-slate-500">{t('lpSell.currentPrice', { price: sharePrice.toFixed(2) })}</span>
              </label>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3 text-sm flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">{t('lpSell.asking')}</span>
              <span className="font-semibold text-slate-900 dark:text-white">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lpSell.howItWorks')}</p>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium">{t('lpSell.cancel')}</button>
              <button onClick={submit} disabled={busy || !providers.data?.length}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('lpSell.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellToLPModal;
