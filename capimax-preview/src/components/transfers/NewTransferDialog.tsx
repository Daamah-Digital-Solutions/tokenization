/**
 * New transfer (client round 4, extra #3): shares of a property or wallet
 * balance, to an email, now or on a date, with an optional message.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Send, X, Loader2, Building2, Wallet } from 'lucide-react';
import { TransferService } from '../../services/transfers/TransferService';

const money = (v: number) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export const NewTransferDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation('transfers');
  const queryClient = useQueryClient();
  const giftable = useQuery({ queryKey: ['transfers-giftable'], queryFn: () => TransferService.giftable() });
  const [asset, setAsset] = useState<'units' | 'cash'>('units');
  const [propertyId, setPropertyId] = useState('');
  const [units, setUnits] = useState(1);
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(today());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const prop = useMemo(() => giftable.data?.properties.find(p => p.property_id === propertyId), [giftable.data, propertyId]);
  const feePct = Number(giftable.data?.fee_percent || 0);
  const balance = Number(giftable.data?.balance || 0);
  const value = asset === 'cash' ? Number(amount) || 0 : (Number(prop?.unit_cost) || 0) * (units || 0);
  const fee = (value * feePct) / 100;

  const submit = async () => {
    setError(null);
    if (!/\S+@\S+\.\S+/.test(email)) return setError(t('new.errEmail'));
    if (asset === 'units' && (!prop || units < 1 || units > prop.free_units)) return setError(t('new.errUnits'));
    if (asset === 'cash' && (!(Number(amount) > 0) || Number(amount) + fee > balance)) return setError(t('new.errAmount'));
    setBusy(true);
    try {
      const res: any = await TransferService.create({
        asset, recipient_email: email.trim(), recipient_name: name.trim(), message: message.trim(), deliver_on: date,
        ...(asset === 'units' ? { property_id: propertyId, units } : { amount: Number(amount) }),
      });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers-giftable'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties-bookkeeping'] });
      setResult(t(`new.result.${res?.status || 'scheduled'}`, { email: email.trim(), days: giftable.data?.claim_days ?? 30 }));
    } catch (err: any) {
      const details = err?.details && typeof err.details === 'object'
        ? Object.values(err.details).flat().filter((v: any) => typeof v === 'string' && !/^[A-Z_]+$/.test(v)).join(' ') : '';
      setError(err?.message || details || t('new.errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 my-8" onClick={e => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-label={t('new.title')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Send className="w-5 h-5 text-emerald-600" />{t('new.title')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={t('new.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <p className="text-slate-800 dark:text-slate-100">{result}</p>
            <button onClick={onClose} className="mt-5 px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold">{t('new.close')}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([['units', Building2], ['cash', Wallet]] as const).map(([key, Icon]) => (
                <button key={key} type="button" onClick={() => setAsset(key)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                          asset === key ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
                  <Icon className="w-4 h-4" />{t(`new.asset.${key}`)}
                </button>
              ))}
            </div>

            {asset === 'units' ? (
              <div className="grid grid-cols-3 gap-3">
                <label className="block col-span-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.property')}</span>
                  <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={input}>
                    <option value="">{giftable.isLoading ? '…' : t('new.chooseProperty')}</option>
                    {(giftable.data?.properties || []).map(p => (
                      <option key={p.property_id} value={p.property_id}>{p.title} — {t('new.free', { count: p.free_units })}</option>
                    ))}
                  </select>
                  {giftable.data && !giftable.data.properties.length && (
                    <span className="text-xs text-amber-600 mt-1 block">{t('new.noShares')}</span>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.units')}</span>
                  <input type="number" min={1} max={prop?.free_units || 1} value={units}
                         onChange={e => setUnits(parseInt(e.target.value, 10) || 0)} className={input} />
                </label>
              </div>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.amount')}</span>
                <input type="number" min={0.01} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={input} />
                <span className="text-xs text-slate-500">{t('new.balance', { amount: money(balance) })}</span>
              </label>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.email')}</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className={input} placeholder="name@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.name')}</span>
                <input value={name} onChange={e => setName(e.target.value)} className={input} />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.date')}</span>
                <input type="date" min={today()} value={date} onChange={e => setDate(e.target.value)} className={input} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('new.message')}</span>
                <input value={message} maxLength={500} onChange={e => setMessage(e.target.value)} className={input} />
              </label>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">{t(asset === 'cash' ? 'new.youSend' : 'new.costBasis')}</span><span className="font-semibold">{money(value)}</span></div>
              {feePct > 0 && <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">{t('new.fee', { pct: feePct })}</span><span>{money(fee)}</span></div>}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('new.rules', { days: giftable.data?.claim_days ?? 30 })}</p>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium">{t('new.cancel')}</button>
              <button onClick={submit} disabled={busy}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('new.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTransferDialog;
