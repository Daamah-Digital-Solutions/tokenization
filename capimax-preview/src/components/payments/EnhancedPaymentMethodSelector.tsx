import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  Building2, 
  Smartphone,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Zap,
  DollarSign,
  Info
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo } from '../../utils/currencyConverter';
import CryptoPaymentForm from './CryptoPaymentForm';
import CreditCardForm from './CreditCardForm';
import BankTransferForm from './BankTransferForm';
import MultiWalletConnector from './MultiWalletConnector';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PaymentMethodInfo {
  id: string;
  type: 'crypto' | 'card' | 'bank' | 'paypal';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  fee: string;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  popular?: boolean;
  recommended?: boolean;
  features: string[];
  pros: string[];
  cons: string[];
}

interface EnhancedPaymentMethodSelectorProps {
  amount: number;
  onPaymentComplete?: (paymentId: string, method: string) => void;
  onCancel?: () => void;
  className?: string;
}

const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'crypto',
    type: 'crypto',
    name: 'Cryptocurrency',
    description: 'Pay with Bitcoin, Ethereum, or other cryptocurrencies',
    icon: Wallet,
    fee: '0.1-0.5%',
    processingTime: '10-30 minutes',
    minAmount: 50,
    maxAmount: 500000,
    recommended: true,
    features: ['Decentralized', 'Global', 'Fast Settlement'],
    pros: ['Low fees', 'No chargebacks', 'Global access', 'Fast for large amounts'],
    cons: ['Price volatility', 'Technical complexity', 'Requires wallet']
  },
  {
    id: 'card',
    type: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay instantly with Visa, Mastercard, or American Express',
    icon: CreditCard,
    fee: '2.9% + $0.30',
    processingTime: 'Instant',
    minAmount: 10,
    maxAmount: 25000,
    popular: true,
    features: ['Instant Processing', 'Consumer Protection', 'Widely Accepted'],
    pros: ['Instant confirmation', 'Familiar process', 'Buyer protection', 'Rewards points'],
    cons: ['Higher fees', 'Chargeback risk', 'Geographic restrictions']
  },
  {
    id: 'bank',
    type: 'bank',
    name: 'Bank Transfer',
    description: 'Direct transfer from your bank account (ACH/Wire)',
    icon: Building2,
    fee: 'ACH: Free, Wire: $25',
    processingTime: 'ACH: 1-3 days, Wire: Same day',
    minAmount: 100,
    maxAmount: 1000000,
    features: ['High Limits', 'Secure', 'Cost Effective'],
    pros: ['Low/no fees', 'High limits', 'Secure', 'No intermediaries'],
    cons: ['Slower processing', 'Banking hours', 'More complex setup']
  },
  {
    id: 'paypal',
    type: 'paypal',
    name: 'PayPal',
    description: 'Pay using your PayPal balance or connected accounts',
    icon: Smartphone,
    fee: '3.49% + $0.49',
    processingTime: 'Instant',
    minAmount: 5,
    maxAmount: 10000,
    features: ['Buyer Protection', 'Easy Setup', 'Mobile Friendly'],
    pros: ['Quick setup', 'Buyer protection', 'Mobile friendly', 'No card details shared'],
    cons: ['Higher fees', 'Account freezing risk', 'Limited to PayPal users']
  }
];

