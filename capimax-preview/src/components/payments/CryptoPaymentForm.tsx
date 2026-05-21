/**
 * Cryptocurrency payment form backed by NOWPayments.
 *
 * The previous version of this file simulated Web3 wallet payments —
 * fabricated tx hashes, mock gas estimates, and a hardcoded 3-second
 * "transaction succeeded". It never spoke to a payment provider, never
 * confirmed receipt of funds, and never marked the linked investment as
 * paid. Users could click "pay with crypto" and the investment would
 * silently sit in PENDING forever.
 *
 * This rewrite drives the real NOWPayments integration that already
 * exists on the backend (see capimax_backend/payments/nowpayments_views.py):
 *
 *   1. POST /payments/nowpayments/create-payment/  with the chosen
 *      pay_currency + the linked investment_id. The backend creates an
 *      internal Payment row + a real NOWPayments invoice and returns
 *      `pay_address`, `pay_amount`, and a hosted-checkout `payment_url`.
 *   2. The user either:
 *        - clicks "Open Checkout" → NOWPayments-hosted page, or
 *        - sends `pay_amount` directly to `pay_address` from their own
 *          exchange / wallet (the address + amount are shown verbatim).
 *   3. We poll /payments/nowpayments/status/{payment_id}/ every 6s. When
 *      the status reaches `finished`, the backend has already credited
 *      the wallet, transitioned the investment to PENDING_MINT, and
 *      kicked off Celery to mint the tokens. We then call
 *      onPaymentComplete() and the parent flow shows the confirmation
 *      screen.
 *
 * Notes:
 *   - The actual NOWPayments API call lives entirely in the backend. We
 *     never expose the merchant API key to the SPA.
 *   - If NOWPayments creds aren't set up yet (staging often has
 *     placeholders), the backend returns 503 and we surface a clear,
 *     human-readable error so the user knows to use another method
 *     instead of getting stuck.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bitcoin,
  Coins,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';

import { apiClient } from '../../services/api/ApiClient';
import { useNotifications } from '../../contexts/NotificationContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

interface CryptoPaymentFormProps {
  amount: number;
  /** Optional — when provided the backend links the NOWPayments payment to
   * the investment so the IPN/poll flow can mark it paid + trigger mint. */
  investmentId?: string;
  onPaymentComplete?: (paymentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface CreatePaymentResponse {
  payment_id: string;
  nowpayments_payment_id: string;
  pay_address: string;
  pay_amount: string;
  pay_currency: string;
  payment_status: string;
  payment_url?: string | null;
}

interface PaymentStatusResponse {
  payment_id: string;
  nowpayments_payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: string;
  pay_currency: string;
  actually_paid: string;
  is_completed: boolean;
  is_pending: boolean;
  is_failed: boolean;
}

// Selection of the most-commonly-used pay currencies. The backend will
// validate the choice against what NOWPayments supports for the merchant.
const PAY_CURRENCIES: { code: string; label: string; network?: string }[] = [
  { code: 'BTC', label: 'Bitcoin (BTC)' },
  { code: 'ETH', label: 'Ethereum (ETH)' },
  { code: 'USDTERC20', label: 'Tether (USDT) — Ethereum' },
  { code: 'USDTTRC20', label: 'Tether (USDT) — TRON' },
  { code: 'USDCERC20', label: 'USD Coin (USDC) — Ethereum' },
  { code: 'BNBBSC', label: 'BNB (BSC)' },
  { code: 'MATIC', label: 'Polygon (MATIC)' },
];

const POLL_INTERVAL_MS = 6000;
const POLL_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes


export function CryptoPaymentForm({
  amount,
  investmentId,
  onPaymentComplete,
  onCancel,
  className,
}: CryptoPaymentFormProps) {
  const { error: showError } = useNotifications();

  const [step, setStep] = useState<'select' | 'awaiting_payment' | 'complete'>('select');
  const [payCurrency, setPayCurrency] = useState<string>('USDTERC20');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populated after we POST /create-payment/.
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [actuallyPaid, setActuallyPaid] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'address' | 'amount' | null>(null);

  // Refs so we can clean up timers and avoid setState-after-unmount.
  const pollTimerRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // -------------------------------------------------------------------
  // Create the NOWPayments payment
  // -------------------------------------------------------------------

  const handleCreatePayment = async () => {
    setErrorMessage(null);
    setIsCreating(true);
    try {
      const response = await apiClient.post<CreatePaymentResponse>(
        '/payments/nowpayments/create-payment/',
        {
          amount,
          currency: 'USD',
          pay_currency: payCurrency,
          investment_id: investmentId,
          order_description: investmentId
            ? `Capimax investment ${investmentId}`
            : 'Capimax investment',
        },
      );
      setPayment(response);
      setLatestStatus(response.payment_status);
      setStep('awaiting_payment');
      // Kick off polling immediately.
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      pollStatus(response.payment_id);
    } catch (err: any) {
      // Backend returns 503 when NOWPayments credentials are missing or
      // the service is unreachable. Distinguish from validation errors so
      // we tell the user the right next step.
      const status = err?.statusCode;
      let message = err?.message || 'Failed to create the crypto payment.';
      if (status === 503) {
        message =
          'Crypto payments are not configured for this environment yet. ' +
          'Please use a different payment method, or contact support.';
      }
      setErrorMessage(message);
      showError('Crypto payment failed', message);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------------
  // Poll status until the payment lands on chain
  // -------------------------------------------------------------------

  const pollStatus = async (paymentId: string) => {
    if (completedRef.current) return;
    if (
      pollDeadlineRef.current !== null &&
      Date.now() > pollDeadlineRef.current
    ) {
      setErrorMessage(
        'Timed out waiting for the on-chain payment. If you have already sent ' +
          'the funds, they will still credit — check Transactions in a few ' +
          'minutes. Otherwise you can cancel and try again.',
      );
      return;
    }

    try {
      const status = await apiClient.get<PaymentStatusResponse>(
        `/payments/nowpayments/status/${paymentId}/`,
      );
      setLatestStatus(status.payment_status);
      if (status.actually_paid) setActuallyPaid(status.actually_paid);

      if (status.is_completed) {
        completedRef.current = true;
        setStep('complete');
        onPaymentComplete?.(paymentId);
        return;
      }
      if (status.is_failed) {
        setErrorMessage(
          'NOWPayments reported this payment as failed or expired. You can ' +
            'cancel and try again with a fresh quote.',
        );
        return;
      }
    } catch (err: any) {
      // Don't surface every poll failure to the user — transient network
      // errors are expected. Just log and try again.
      console.warn('NOWPayments status poll failed:', err?.message ?? err);
    }

    pollTimerRef.current = window.setTimeout(
      () => pollStatus(paymentId),
      POLL_INTERVAL_MS,
    );
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------

  const copyToClipboard = async (
    value: string,
    field: 'address' | 'amount',
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore — UI is non-blocking
    }
  };

  const renderSelect = () => (
    <div className="space-y-5">
      <div className="text-center">
        <Bitcoin className="mx-auto w-10 h-10 text-amber-500" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          Pay with cryptocurrency
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Pay <strong>${amount.toFixed(2)}</strong> using your crypto wallet or
          exchange. We&apos;ll quote the exact amount in your chosen coin.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cryptocurrency
        </label>
        <select
          value={payCurrency}
          onChange={(e) => setPayCurrency(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
        >
          {PAY_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Don&apos;t see your coin? NOWPayments supports 200+ assets — pick the
          closest, you can swap on the checkout page.
        </p>
      </div>

      {errorMessage && (
        <Card className="p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{errorMessage}</div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isCreating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreatePayment}
          disabled={isCreating}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating…
            </>
          ) : (
            'Get payment address'
          )}
        </Button>
      </div>
    </div>
  );

  const renderAwaiting = () => {
    if (!payment) return null;
    const statusLabel = (latestStatus || 'waiting').replace(/_/g, ' ');
    return (
      <div className="space-y-5">
        <div className="text-center">
          <Coins className="mx-auto w-10 h-10 text-emerald-500" />
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            Send the exact amount below
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            We&apos;re watching the address — your investment is confirmed the
            moment the payment is detected on chain.
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Amount
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-lg text-gray-900 dark:text-white">
                {payment.pay_amount} {payment.pay_currency}
              </span>
              <button
                onClick={() => copyToClipboard(payment.pay_amount, 'amount')}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Copy amount"
              >
                {copiedField === 'amount' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Send to address
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-gray-900 dark:text-white break-all flex-1">
                {payment.pay_address}
              </span>
              <button
                onClick={() => copyToClipboard(payment.pay_address, 'address')}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                title="Copy address"
              >
                {copiedField === 'address' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {payment.payment_url && (
            <a
              href={payment.payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              <ExternalLink className="w-4 h-4" />
              Open hosted checkout
            </a>
          )}
        </Card>

        <Card className="p-3 bg-amber-50 border-amber-200 text-amber-900 text-sm">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              Send <strong>exactly</strong> {payment.pay_amount}{' '}
              {payment.pay_currency} from a wallet you control. Sending less
              fails the order; sending more sends the excess back via
              NOWPayments after a 15-minute review.
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Clock className="w-4 h-4 animate-pulse" />
            Status:{' '}
            <span className="font-semibold capitalize">{statusLabel}</span>
            {actuallyPaid && Number(actuallyPaid) > 0 && (
              <span className="ml-1 text-blue-600">
                (received {actuallyPaid} {payment.pay_currency})
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-blue-700">
            Refreshing every {POLL_INTERVAL_MS / 1000}s. Don&apos;t close this
            window until the payment confirms — you can leave it running in the
            background.
          </p>
        </Card>

        {errorMessage && (
          <Card className="p-3 bg-red-50 border-red-200 text-red-800 text-sm">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>{errorMessage}</div>
            </div>
          </Card>
        )}

        <Button variant="outline" onClick={onCancel} className="w-full">
          I&apos;ll pay later
        </Button>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment received
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Your crypto payment is confirmed on chain. Tokens will appear in your
          wallet shortly — minting runs in the background.
        </p>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-md mx-auto">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6"
        >
          {step === 'select' && renderSelect()}
          {step === 'awaiting_payment' && renderAwaiting()}
          {step === 'complete' && renderComplete()}
        </motion.div>
      </Card>
    </div>
  );
}

export default CryptoPaymentForm;
