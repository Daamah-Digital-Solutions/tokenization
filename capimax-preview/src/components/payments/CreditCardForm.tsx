/**
 * Credit-card payment form using Stripe Elements.
 *
 * PCI-DSS NOTE — this is the security-critical part of the file:
 *
 * The previous version of this component read the card number, CVC, and
 * expiry into React state and posted them as raw fields to Stripe. That
 * placed our SPA fully in PCI-DSS scope (SAQ D) and could have caused
 * Stripe to deactivate the account on detection.
 *
 * This version uses `<Elements>` + `<CardElement>`. The card UI is rendered
 * inside an iframe served by Stripe's domain. Our code:
 *   - never sees the card number, CVC, or expiry;
 *   - never stores them anywhere (state, localStorage, query strings);
 *   - never sends them to our backend.
 *
 * The only thing crossing our boundary is the PaymentIntent client_secret
 * (from the backend) and the resulting PaymentMethod token (from Stripe).
 * That keeps the SPA under PCI-DSS SAQ A.
 *
 * If you ever feel tempted to add a fallback that reads raw card data into
 * state, STOP and read https://stripe.com/docs/security/guide first.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Shield,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type {
  StripeCardElementOptions,
  StripeCardElementChangeEvent,
} from '@stripe/stripe-js';

import { usePayment } from '../../contexts/PaymentContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../utils/currencyConverter';
import { apiClient } from '../../services/api/ApiClient';
import { getStripe } from '../../utils/stripe';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { COUNTRIES } from '../../utils/countries';

interface CreditCardFormProps {
  amount: number;
  /**
   * Optional investment ID — when provided the backend links the PaymentIntent
   * to the investment so the post-payment webhook can mark it paid.
   */
  investmentId?: string;
  onPaymentComplete?: (paymentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Countries list now comes from `utils/countries.ts` (full ISO-3166 set).

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  // Single combined input (number + expiry + CVC). For finer-grained UX use
  // <CardNumberElement> / <CardExpiryElement> / <CardCvcElement> instead —
  // but `CardElement` is the lowest-effort, fully PCI-safe default.
  hidePostalCode: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#0f172a',
      fontFamily: 'inherit',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: {
      color: '#dc2626',
    },
  },
};


// ---------------------------------------------------------------------------
// Outer wrapper — provides the Stripe Elements context.
// ---------------------------------------------------------------------------

export function CreditCardForm(props: CreditCardFormProps) {
  // `getStripe()` is memoised, so this won't re-load Stripe on re-render.
  const stripePromise = React.useMemo(() => getStripe(), []);
  // Stripe's own card fields follow the site language.
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  return (
    <Elements stripe={stripePromise} options={{ locale }} key={locale}>
      <CreditCardFormInner {...props} />
    </Elements>
  );
}


// ---------------------------------------------------------------------------
// Inner form — uses the Stripe hooks. Never touches raw card data.
// ---------------------------------------------------------------------------