export function EnhancedPaymentMethodSelector({ 
  amount, 
  onPaymentComplete, 
  onCancel, 
  className 
}: EnhancedPaymentMethodSelectorProps) {
  const { state, getBalance } = usePayment();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showWalletConnector, setShowWalletConnector] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Filter methods based on amount limits
  const availableMethods = PAYMENT_METHODS.filter(method => 
    amount >= method.minAmount && amount <= method.maxAmount
  );

  const handleMethodSelect = (methodId: string) => {
    const method = PAYMENT_METHODS.find(m => m.id === methodId);
    if (!method) return;

    setSelectedMethod(methodId);
    
    if (method.type === 'crypto') {
      // Check if wallet is connected
      const hasCryptoPaymentMethod = state.paymentMethods.some(pm => pm.type === 'crypto');
      if (!hasCryptoPaymentMethod) {
        setShowWalletConnector(true);
      } else {
        setShowPaymentForm(true);
      }
    } else {
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    onPaymentComplete?.(paymentId, selectedMethod || '');
  };

  const calculateFee = (method: PaymentMethodInfo): number => {
    switch (method.type) {
      case 'crypto':
        return amount * 0.005; // 0.5%
      case 'card':
        return amount * 0.029 + 0.30; // 2.9% + $0.30
      case 'bank':
        return 0; // ACH is free, wire has fixed $25 fee
      case 'paypal':
        return amount * 0.0349 + 0.49; // 3.49% + $0.49
      default:
        return 0;
    }
  };

  const getMethodAvailability = (method: PaymentMethodInfo): { available: boolean; reason?: string } => {
    // Amount limits
    if (amount < method.minAmount) {
      return { available: false, reason: `Minimum amount: ${formatCurrency(method.minAmount, 'USD')}` };
    }
    if (amount > method.maxAmount) {
      return { available: false, reason: `Maximum amount: ${formatCurrency(method.maxAmount, 'USD')}` };
    }

    // Crypto specific checks
    if (method.type === 'crypto') {
      const hasBalance = state.balances.some(b => b.balance > 0);
      if (!hasBalance) {
        return { available: true, reason: 'Wallet connection required' };
      }
    }

    return { available: true };
  };

  const renderMethodCard = (method: PaymentMethodInfo) => {
    const availability = getMethodAvailability(method);
    const fee = calculateFee(method);
    const totalAmount = amount + fee;

    return (
      <motion.div
        key={method.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className={`p-6 cursor-pointer transition-all relative ${
            availability.available
              ? 'hover:shadow-lg hover:border-emerald-300 border-gray-200'
              : 'opacity-60 cursor-not-allowed border-gray-200'
          } ${selectedMethod === method.id ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
          onClick={() => availability.available && handleMethodSelect(method.id)}
        >
          {/* Badges */}
          <div className="absolute top-4 right-4 flex gap-2">
            {method.recommended && (
              <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full font-medium">
                Recommended
              </span>
            )}
            {method.popular && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                Popular
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              method.type === 'crypto' ? 'bg-orange-100' :
              method.type === 'card' ? 'bg-blue-100' :
              method.type === 'bank' ? 'bg-emerald-100' :
              'bg-purple-100'
            }`}>
              <method.icon className={`h-6 w-6 ${
                method.type === 'crypto' ? 'text-orange-600' :
                method.type === 'card' ? 'text-blue-600' :
                method.type === 'bank' ? 'text-emerald-600' :
                'text-purple-600'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{method.name}</h3>
                {method.type === 'crypto' && (
                  <Zap className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              
              <p className="text-gray-600 mb-4">{method.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {method.features.map((feature, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Fee</span>
                  </div>
                  <div className="font-medium">{formatCurrency(fee, 'USD')}</div>
                  <div className="text-xs text-gray-500">{method.fee}</div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Processing</span>
                  </div>
                  <div className="font-medium">{method.processingTime}</div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(totalAmount, 'USD')}
                </span>
              </div>

              {/* Availability Status */}
              {!availability.available && availability.reason && (
                <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{availability.reason}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderPaymentForm = () => {
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    if (!method) return null;

    const commonProps = {
      amount,
      onPaymentComplete: handlePaymentSuccess,
      onCancel: () => {
        setShowPaymentForm(false);
        setSelectedMethod(null);
      }
    };

    switch (method.type) {
      case 'crypto':
        return <CryptoPaymentForm {...commonProps} />;
      case 'card':
        return <CreditCardForm {...commonProps} />;
      case 'bank':
        return <BankTransferForm {...commonProps} />;
      default:
        return (
          <Card className="p-6 text-center">
            <div className="text-gray-500 mb-4">Payment method not yet implemented</div>
            <Button onClick={commonProps.onCancel}>Back</Button>
          </Card>
        );
    }
  };

  const renderComparison = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment Method Comparison</h3>
        <Button size="sm" onClick={() => setShowComparison(false)}>
          Close
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4">Method</th>
              <th className="text-left py-3 px-4">Fee</th>
              <th className="text-left py-3 px-4">Processing Time</th>
              <th className="text-left py-3 px-4">Limits</th>
              <th className="text-left py-3 px-4">Best For</th>
            </tr>
          </thead>
          <tbody>
            {availableMethods.map((method) => (
              <tr key={method.id} className="border-b border-gray-100">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <method.icon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{method.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div>{formatCurrency(calculateFee(method), 'USD')}</div>
                  <div className="text-xs text-gray-500">{method.fee}</div>
                </td>
                <td className="py-3 px-4">{method.processingTime}</td>
                <td className="py-3 px-4">
                  <div>{formatCurrency(method.minAmount, 'USD')} - {formatCurrency(method.maxAmount, 'USD')}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs space-y-1">
                    {method.pros.slice(0, 2).map((pro, index) => (
                      <div key={index} className="text-emerald-600">• {pro}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  if (showPaymentForm) {
    return (
      <div className={className}>
        {renderPaymentForm()}
      </div>
    );
  }

  return (
    <div className={className}>
      {showWalletConnector && (
        <MultiWalletConnector
          isOpen={showWalletConnector}
          onClose={() => setShowWalletConnector(false)}
          onConnect={() => {
            setShowWalletConnector(false);
            setShowPaymentForm(true);
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Choose Payment Method
          </h2>
          <p className="text-gray-600 mb-4">
            Pay {formatCurrency(amount, 'USD')} for your real estate investment
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowComparison(!showComparison)}
              className="flex items-center gap-2"
            >
              <Info className="h-4 w-4" />
              Compare Methods
            </Button>
          </div>
        </div>

        {showComparison && renderComparison()}

        {/* Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableMethods.map(renderMethodCard)}
        </div>

        {/* Security Notice */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Secure Payment Processing</div>
              <div>
                All payments are processed through encrypted channels with industry-standard security measures. 
                Your financial information is never stored on our servers.
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Back to Property
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedPaymentMethodSelector;