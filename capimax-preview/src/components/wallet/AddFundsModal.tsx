/**
 * "Add Funds" — top up the wallet balance so it can be spent on token
 * purchases (client edit #4a). Reuses the existing, already-wired payment
 * rails with NO investment attached, so the standard payment-success path
 * credits WalletBalance:
 *   • Card   → CreditCardForm (Stripe PaymentIntent → confirm → wallet credit)
 *   • Crypto → NOWPayments hosted invoice (IPN → wallet credit)
 *
 * Note: this deliberately restores a top-up flow that commit 232e4e9 had
 * removed (wallet was made outbound-only). Re-enabled per the client's
 * explicit request.
 */

import React, { useState } from 'react';
import { CreditCardForm } from '../payments/CreditCardForm';
import { PaymentService } from '../../services/payment/PaymentService';
import { cn } from '../../utils/cn';

interface AddFundsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'amount' | 'card' | 'crypto-pending' | 'success';

const MIN_AMOUNT = 10;

export const AddFundsModal: React.FC<AddFundsModalProps> = ({ onClose, onSuccess }) => {
  const [method, setMethod] = useState<'card' | 'crypto'>('card');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = parseFloat(amount);
  const amountValid = !isNaN(amountValue) && amountValue >= MIN_AMOUNT;

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
              {(['card', 'crypto'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMethod(m); setError(null); }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                    method === m
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {m === 'card' ? 'Card' : 'Crypto'}
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
