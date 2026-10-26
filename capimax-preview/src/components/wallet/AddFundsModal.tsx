/**
 * "Add Funds" — top up the wallet balance so it can be spent on token
 * purchases (client edit #4a). Reuses the existing, already-wired payment
 * rails with NO investment attached, so the standard payment-success path
 * credits WalletBalance:
 *   • Card   → Stripe's secure checkout page (PropShare model); the wallet is
 *              credited when Stripe confirms, and /payment-return follows it
 *   • Crypto → NOWPayments' page for the chosen coin (IPN → wallet credit;
 *              a different amount arriving is what gets credited)
 *   • Bank   → manual wire to a platform account (admin reviews the proof and
 *              credits the wallet). The receiving accounts are managed by the
 *              admin; the customer picks one, wires the funds, and uploads
 *              proof. Nothing is credited until an admin approves.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PurchaseService } from '../../services/purchase/PurchaseService';
import { rememberPendingPurchase } from '../../utils/pendingPayment';
import { apiClient } from '../../services/api/ApiClient';
import { cn } from '../../utils/cn';
import { useUser } from '../../contexts/AuthContext';
import { downloadBankInstructionsPdf } from '../../utils/pdf/bankDocuments';

interface AddFundsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'amount' | 'bank' | 'bank-submitted';

interface PlatformBankAccount {
  id: string;
  label?: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  bank_address?: string;
  bank_country?: string;
  currency?: string;
  instructions?: string;
}

const MIN_AMOUNT = 10;

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation('payments');
  const { t: tc } = useTranslation('checkout');
  const [method, setMethod] = useState<'card' | 'crypto' | 'bank'>('card');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bank-transfer flow state
  const [bankAccounts, setBankAccounts] = useState<PlatformBankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [coin, setCoin] = useState('');
  const { data: coins = [] } = useQuery({
    queryKey: ['crypto-coins'],
    queryFn: () => PurchaseService.coins(),
    enabled: method === 'crypto',
    staleTime: 600_000,
  });
  useEffect(() => {
    if (method !== 'crypto' || coin || !coins.length) return;
    setCoin(['usdttrc20', 'usdc', 'btc', 'eth'].find((c) => coins.includes(c)) || coins[0]);
  }, [method, coins]);
  const { data: coinMinimum } = useQuery({
    queryKey: ['crypto-minimum', coin],
    queryFn: () => PurchaseService.minimum(coin),
    enabled: method === 'crypto' && Boolean(coin),
    staleTime: 300_000,
  });

  const amountValue = parseFloat(amount);
  const amountValid = !isNaN(amountValue) && amountValue >= MIN_AMOUNT;

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);
  const user: any = useUser();
  const [instructionsBusy, setInstructionsBusy] = useState(false);
  // Official bank-transfer instructions (client round 3, #15).
  const downloadInstructions = async () => {
    if (!selectedAccount) return;
    setInstructionsBusy(true);
    try {
      await downloadBankInstructionsPdf({
        holderName: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || '',
        holderEmail: user?.email,
        amount: amountValue,
        reference: reference.trim() || undefined,
        account: selectedAccount,
      });
    } catch (e) {
      console.error('Bank instructions PDF failed:', e);
    } finally {
      setInstructionsBusy(false);
    }
  };

  // Load the platform's active receiving accounts when the bank step opens.
  useEffect(() => {
    if (step !== 'bank' || bankAccounts.length || loadingAccounts) return;
    setLoadingAccounts(true);
    apiClient
      .get<{ accounts: PlatformBankAccount[] }>('/payments/wallet/bank-accounts/')
      .then((data) => {
        const accounts = data?.accounts || [];
        setBankAccounts(accounts);
        if (accounts.length) setSelectedAccountId(accounts[0].id);
      })
      .catch(() => setError(t('addFunds.errors.loadBank')))
      .finally(() => setLoadingAccounts(false));
  }, [step, bankAccounts.length, loadingAccounts]);

  const copy = (field: string, value?: string) => {
    if (!value) return;
    try {
      navigator.clipboard?.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
    } catch (_) {
      /* clipboard blocked — non-fatal */
    }
  };

  const handleContinue = async () => {
    if (!amountValid) {
      setError(t('addFunds.errors.minAmount', { min: `$${MIN_AMOUNT}` }));
      return;
    }
    setError(null);

    if (method === 'bank') {
      setStep('bank');
      return;
    }
    if (method === 'crypto' && coinMinimum?.minimum_usd != null && amountValue < Number(coinMinimum.minimum_usd)) {
      setError(tc('coinBelowMinimum', { amount: `$${Number(coinMinimum.minimum_usd).toFixed(2)}` }));
      return;
    }

    // Card / crypto: the provider's secure page, in this tab; it sends the
    // member back to /payment-return, which follows the deposit.
    setSubmitting(true);
    try {
      const res = await PurchaseService.deposit(amountValue, method, method === 'crypto' ? coin || undefined : undefined);
      if (res?.checkout_url) {
        rememberPendingPurchase(undefined, res.payment_id);
        window.location.assign(res.checkout_url);
        return;
      }
      setError(t(method === 'crypto' ? 'addFunds.errors.cryptoStartRetry' : 'addFunds.errors.cryptoStart'));
    } catch (e: any) {
      setError(
        e?.code === 'KYC_REQUIRED' || e?.code === 'PAYMENTS_NOT_CONFIGURED'
          ? tc(`errors.${e.code}`)
          : e?.message || t('addFunds.errors.cryptoStart'),
      );
    }
    setSubmitting(false);
  };

  const handleBankSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('amount', String(amountValue));
      fd.append('currency', 'USD');
      if (selectedAccountId) fd.append('platform_bank_account', selectedAccountId);
      if (reference.trim()) fd.append('reference', reference.trim());
      if (proofFile) fd.append('proof_of_transfer', proofFile);
      await apiClient.post('/payments/wallet/bank-deposit/', fd);
      setStep('bank-submitted');
    } catch (e: any) {
      setError(e?.message || t('addFunds.errors.bankSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const DetailRow: React.FC<{ label: string; value?: string; field?: string }> = ({
    label,
    value,
    field,
  }) =>
    value ? (
      <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
        <span className="text-sm text-slate-800 dark:text-slate-100 text-end break-all font-medium">
          {value}
          {field && (
            <button
              type="button"
              onClick={() => copy(field, value)}
              className="ms-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {copiedField === field ? t('addFunds.copied') : t('addFunds.copy')}
            </button>
          )}
        </span>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('addFunds.title')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {t('addFunds.subtitle')}
        </p>

        {step === 'bank-submitted' ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              <Trans
                t={t}
                i18nKey="addFunds.bankSubmitted"
                values={{ amount: `$${amountValue.toFixed(2)}` }}
                components={{ b: <strong /> }}
              />
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 transition-colors"
            >
              {t('addFunds.done')}
            </button>
          </>
        ) : step === 'bank' ? (
          <>
            <button
              onClick={() => { setStep('amount'); setError(null); }}
              className="text-sm text-slate-500 dark:text-slate-400 mb-3 hover:text-slate-700"
            >
              <span className="inline-block rtl:rotate-180">←</span> {t('addFunds.back')}
            </button>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              <Trans
                t={t}
                i18nKey="addFunds.bankIntro"
                values={{ amount: `$${amountValue.toFixed(2)}` }}
                components={{ b: <strong /> }}
              />
            </div>

            {loadingAccounts ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {t('addFunds.loadingBank')}
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="p-4 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                {t('addFunds.bankUnavailable')}
              </div>
            ) : (
              <>
                {bankAccounts.length > 1 && (
                  <>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {t('addFunds.transferTo')}
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-3"
                    >
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {(a.label || a.bank_name) + (a.currency ? ` (${a.currency})` : '')}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {selectedAccount && (
                  <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                    <DetailRow label={t('addFunds.details.accountHolder')} value={selectedAccount.account_holder_name} />
                    <DetailRow label={t('addFunds.details.bank')} value={selectedAccount.bank_name} />
                    <DetailRow label={t('addFunds.details.account')} value={selectedAccount.account_number} field="account_number" />
                    <DetailRow label={t('addFunds.details.swift')} value={selectedAccount.swift_code} field="swift_code" />
                    <DetailRow label={t('addFunds.details.routing')} value={selectedAccount.routing_number} field="routing_number" />
                    <DetailRow label={t('addFunds.details.bankAddress')} value={selectedAccount.bank_address} />
                    <DetailRow label={t('addFunds.details.country')} value={selectedAccount.bank_country} />
                    <DetailRow label={t('addFunds.details.currency')} value={selectedAccount.currency} />
                    {selectedAccount.instructions && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {selectedAccount.instructions}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={downloadInstructions}
                      disabled={instructionsBusy}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                    >
                      {instructionsBusy ? t('addFunds.preparing') : t('addFunds.downloadInstructions')}
                    </button>
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('addFunds.referenceLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('addFunds.referencePlaceholder')}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-3"
                />

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('addFunds.proofLabel')}
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 mb-4 file:me-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200"
                />

                {error && (
                  <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleBankSubmit}
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 transition-colors"
                >
                  {submitting ? t('addFunds.submitting') : t('addFunds.madeTransfer')}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('addFunds.amountLabel')}
            </label>
            <input
              type="number"
              min={MIN_AMOUNT}
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-4"
            />

            {/* Method toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              {(['card', 'crypto', 'bank'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMethod(m); setError(null); }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                    method === m
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {m === 'card' ? t('addFunds.methods.card') : m === 'crypto' ? t('addFunds.methods.crypto') : t('addFunds.methods.bank')}
                </button>
              ))}
            </div>

            {method === 'crypto' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{tc('coin')}</label>
                <select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                >
                  {coins.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
                {coinMinimum?.minimum_usd != null && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tc('coinMinimum', { amount: `$${Number(coinMinimum.minimum_usd).toFixed(2)}` })}
                  </p>
                )}
              </div>
            )}
            {method !== 'bank' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{tc('deposit.redirectNote')}</p>
            )}

            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                {t('addFunds.cancel')}
              </button>
              <button
                onClick={handleContinue}
                disabled={!amountValid || submitting}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 transition-colors"
              >
                {method === 'bank'
                  ? t('addFunds.continueBank')
                  : submitting
                    ? t('addFunds.starting')
                    : tc('confirm.button.checkout')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddFundsModal;
