import React, { useState, useRef } from 'react';
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
  Info,
  FileText,
  Coins,
  Upload,
  Copy,
  Loader2
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
  type: 'crypto' | 'card' | 'bank' | 'paypal' | 'nova_sukuk' | 'pronova';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  fee: string;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  popular?: boolean;
  recommended?: boolean;
  discount?: string;
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
  },
  {
    id: 'nova_sukuk',
    type: 'nova_sukuk',
    name: 'Nova Sukuk',
    description: 'Pay with Nova Sukuk certificate - upload PDF for admin review',
    icon: FileText,
    fee: 'Free',
    processingTime: '1-2 business days (manual review)',
    minAmount: 50,
    maxAmount: 1000000,
    features: ['Sharia Compliant', 'No Fees', 'High Limits'],
    pros: ['No transaction fees', 'Sharia-compliant', 'High purchase limits'],
    cons: ['Manual review required', 'Longer processing time']
  },
  {
    id: 'pronova',
    type: 'pronova',
    name: 'Pronova',
    description: 'Pay with Pronova crypto on BNB Smart Chain - get 5% discount!',
    icon: Coins,
    fee: 'Free',
    processingTime: '5-15 minutes',
    minAmount: 50,
    maxAmount: 500000,
    recommended: true,
    discount: '5% OFF',
    features: ['5% Discount', 'BNB Smart Chain', 'Fast Settlement'],
    pros: ['5% discount on purchase', 'Low fees', 'Fast confirmation', 'On-chain verification'],
    cons: ['Requires Pronova tokens', 'Requires crypto wallet']
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
      case 'nova_sukuk':
        return 0; // Free
      case 'pronova':
        return -(amount * 0.05); // 5% discount (negative fee)
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
            {method.discount && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-bold">
                {method.discount}
              </span>
            )}
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
              method.type === 'nova_sukuk' ? 'bg-indigo-100' :
              method.type === 'pronova' ? 'bg-yellow-100' :
              'bg-purple-100'
            }`}>
              <method.icon className={`h-6 w-6 ${
                method.type === 'crypto' ? 'text-orange-600' :
                method.type === 'card' ? 'text-blue-600' :
                method.type === 'bank' ? 'text-emerald-600' :
                method.type === 'nova_sukuk' ? 'text-indigo-600' :
                method.type === 'pronova' ? 'text-yellow-600' :
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
                    <span>{fee < 0 ? 'Discount' : 'Fee'}</span>
                  </div>
                  <div className={`font-medium ${fee < 0 ? 'text-emerald-600' : ''}`}>
                    {fee < 0 ? `-${formatCurrency(Math.abs(fee), 'USD')}` : formatCurrency(fee, 'USD')}
                  </div>
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
      case 'nova_sukuk':
        return <NovaSukukForm {...commonProps} />;
      case 'pronova':
        return <PronovaForm {...commonProps} />;
      default:
        return (
          <Card className="p-6 text-center">
            <div className="text-gray-500 mb-4">Payment method not yet implemented</div>
            <Button onClick={commonProps.onCancel}>Back</Button>
          </Card>
        );
    }
  };

  // --- Nova Sukuk Form ---
  const NovaSukukForm = ({ amount, onPaymentComplete, onCancel }: { amount: number; onPaymentComplete?: (id: string) => void; onCancel?: () => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === 'application/pdf') {
        setSelectedFile(file);
      }
    };

    const handleSubmit = async () => {
      if (!selectedFile || !referenceNumber.trim()) return;
      setIsSubmitting(true);
      try {
        // In production, this would POST to /api/v1/investments/nova-sukuk-invest/ with FormData
        const paymentId = `sukuk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setTimeout(() => {
          setIsSubmitting(false);
          setSubmitted(true);
          onPaymentComplete?.(paymentId);
        }, 1500);
      } catch {
        setIsSubmitting(false);
      }
    };

    if (submitted) {
      return (
        <Card className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Submission Received</h3>
          <p className="text-gray-600 mb-4">
            Your Nova Sukuk certificate has been submitted for admin review.
            You will be notified once the review is complete (1-2 business days).
          </p>
          <Button onClick={onCancel}>Back to Methods</Button>
        </Card>
      );
    }

    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nova Sukuk Payment</h3>
            <p className="text-sm text-gray-600">Upload your Sukuk certificate PDF for review</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-lg text-sm text-indigo-800">
            <strong>Purchase Amount:</strong> ${amount.toLocaleString()} | <strong>Fee:</strong> Free
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sukuk Certificate (PDF)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Click to upload PDF</p>
                  <p className="text-xs">Maximum file size: 10MB</p>
                </div>
              )}
            </button>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sukuk Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Enter your Sukuk reference number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">Back</Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || !referenceNumber.trim() || isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // --- Pronova Form ---
  const PronovaForm = ({ amount, onPaymentComplete, onCancel }: { amount: number; onPaymentComplete?: (id: string) => void; onCancel?: () => void }) => {
    const discountedAmount = amount * 0.95;
    const savings = amount * 0.05;
    const platformWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'; // From backend config
    const [step, setStep] = useState<'info' | 'awaiting' | 'confirm' | 'done'>('info');
    const [txHash, setTxHash] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyAddress = () => {
      navigator.clipboard.writeText(platformWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirmTx = async () => {
      if (!txHash.match(/^0x[a-fA-F0-9]{64}$/)) return;
      setIsVerifying(true);
      // In production, POST to /api/v1/investments/{id}/confirm-pronova/ with tx_hash
      setTimeout(() => {
        setIsVerifying(false);
        setStep('done');
        const paymentId = `pronova_${Date.now()}`;
        onPaymentComplete?.(paymentId);
      }, 2000);
    };

    if (step === 'done') {
      return (
        <Card className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Transaction Submitted</h3>
          <p className="text-gray-600 mb-4">
            Your Pronova transaction is being verified on-chain.
            This typically takes 5-15 minutes.
          </p>
          <Button onClick={onCancel}>Back to Methods</Button>
        </Card>
      );
    }

    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Coins className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pronova Payment</h3>
            <p className="text-sm text-gray-600">BNB Smart Chain - 5% discount applied</p>
          </div>
        </div>

        {/* Discount Summary */}
        <div className="p-4 bg-yellow-50 rounded-lg mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Original Amount</span>
            <span className="line-through text-gray-400">${amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-emerald-600 font-medium">5% Discount</span>
            <span className="text-emerald-600 font-medium">-${savings.toLocaleString()}</span>
          </div>
          <div className="border-t border-yellow-200 mt-2 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">You Pay</span>
            <span className="font-bold text-gray-900 text-lg">${discountedAmount.toLocaleString()}</span>
          </div>
        </div>

        {step === 'info' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Send Pronova tokens to the platform wallet address</li>
                <li>Enter your transaction hash for verification</li>
                <li>Wait for on-chain confirmation (5-15 min)</li>
                <li>Tokens are allocated to your account automatically</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">Back</Button>
              <Button onClick={() => setStep('awaiting')} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'awaiting' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send Pronova tokens to:</label>
              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
                <span className="flex-1">{platformWallet}</span>
                <button onClick={handleCopyAddress} className="shrink-0 p-2 hover:bg-gray-200 rounded">
                  {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Network:</strong> BNB Smart Chain (BSC) | <strong>Amount:</strong> ${discountedAmount.toLocaleString()} equivalent in Pronova
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('info')} className="flex-1">Back</Button>
              <Button onClick={() => setStep('confirm')} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                I've Sent the Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              {txHash && !txHash.match(/^0x[a-fA-F0-9]{64}$/) && (
                <p className="text-red-500 text-xs mt-1">Invalid transaction hash format (must be 0x + 64 hex characters)</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('awaiting')} className="flex-1">Back</Button>
              <Button
                onClick={handleConfirmTx}
                disabled={!txHash.match(/^0x[a-fA-F0-9]{64}$/) || isVerifying}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</span>
                ) : (
                  'Verify Transaction'
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
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
            Pay {formatCurrency(amount, 'USD')} for your real estate purchase
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