function CreditCardFormInner({
  amount,
  investmentId,
  onPaymentComplete,
  onCancel,
  className,
}: CreditCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { addTransaction, setError, clearError } = usePayment();
  const { error: showError } = useNotifications();
  const { t } = useTranslation('payments');

  const [step, setStep] = useState<'details' | 'billing' | 'processing' | 'complete'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Cardholder name is collected outside the Stripe iframe (PCI-safe — it's
  // not a sensitive field). Card details themselves live ONLY inside the
  // CardElement iframe.
  const [holderName, setHolderName] = useState('');

  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const [cardElementComplete, setCardElementComplete] = useState(false);
  const [cardElementError, setCardElementError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<BillingAddress & { holderName: string }>>({});

  const handleCardElementChange = (event: StripeCardElementChangeEvent) => {
    setCardElementComplete(event.complete);
    setCardElementError(event.error?.message || null);
  };

  const validateBillingAddress = (): boolean => {
    const errors: Partial<BillingAddress> = {};
    if (!billingAddress.street.trim()) errors.street = t('card.errors.streetRequired');
    if (!billingAddress.city.trim()) errors.city = t('card.errors.cityRequired');
    if (!billingAddress.state.trim()) errors.state = t('card.errors.stateRequired');
    if (!billingAddress.zipCode.trim()) errors.zipCode = t('card.errors.zipRequired');
    if (!billingAddress.country) errors.country = t('card.errors.countryRequired');
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBillingAddressChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStep('processing');
    clearError();

    try {
      if (!stripe || !elements) {
        throw new Error(t('card.errors.stripeLoading'));
      }
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(t('card.errors.cardNotReady'));
      }

      // 1. Ask the backend for a Stripe PaymentIntent.
      //    Endpoint: POST /payments/stripe/create-payment-intent/
      const intent = await apiClient.post<{
        client_secret: string;
        payment_intent_id: string;
        payment_id?: string;
      }>('/payments/stripe/create-payment-intent/', {
        amount,
        currency: 'USD',
        investment_id: investmentId,
        save_payment_method: saveCard,
      });

      // 2. Confirm the card payment via Stripe Elements. The CardElement
      //    handle is passed in directly — the raw card data NEVER crosses
      //    our origin.
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: holderName.trim(),
              address: {
                line1: billingAddress.street,
                city: billingAddress.city,
                state: billingAddress.state,
                postal_code: billingAddress.zipCode,
                country: billingAddress.country,
              },
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || t('card.errors.declined'));
      }
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(t('card.errors.badStatus', { status: paymentIntent?.status }));
      }

      // 3. Tell the backend to finalize. The webhook will ALSO fire, but in
      //    staging/dev (and in any environment where the Stripe dashboard's
      //    webhook endpoint isn't configured yet) we can't rely on it
      //    alone. The /confirm-payment endpoint re-fetches the PaymentIntent
      //    from Stripe so it never trusts the client's word for the status —
      //    the only thing the client provides is the intent ID.
      try {
        await apiClient.post('/payments/stripe/confirm-payment/', {
          payment_intent_id: intent.payment_intent_id,
        });
      } catch (confirmErr: any) {
        // Don't fail the whole flow — the webhook may still finalize. Just
        // log so we can spot mis-configured environments.
        console.warn(
          'Stripe confirm-payment fallback failed (webhook may finalize):',
          confirmErr?.message ?? confirmErr,
        );
      }

      // 4. Record the transaction locally. The authoritative Payment row is
      //    created server-side by either the webhook handler or the
      //    confirm-payment fallback above. We never trust client-side
      //    success alone for downstream effects (token minting).
      addTransaction({
        id: intent.payment_intent_id,
        type: 'investment' as const,
        status: 'completed' as const,
        amount,
        currency: 'USD',
        paymentMethod: {
          type: 'card' as const,
          id: intent.payment_intent_id,
          // Only the brand and last4 are public PaymentMethod metadata —
          // these are exposed by Stripe, never typed in by the user here.
          last4: (paymentIntent.payment_method as any)?.card?.last4 ?? undefined,
          brand: (paymentIntent.payment_method as any)?.card?.brand ?? undefined,
        },
        timestamp: new Date(),
        description: t('card.txDescription', { amount: formatCurrency(amount, 'USD') }),
        fee: amount * 0.029,
      });

      setPaymentId(intent.payment_intent_id);
      setStep('complete');
      onPaymentComplete?.(intent.payment_intent_id);
    } catch (err: any) {
      showError(t('card.errors.toastTitle'), err.message || t('card.errors.processingRetry'));
      setError(err.message || t('card.errors.processing'));
      setStep('details');
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------
  // Step 1: card details (rendered via Stripe Elements iframe)
  // -------------------------------------------------------------------

  const renderCardDetails = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('card.title')}</h3>
        <p className="text-sm text-gray-600">
          {t('card.subtitle', { amount: formatCurrency(amount, 'USD') })}
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label={t('card.holderName')}
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder={t('card.holderPlaceholder')}
          error={validationErrors.holderName}
        />

        {/* Stripe-managed card input. Renders inside an iframe owned by
            Stripe — our origin never reads the values. */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {t('card.cardDetails')}
          </label>
          <div className="rounded border border-gray-300 px-3 py-3">
            <CardElement
              options={CARD_ELEMENT_OPTIONS}
              onChange={handleCardElementChange}
            />
          </div>
          {cardElementError && (
            <div className="mt-1 text-xs text-red-600">{cardElementError}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="saveCard"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="saveCard" className="text-sm text-gray-700">
            {t('card.saveCard')}
          </label>
        </div>
      </div>

      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">{t('card.pciTitle')}</div>
            <div>
              {t('card.pciBody')}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('shared.cancel')}
        </Button>
        <Button
          disabled={!cardElementComplete || !holderName.trim()}
          onClick={() => {
            if (!cardElementComplete) {
              setCardElementError(t('card.errors.completeCard'));
              return;
            }
            if (!holderName.trim()) {
              setValidationErrors(prev => ({ ...prev, holderName: t('card.errors.required') }));
              return;
            }
            setStep('billing');
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {t('card.continue')}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------
  // Step 2: billing address
  // -------------------------------------------------------------------

  const renderBillingAddress = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('card.billingTitle')}</h3>
        <p className="text-sm text-gray-600">{t('card.billingSubtitle')}</p>
      </div>

      <div className="space-y-4">
        <Input
          label={t('card.street')}
          value={billingAddress.street}
          onChange={(e) => handleBillingAddressChange('street', e.target.value)}
          placeholder={t('card.streetPlaceholder')}
          error={validationErrors.street}
          icon={<MapPin className="h-4 w-4 text-gray-400" />}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('card.city')}
            value={billingAddress.city}
            onChange={(e) => handleBillingAddressChange('city', e.target.value)}
            placeholder={t('card.cityPlaceholder')}
            error={validationErrors.city}
          />
          <Input
            label={t('card.state')}
            value={billingAddress.state}
            onChange={(e) => handleBillingAddressChange('state', e.target.value)}
            placeholder="NY"
            error={validationErrors.state}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('card.zip')}
            value={billingAddress.zipCode}
            onChange={(e) => handleBillingAddressChange('zipCode', e.target.value)}
            placeholder="10001"
            error={validationErrors.zipCode}
          />
          <Select
            label={t('card.country')}
            value={billingAddress.country}
            onChange={(value) => handleBillingAddressChange('country', value)}
            options={COUNTRIES}
            error={validationErrors.country}
          />
        </div>
      </div>

      <Card className="p-4 bg-gray-50">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t('card.subtotal')}</span>
            <span>{formatCurrency(amount, 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('card.processingFeePct', { pct: '2.9' })}</span>
            <span>{formatCurrency(amount * 0.029, 'USD')}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>{t('depositWithdraw.totalColon')}</span>
            <span>{formatCurrency(amount + (amount * 0.029), 'USD')}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
          {t('card.back')}
        </Button>
        <Button
          onClick={() => {
            if (validateBillingAddress()) {
              setShowConfirmation(true);
            }
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {t('card.completePayment')}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------
  // Step 3: processing screen
  // -------------------------------------------------------------------

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CreditCard className="h-8 w-8 text-emerald-600 animate-pulse" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('card.processingTitle')}</h3>
        <p className="text-sm text-gray-600">
          {t('card.processingBody')}
        </p>
      </div>
      <div className="text-xs text-gray-500">
        {t('card.doNotClose')}
      </div>
    </div>
  );

  // -------------------------------------------------------------------
  // Step 4: complete
  // -------------------------------------------------------------------

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('card.successTitle')}</h3>
        <p className="text-sm text-gray-600">
          {t('card.successBody')}
        </p>
      </div>
      {paymentId && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-start">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t('card.paymentId')}</span>
              <span className="font-mono text-xs">{paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('depositWithdraw.amountColon')}</span>
              <span>{formatCurrency(amount, 'USD')}</span>
            </div>
          </div>
        </Card>
      )}
      <div className="text-xs text-gray-500">
        {t('card.receiptSent')}
      </div>
      <Button onClick={onCancel} className="w-full bg-emerald-600 hover:bg-emerald-700">
        {t('card.done')}
      </Button>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-md mx-auto">
        <div className="p-6">
          {/*
            CRITICAL: <CardElement> MUST stay mounted across step changes.
            stripe.elements().getElement(CardElement) returns null the moment
            CardElement unmounts — so if we conditionally render the details
            step, the eventual handlePayment() call from the billing step
            sees a null element and throws "Card input is not ready" without
            ever talking to Stripe. We keep the details panel mounted at all
            times and toggle visibility via `hidden`. CardElement keeps its
            own state regardless.
          */}
          <div hidden={step !== 'details'}>
            {renderCardDetails()}
          </div>
          {step !== 'details' && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 'billing' && renderBillingAddress()}
              {step === 'processing' && renderProcessing()}
              {step === 'complete' && renderComplete()}
            </motion.div>
          )}
        </div>
      </Card>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          setShowConfirmation(false);
          handlePayment();
        }}
        type="warning"
        title={t('card.confirmTitle')}
        message={t('card.confirmMessage')}
        confirmText={isProcessing ? t('card.processing') : t('card.confirmTitle')}
        cancelText={t('shared.cancel')}
        details={[
          { label: t('card.amount'), value: formatCurrency(amount, 'USD') },
          { label: t('card.processingFee'), value: formatCurrency(amount * 0.029, 'USD') },
          { label: t('card.total'), value: formatCurrency(amount + (amount * 0.029), 'USD') },
        ]}
      />
    </div>
  );
}

export default CreditCardForm;
