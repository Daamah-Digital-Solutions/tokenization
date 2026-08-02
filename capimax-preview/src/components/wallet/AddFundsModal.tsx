/**
 * "Add Funds" — top up the wallet balance so it can be spent on token
 * purchases (client edit #4a). Reuses the existing, already-wired payment
 * rails with NO investment attached, so the standard payment-success path
 * credits WalletBalance:
 *   • Card   → CreditCardForm (Stripe PaymentIntent → confirm → wallet credit)
 *   • Crypto → NOWPayments hosted invoice (IPN → wallet credit)
 *   • Bank   → manual wire to a platform account (admin reviews the proof and
 *              credits the wallet). The receiving accounts are managed by the
 *              admin; the customer picks one, wires the funds, and uploads
 *              proof. Nothing is credited until an admin approves.
 */

import React, { useEffect, useState } from 'react';
import { CreditCardForm } from '../payments/CreditCardForm';
import { PaymentService } from '../../services/payment/PaymentService';
import { apiClient } from '../../services/api/ApiClient';
import { cn } from '../../utils/cn';

interface AddFundsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'amount' | 'card' | 'crypto-pending' | 'bank' | 'bank-submitted' | 'success';

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

  const amountValue = parseFloat(amount);
  const amountValid = !isNaN(amountValue) && amountValue >= MIN_AMOUNT;

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId);

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
      .catch(() => setError('Could not load bank details. Please try again.'))
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
      setError(`Enter an amount of at least $${MIN_AMOUNT}.`);
      return;
    }
    setError(null);

    if (method === 'card') {
      setStep('card');
      return;
    }

    if (method === 'bank') {
      setStep('bank');
      return;
    }

    // Crypto: create a hosted NOWPayments invoice and open it in a new tab.
    setSubmitting(true);
    try {
      const res = await PaymentService.createNowPaymentsInvoice({
        amount: amountValue,
        currency: 'USD',
        order_description: 'Wallet top-up',
        success_url: window.location.href,
        cancel_url: window.location.href,
      });
      if (res?.invoice_url) {
        window.open(res.invoice_url, '_blank', 'noopener,noreferrer');
        setStep('crypto-pending');
      } else {
        setError('Could not start the crypto checkout. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not start the crypto checkout.');
    } finally {
      setSubmitting(false);
    }
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
      setError(e?.message || 'Could not submit your bank deposit. Please try again.');
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
        <span className="text-sm text-slate-800 dark:text-slate-100 text-right break-all font-medium">
          {value}
          {field && (
            <button
              type="button"
              onClick={() => copy(field, value)}
              className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {copiedField === field ? 'Copied' : 'Copy'}
            </button>
          )}
        </span>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add Funds</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Top up your wallet balance to purchase property tokens.
        </p>

        {step === 'success' ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              Payment confirmed — your wallet balance has been topped up.
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Done
            </button>
          </>
        ) : step === 'crypto-pending' ? (
          <>
            <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              Complete your crypto payment in the newly-opened checkout tab. Your
              wallet balance updates automatically once the payment is confirmed
              on-chain (this can take a few minutes).
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Done
            </button>
          </>
        ) : step === 'bank-submitted' ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              Bank deposit request submitted. Once our team confirms your transfer,
              <strong> ${amountValue.toFixed(2)}</strong> will be credited to your
              wallet — usually within 1–2 business days. You'll get a notification
              when it's done.
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 transition-colors"
            >
              Done
            </button>
          </>
        ) : step === 'card' ? (
          <>
            <button
              onClick={() => setStep('amount')}
              className="text-sm text-slate-500 dark:text-slate-400 mb-3 hover:text-slate-700"
            >
              ← Back
            </button>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Adding <strong>${amountValue.toFixed(2)}</strong> to your wallet.
            </div>
            <CreditCardForm
              amount={amountValue}
              onPaymentComplete={() => setStep('success')}
              onCancel={() => setStep('amount')}
            />
          </>
        ) : step === 'bank' ? (
          <>
            <button
              onClick={() => { setStep('amount'); setError(null); }}
              className="text-sm text-slate-500 dark:text-slate-400 mb-3 hover:text-slate-700"
            >
              ← Back
            </button>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Transfer <strong>${amountValue.toFixed(2)}</strong> to the account
              below, then submit this form. We'll credit your wallet once the
              transfer is confirmed.
            </div>

            {loadingAccounts ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading bank details…
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="p-4 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                Bank transfer isn't available right now — no receiving account is
                configured. Please use card or crypto, or try again later.
              </div>
            ) : (
              <>
                {bankAccounts.length > 1 && (
                  <>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Transfer to
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
                    <DetailRow label="Account holder" value={selectedAccount.account_holder_name} />
                    <DetailRow label="Bank" value={selectedAccount.bank_name} />
                    <DetailRow label="Account / IBAN" value={selectedAccount.account_number} field="account_number" />
                    <DetailRow label="SWIFT / BIC" value={selectedAccount.swift_code} field="swift_code" />
                    <DetailRow label="Routing / sort code" value={selectedAccount.routing_number} field="routing_number" />
                    <DetailRow label="Bank address" value={selectedAccount.bank_address} />
                    <DetailRow label="Country" value={selectedAccount.bank_country} />
                    <DetailRow label="Currency" value={selectedAccount.currency} />
                    {selectedAccount.instructions && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {selectedAccount.instructions}
                      </p>
                    )}
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Transfer reference (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. your account email"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-3"
                />

                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Proof of transfer (optional — speeds up review)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 mb-4 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200"
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
                  {submitting ? 'Submitting…' : "I've made the transfer"}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Amount (USD)
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
                  {m === 'card' ? 'Card' : m === 'crypto' ? 'Crypto' : 'Bank'}
                </button>
              ))}
            </div>

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
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!amountValid || submitting}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 transition-colors"
              >
                {method === 'card'
                  ? 'Continue to card'
                  : method === 'bank'
                    ? 'Continue to bank transfer'
                    : submitting
                      ? 'Starting…'
                      : 'Pay with crypto'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddFundsModal;
