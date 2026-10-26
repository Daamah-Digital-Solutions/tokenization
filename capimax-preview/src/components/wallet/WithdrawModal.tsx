/**
 * Withdraw — to one of the member's SAVED accounts only (PropShare model).
 * Pick a saved bank account / crypto wallet, or add one (it is saved for
 * next time). The amount is held in the wallet at once; our team sends it
 * and the member is told at each step.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { PayoutService, type PayoutAccount, type PayoutKind } from '../../services/wallet/PayoutService';

const inputClass =
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm';
const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

export const WithdrawModal: React.FC<{
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ availableBalance, onClose, onSuccess }) => {
  const { t } = useTranslation('payments');
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PayoutKind>('bank');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    account_holder_name: '', bank_name: '', account_number: '', swift_code: '', routing_number: '', bank_country: '',
    crypto_asset: 'USDT', crypto_network: 'TRC20', crypto_address: '', crypto_memo: '',
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // one key per request: a double click never holds the amount twice
  const idempotencyKey = useRef(PayoutService.newIdempotencyKey());

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['payout-accounts'],
    queryFn: () => PayoutService.accounts(),
    refetchOnMount: 'always',
  });
  const saved = accounts.filter((a) => a.kind === method);
  const addingNew = adding || (!isLoading && saved.length === 0);

  // Default to the account marked default for this kind.
  useEffect(() => {
    if (saved.some((a) => a.id === accountId)) return;
    setAccountId((saved.find((a) => a.is_default) || saved[0])?.id || '');
  }, [method, accounts]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'bank_country' ? e.target.value.toUpperCase() : e.target.value }));

  const amountValue = parseFloat(amount);
  const amountValid = !isNaN(amountValue) && amountValue >= 10 && amountValue <= availableBalance;
  const newValid =
    method === 'bank'
      ? !!(form.account_holder_name.trim() && form.bank_name.trim() && form.account_number.trim())
      : !!(form.crypto_asset.trim() && form.crypto_network.trim() && form.crypto_address.trim());
  const isValid = amountValid && (addingNew ? newValid : Boolean(accountId));

  const removeAccount = async (a: PayoutAccount) => {
    try {
      await PayoutService.removeAccount(a.id);
      queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
    } catch (e: any) {
      setError(e?.message || t('withdraw.errors.submitFailed'));
    }
  };

  const handleSubmit = async () => {
    if (!amountValid) {
      setError(
        amountValue > availableBalance
          ? t('withdraw.errors.exceedsBalance', { balance: `$${availableBalance.toLocaleString()}` })
          : t('withdraw.errors.minAmount'),
      );
      return;
    }
    if (addingNew && !newValid) {
      setError(method === 'bank' ? t('withdraw.errors.bankRequired') : t('withdraw.errors.cryptoRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let target = accountId;
      if (addingNew) {
        const fields =
          method === 'bank'
            ? (['account_holder_name', 'bank_name', 'account_number', 'swift_code', 'routing_number', 'bank_country'] as const)
            : (['crypto_asset', 'crypto_network', 'crypto_address', 'crypto_memo'] as const);
        const body: any = { kind: method };
        fields.forEach((f) => (body[f] = form[f].trim()));
        const created = await PayoutService.addAccount(body);
        target = created.id;
        setAccountId(created.id);
        setAdding(false);
        queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
      }
      const wd = await PayoutService.withdraw(target, amountValue, idempotencyKey.current, notes.trim());
      setSuccess(
        t('withdraw.successRef', {
          ref: wd.reference || wd.id.slice(0, 8),
          amount: `$${amountValue.toFixed(2)}`,
          dest: wd.destination_label,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['wallet', 'withdraw-requests'] });
      setTimeout(() => onSuccess(), 2500);
    } catch (e: any) {
      idempotencyKey.current = PayoutService.newIdempotencyKey();
      const details = e?.details;
      const flat =
        details && typeof details === 'object'
          ? Object.entries(details)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' · ')
          : '';
      setError(`${e?.message || t('withdraw.errors.submitFailed')}${flat ? ` (${flat})` : ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <Text variant="h3" weight="bold" className="mb-1">{t('withdraw.title')}</Text>
        <Text variant="caption" color="muted" className="mb-5 block">
          {t('withdraw.availableBalance')} <strong>${availableBalance.toLocaleString()}</strong>
        </Text>

        {success ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
            <Button onClick={onClose} className="w-full">{t('withdraw.close')}</Button>
          </>
        ) : (
          <>
            <label className={labelClass}>{t('withdraw.amountLabel')}</label>
            <input
              type="number"
              min={10}
              max={availableBalance}
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(inputClass, 'mb-4')}
            />

            {/* Bank | Crypto */}
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              {(['bank', 'crypto'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMethod(m); setAdding(false); setError(null); }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                    method === m
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {m === 'bank' ? t('withdraw.methodBank') : t('withdraw.methodCrypto')}
                </button>
              ))}
            </div>

            {saved.length > 0 && (
              <div className="mb-3" data-testid="payout-accounts">
                <div className={labelClass}>{t('withdraw.sendTo')}</div>
                <div className="space-y-2">
                  {saved.map((a) => (
                    <label
                      key={a.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer',
                        !adding && accountId === a.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 dark:border-slate-700',
                      )}
                    >
                      <input
                        type="radio"
                        name="payout-account"
                        checked={!adding && accountId === a.id}
                        onChange={() => { setAccountId(a.id); setAdding(false); }}
                      />
                      <span className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 truncate">
                        {a.label ? `${a.label} — ` : ''}{a.display}
                        {a.is_default && <span className="ms-2 text-xs text-emerald-600">{t('withdraw.default')}</span>}
                      </span>
                      <button type="button" onClick={(e) => { e.preventDefault(); removeAccount(a); }} className="text-xs text-slate-400 hover:text-red-600">
                        {t('withdraw.remove')}
                      </button>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className={cn(
                      'w-full text-start p-3 rounded-xl border border-dashed text-sm',
                      adding ? 'border-emerald-500 text-emerald-700' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {t('withdraw.addNew')}
                  </button>
                </div>
              </div>
            )}

            {addingNew && method === 'bank' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">{t('withdraw.newAccount')}</div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.holderName')} *</label>
                  <input type="text" placeholder={t('withdraw.placeholders.holderName')} value={form.account_holder_name} onChange={set('account_holder_name')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.bankName')} *</label>
                  <input type="text" placeholder={t('withdraw.placeholders.bankName')} value={form.bank_name} onChange={set('bank_name')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('withdraw.fields.accountNumber')} *</label>
                  <input type="text" placeholder={t('withdraw.placeholders.accountNumber')} value={form.account_number} onChange={set('account_number')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.swift')}</label>
                  <input type="text" placeholder={t('withdraw.placeholders.swift')} value={form.swift_code} onChange={set('swift_code')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.routing')}</label>
                  <input type="text" placeholder={t('withdraw.placeholders.optional')} value={form.routing_number} onChange={set('routing_number')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.bankCountry')}</label>
                  <input type="text" maxLength={2} placeholder="US, GB, AE…" value={form.bank_country} onChange={set('bank_country')} className={cn(inputClass, 'uppercase')} />
                </div>
              </div>
            )}

            {addingNew && method === 'crypto' && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">{t('withdraw.newAccount')}</div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.asset')} *</label>
                  <select value={form.crypto_asset} onChange={set('crypto_asset')} className={inputClass}>
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('withdraw.fields.network')} *</label>
                  <select value={form.crypto_network} onChange={set('crypto_network')} className={inputClass}>
                    <option value="TRC20">TRC20 (Tron)</option>
                    <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                    <option value="ERC20">ERC20 (Ethereum)</option>
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="ETH">ETH (Ethereum)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('withdraw.fields.walletAddress')} *</label>
                  <input type="text" placeholder={t('withdraw.placeholders.walletAddress')} value={form.crypto_address} onChange={set('crypto_address')} className={cn(inputClass, 'font-mono')} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('withdraw.fields.memo')}</label>
                  <input type="text" placeholder={t('withdraw.placeholders.memo')} value={form.crypto_memo} onChange={set('crypto_memo')} className={inputClass} />
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className={labelClass}>{t('withdraw.fields.notes')}</label>
              <textarea
                rows={2}
                placeholder={t('withdraw.placeholders.notes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="p-3 mb-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              {t('withdraw.onlySaved')}
            </div>

            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>{t('withdraw.cancel')}</Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !isValid}>
                {submitting ? t('withdraw.submitting') : t('withdraw.submit', { amount: `$${amountValid ? amountValue.toFixed(2) : '0.00'}` })}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
