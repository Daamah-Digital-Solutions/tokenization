import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Lock,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface CreditCardFormProps {
  amount: number;
  onPaymentComplete?: (paymentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface CardDetails {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
}

interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const CARD_TYPES = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  discover: /^6(?:011|5)/,
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() + i;
  return { value: String(year), label: String(year) };
});

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
];

export function CreditCardForm({ amount, onPaymentComplete, onCancel, className }: CreditCardFormProps) {
  const { addTransaction, setError, clearError } = usePayment();
  const { error: showError } = useNotifications();
  const [step, setStep] = useState<'details' | 'billing' | 'processing' | 'complete'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
  });

  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<CardDetails & BillingAddress>>({});

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Detect card type
  const detectCardType = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, '');
    
    for (const [type, pattern] of Object.entries(CARD_TYPES)) {
      if (pattern.test(cleanNumber)) {
        return type;
      }
    }
    
    return 'unknown';
  };

  // Validate card details
  const validateCardDetails = (): boolean => {
    const errors: Partial<CardDetails> = {};
    const cleanNumber = cardDetails.number.replace(/\s/g, '');
    
    // Card number validation
    if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.number = 'Invalid card number';
    }
    
    // Expiry validation
    if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
      if (!cardDetails.expiryMonth) errors.expiryMonth = 'Required';
      if (!cardDetails.expiryYear) errors.expiryYear = 'Required';
    } else {
      const now = new Date();
      const expiry = new Date(parseInt(cardDetails.expiryYear), parseInt(cardDetails.expiryMonth) - 1);
      if (expiry <= now) {
        errors.expiryMonth = 'Card expired';
        errors.expiryYear = 'Card expired';
      }
    }
    
    // CVV validation
    const cardType = detectCardType(cardDetails.number);
    const cvvLength = cardType === 'amex' ? 4 : 3;
    if (!cardDetails.cvv || cardDetails.cvv.length !== cvvLength) {
      errors.cvv = `CVV must be ${cvvLength} digits`;
    }
    
    // Holder name validation
    if (!cardDetails.holderName.trim()) {
      errors.holderName = 'Cardholder name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate billing address
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

  // Handle card detail changes
  const handleCardDetailsChange = (field: keyof CardDetails, value: string) => {
    let processedValue = value;
    
    if (field === 'number') {
      processedValue = formatCardNumber(value);
    } else if (field === 'cvv') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    } else if (field === 'holderName') {
      processedValue = value.toUpperCase();
    }
    
    setCardDetails(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle billing address changes
  const handleBillingAddressChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Process payment
  const handlePayment = async () => {
    setIsProcessing(true);
    setStep('processing');
    clearError();

    try {
      // Mock payment processing - in production, use Stripe or similar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock payment ID
      const mockPaymentId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create transaction record
      const transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'investment' as const,
        status: 'completed' as const,
        amount: amount,
        currency: 'USD',
        paymentMethod: {
          type: 'card' as const,
          id: mockPaymentId,
          last4: cardDetails.number.slice(-4),
          brand: detectCardType(cardDetails.number),
          expiryMonth: parseInt(cardDetails.expiryMonth),
          expiryYear: parseInt(cardDetails.expiryYear),
        },
        timestamp: new Date(),
        description: `Investment payment of ${formatCurrency(amount, 'USD')}`,
        fee: amount * 0.029, // 2.9% processing fee
      };

      addTransaction(transaction);
      setPaymentId(mockPaymentId);
      setStep('complete');
      
      onPaymentComplete?.(mockPaymentId);

    } catch (error: any) {
      showError('Payment Failed', error.message || 'Payment processing failed. Please try again.');
      setError(error.message || 'Payment processing failed');
      setStep('details');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCardDetails = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Card Payment
        </h3>
        <p className="text-sm text-gray-600">
          Pay {formatCurrency(amount, 'USD')} with your credit or debit card
        </p>
      </div>

      <div className="space-y-4">
        {/* Card Number */}
        <div>
          <Input
            label="Card Number"
            value={cardDetails.number}
            onChange={(e) => handleCardDetailsChange('number', e.target.value)}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            error={validationErrors.number}
            icon={<CreditCard className="h-4 w-4 text-gray-400" />}
          />
          {cardDetails.number && (
            <div className="mt-1 text-xs text-gray-500">
              Detected: {detectCardType(cardDetails.number).toUpperCase()}
            </div>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Month"
            value={cardDetails.expiryMonth}
            onChange={(value) => handleCardDetailsChange('expiryMonth', value)}
            options={MONTHS}
            error={validationErrors.expiryMonth}
            icon={<Calendar className="h-4 w-4 text-gray-400" />}
          />
          <Select
            label="Year"
            value={cardDetails.expiryYear}
            onChange={(value) => handleCardDetailsChange('expiryYear', value)}
            options={YEARS}
            error={validationErrors.expiryYear}
          />
          <Input
            label="CVV"
            value={cardDetails.cvv}
            onChange={(e) => handleCardDetailsChange('cvv', e.target.value)}
            placeholder="123"
            maxLength={4}
            error={validationErrors.cvv}
            icon={<Lock className="h-4 w-4 text-gray-400" />}
          />
        </div>

        {/* Cardholder Name */}
        <Input
          label="Cardholder Name"
          value={cardDetails.holderName}
          onChange={(e) => handleCardDetailsChange('holderName', e.target.value)}
          placeholder="JOHN DOE"
          error={validationErrors.holderName}
          icon={<User className="h-4 w-4 text-gray-400" />}
        />

        {/* Save Card Option */}
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

      {/* Security Notice */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Secure Payment</div>
            <div>Your payment information is encrypted and processed securely using industry-standard SSL encryption.</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (validateCardDetails()) {
              setStep('billing');
            }
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderBillingAddress = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Billing Address
        </h3>
        <p className="text-sm text-gray-600">
          Enter your billing address for verification
        </p>
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

      {/* Payment Summary */}
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

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CreditCard className="h-8 w-8 text-emerald-600 animate-pulse" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Processing Payment
        </h3>
        <p className="text-sm text-gray-600">
          Please wait while we process your card payment
        </p>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Card:</span>
            <span>•••• •••• •••• {cardDetails.number.slice(-4)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>{formatCurrency(amount, 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee:</span>
            <span>{formatCurrency(amount * 0.029, 'USD')}</span>
          </div>
        </div>
      </Card>

      <div className="text-xs text-gray-500">
        Do not close this window or refresh the page
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Payment Successful
        </h3>
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
              <span>Card:</span>
              <span>•••• •••• •••• {cardDetails.number.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(amount, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Charged:</span>
              <span className="font-semibold">{formatCurrency(amount + (amount * 0.029), 'USD')}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="text-xs text-gray-500">
        A receipt has been sent to your email address
      </div>

      <Button
        onClick={onCancel}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
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

      {/* Payment Confirmation Dialog */}
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
        confirmText="Confirm Payment"
        cancelText="Cancel"
        details={[
          { label: 'Card', value: `•••• •••• •••• ${cardDetails.number.slice(-4)}` },
          { label: 'Amount', value: formatCurrency(amount, 'USD') },
          { label: 'Processing Fee', value: formatCurrency(amount * 0.029, 'USD') },
          { label: 'Total', value: formatCurrency(amount + (amount * 0.029), 'USD') },
        ]}
      />
    </div>
  );
}

export default CreditCardForm;