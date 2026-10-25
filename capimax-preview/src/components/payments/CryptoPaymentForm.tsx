/**
 * Cryptocurrency payment form backed by the NOWPayments hosted invoice.
 *
 * The previous iteration asked the user to pre-select a pay_currency
 * in our UI (BTC / ETH / USDT / …) and then created a NOWPayments
 * "payment" tied to that one coin. If the merchant didn't support the
 * chosen coin (and NOWPayments returns confusing 5xx errors for these
 * cases) the SPA surfaced an opaque "Failed to create NOWPayments
 * transaction" with no recovery path. We also had a worse menu than
 * NOWPayments itself, which supports 200+ assets.
 *
 * This version uses the INVOICE flow:
 *
 *   1. POST /payments/nowpayments/create-invoice/ with just the amount +
 *      investment_id. The backend creates an internal Payment row plus
 *      a real NOWPayments hosted invoice and returns the invoice URL.
 *   2. Open the hosted URL in a new tab. The user picks any of
 *      NOWPayments' 200+ supported assets there, sees the live
 *      conversion, and completes the payment on a domain they may
 *      already recognise.
 *   3. We poll /payments/nowpayments/status/{payment_id}/ every 6s.
 *      The NOWPayments IPN webhook flips Payment.status to COMPLETED
 *      when the invoice settles, which also triggers
 *      `InvestmentProcessingService.process_investment` → PENDING_MINT
 *      → Celery mints the property tokens.
 *
 * The merchant API key, the chosen coin, the address, the conversion —
 * none of that touches our SPA. We just hold the user's hand from "I
 * want to pay" to "your payment confirmed".
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import {
  Bitcoin,
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

interface CryptoPaymentFormProps {
  amount: number;
  investmentId?: string;
  onPaymentComplete?: (paymentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface CreateInvoiceResponse {
  payment_id: string;
  invoice_id: string;
  invoice_url: string;
  created_at?: string;
}

interface PaymentStatusResponse {
  payment_id: string;
  payment_status: string;
  is_completed: boolean;
  is_pending: boolean;
  is_failed: boolean;
  actually_paid?: string;
  pay_currency?: string;
  invoice_url?: string;
}

const POLL_INTERVAL_MS = 6000;
const POLL_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour — invoices can sit unpaid


export function CryptoPaymentForm({
  amount,
  investmentId,
  onPaymentComplete,
  onCancel,
  className,
}: CryptoPaymentFormProps) {
  const { error: showError } = useNotifications();
  const { t } = useTranslation('payments');

  const [step, setStep] = useState<'intro' | 'awaiting_payment' | 'complete'>('intro');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<CreateInvoiceResponse | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // -------------------------------------------------------------------
  // Open the hosted checkout
  // -------------------------------------------------------------------

  const handleCreateInvoice = async () => {
    setErrorMessage(null);
    setIsCreating(true);
    try {
      const response = await apiClient.post<CreateInvoiceResponse>(
        '/payments/nowpayments/create-invoice/',
        {
          amount,
          currency: 'USD',
          investment_id: investmentId,
          order_description: investmentId
            ? `Capimax investment ${investmentId}`
            : 'Capimax investment',
          // Send the user back here on success/cancel — vite-plugin-pwa
          // serves the SPA so any deep link resolves client-side.
          success_url: `${window.location.origin}/dashboard?crypto=success`,
          cancel_url: `${window.location.origin}/dashboard?crypto=cancelled`,
        },
      );
      setInvoice(response);

      // Open NOWPayments checkout in a new tab so the user can pick a
      // coin from the full list. Some browsers block popups on async
      // calls; the visible "Open hosted checkout" button is a fallback.
      if (response.invoice_url) {
        window.open(response.invoice_url, '_blank', 'noopener,noreferrer');
      }

      setStep('awaiting_payment');
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      pollStatus(response.payment_id);
    } catch (err: any) {
      const status = err?.statusCode;
      let message = err?.message || t('crypto.errors.createInvoice');
      if (status === 503) {
        message = t('crypto.errors.notConfigured');
      } else if (status === 500) {
        message = t('crypto.errors.providerFailed');
      }
      setErrorMessage(message);
      showError(t('crypto.errors.toastTitle'), message);
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
      setErrorMessage(t('crypto.errors.timeout'));
      return;
    }

    try {
      const status = await apiClient.get<PaymentStatusResponse>(
        `/payments/nowpayments/status/${paymentId}/`,
      );
      setLatestStatus(status.payment_status);

      if (status.is_completed) {
        completedRef.current = true;
        setStep('complete');
        onPaymentComplete?.(paymentId);
        return;
      }
      if (status.is_failed) {
        setErrorMessage(t('crypto.errors.invoiceFailed'));
        return;
      }
    } catch (err: any) {
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
  // UI
  // -------------------------------------------------------------------

  const renderIntro = () => (
    <div className="space-y-5">
      <div className="text-center">
        <Bitcoin className="mx-auto w-10 h-10 text-amber-500" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {t('crypto.title')}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <Trans
            t={t}
            i18nKey="crypto.intro"
            values={{ amount: `$${amount.toFixed(2)}` }}
            components={{ b: <strong /> }}
          />
        </p>
      </div>

      <Card className="p-3 bg-blue-50 border-blue-200 text-blue-900 text-sm space-y-1">
        <p className="font-medium">{t('crypto.nextTitle')}</p>
        <ol className="list-decimal ps-5 space-y-1">
          <li>{t('crypto.next1')}</li>
          <li>{t('crypto.next2')}</li>
          <li>{t('crypto.next3')}</li>
        </ol>
      </Card>

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
          {t('shared.cancel')}
        </Button>
        <Button
          onClick={handleCreateInvoice}
          disabled={isCreating}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
              {t('crypto.opening')}
            </>
          ) : (
            t('crypto.continue')
          )}
        </Button>
      </div>
    </div>
  );

  const renderAwaiting = () => {
    if (!invoice) return null;
    const rawStatus = latestStatus || 'waiting';
    const statusLabel = t(`crypto.providerStatus.${rawStatus}`, { defaultValue: rawStatus.replace(/_/g, ' ') });
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            {t('crypto.awaitingTitle')}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('crypto.awaitingBody')}
          </p>
        </div>

        <Card className="p-3 bg-gray-50 dark:bg-gray-800/40 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">{t('crypto.statusLabel')}</span>
            <span className="font-semibold capitalize">{statusLabel}</span>
          </div>
          <a
            href={invoice.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            {t('crypto.reopen')}
          </a>
        </Card>

        <Card className="p-3 bg-amber-50 border-amber-200 text-amber-900 text-sm">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {t('crypto.keepOpen', { seconds: POLL_INTERVAL_MS / 1000 })}
            </div>
          </div>
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
          {t('crypto.payLater')}
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
          {t('crypto.receivedTitle')}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('crypto.receivedBody')}
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
          {step === 'intro' && renderIntro()}
          {step === 'awaiting_payment' && renderAwaiting()}
          {step === 'complete' && renderComplete()}
        </motion.div>
      </Card>
    </div>
  );
}

export default CryptoPaymentForm;
