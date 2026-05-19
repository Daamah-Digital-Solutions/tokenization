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

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'AE', label: 'United Arab Emirates' },
];

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

  return (
    <Elements stripe={stripePromise}>
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
    if (!billingAddress.street.trim()) errors.street = 'Street address is required';
    if (!billingAddress.city.trim()) errors.city = 'City is required';
    if (!billingAddress.state.trim()) errors.state = 'State is required';
    if (!billingAddress.zipCode.trim()) errors.zipCode = 'ZIP code is required';
    if (!billingAddress.country) errors.country = 'Country is required';
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
        throw new Error(
          'Stripe.js has not finished loading yet. Please try again in a moment.'
        );
      }
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card input is not ready. Please refresh and try again.');
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
        throw new Error(stripeError.message || 'Card declined');
      }
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(
          `Payment is in status "${paymentIntent?.status}". Please try again or contact support.`
        );
      }

      // 3. Record the transaction locally. The authoritative Payment row is
      //    created server-side by the Stripe webhook handler
      //    (`payments/views.py:StripeWebhookView`) on payment_intent.succeeded.
      //    We never trust client-side success alone for downstream effects.
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
        description: `Investment payment of ${formatCurrency(amount, 'USD')}`,
        fee: amount * 0.029,
      });

      setPaymentId(intent.payment_intent_id);
      setStep('complete');
      onPaymentComplete?.(intent.payment_intent_id);
    } catch (err: any) {
      showError('Payment Failed', err.message || 'Payment processing failed. Please try again.');
      setError(err.message || 'Payment processing failed');
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Payment</h3>
        <p className="text-sm text-gray-600">
          Pay {formatCurrency(amount, 'USD')} with your credit or debit card
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Cardholder Name"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="As shown on the card"
          error={validationErrors.holderName}
        />

        {/* Stripe-managed card input. Renders inside an iframe owned by
            Stripe — our origin never reads the values. */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Card details
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
            Save this card for future payments
          </label>
        </div>
      </div>

      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">PCI-DSS Secure</div>
            <div>
              Card data is collected by Stripe inside an isolated iframe. CapimaxRT never sees your card number, CVC, or expiry.
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          disabled={!cardElementComplete || !holderName.trim()}
          onClick={() => {
            if (!cardElementComplete) {
              setCardElementError('Please complete your card details.');
              return;
            }
            if (!holderName.trim()) {
              setValidationErrors(prev => ({ ...prev, holderName: 'Required' }));
              return;
            }
            setStep('billing');
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing Address</h3>
        <p className="text-sm text-gray-600">Enter your billing address for verification</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Street Address"
          value={billingAddress.street}
          onChange={(e) => handleBillingAddressChange('street', e.target.value)}
          placeholder="123 Main Street"
          error={validationErrors.street}
          icon={<MapPin className="h-4 w-4 text-gray-400" />}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            value={billingAddress.city}
            onChange={(e) => handleBillingAddressChange('city', e.target.value)}
            placeholder="New York"
            error={validationErrors.city}
          />
          <Input
            label="State"
            value={billingAddress.state}
            onChange={(e) => handleBillingAddressChange('state', e.target.value)}
            placeholder="NY"
            error={validationErrors.state}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ZIP Code"
            value={billingAddress.zipCode}
            onChange={(e) => handleBillingAddressChange('zipCode', e.target.value)}
            placeholder="10001"
            error={validationErrors.zipCode}
          />
          <Select
            label="Country"
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
            <span>Subtotal:</span>
            <span>{formatCurrency(amount, 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee (2.9%):</span>
            <span>{formatCurrency(amount * 0.029, 'USD')}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total:</span>
            <span>{formatCurrency(amount + (amount * 0.029), 'USD')}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => {
            if (validateBillingAddress()) {
              setShowConfirmation(true);
            }
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Complete Payment
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
        <p className="text-sm text-gray-600">
          Please wait while we confirm your card payment with Stripe
        </p>
      </div>
      <div className="text-xs text-gray-500">
        Do not close this window or refresh the page
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful</h3>
        <p className="text-sm text-gray-600">
          Your card payment has been processed successfully
        </p>
      </div>
      {paymentId && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Payment ID:</span>
              <span className="font-mono text-xs">{paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(amount, 'USD')}</span>
            </div>
          </div>
        </Card>
      )}
      <div className="text-xs text-gray-500">
        A receipt has been sent to your email address
      </div>
      <Button onClick={onCancel} className="w-full bg-emerald-600 hover:bg-emerald-700">
        Done
      </Button>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-md mx-auto">
        <div className="p-6">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'details' && renderCardDetails()}
            {step === 'billing' && renderBillingAddress()}
            {step === 'processing' && renderProcessing()}
            {step === 'complete' && renderComplete()}
          </motion.div>
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
        title="Confirm Payment"
        message="Are you sure you want to proceed with this payment? This action cannot be undone."
        confirmText={isProcessing ? 'Processing…' : 'Confirm Payment'}
        cancelText="Cancel"
        details={[
          { label: 'Amount', value: formatCurrency(amount, 'USD') },
          { label: 'Processing Fee', value: formatCurrency(amount * 0.029, 'USD') },
          { label: 'Total', value: formatCurrency(amount + (amount * 0.029), 'USD') },
        ]}
      />
    </div>
  );
}

export default CreditCardForm;
