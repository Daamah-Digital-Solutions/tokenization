import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Wallet,
  Building2,
  Bitcoin,
  Coins,
  Shield,
  Clock,
  CheckCircle,
  Info,
  AlertCircle,
  Star,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Input } from '../design-system/forms/Input';
import type { InvestmentData } from './types';
import type { WalletInfo } from '../../services/api/types';
import { WalletService } from '../../services/wallet/WalletService';
import { cn } from '../../utils/cn';

interface PaymentMethodSelectorProps {
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
  errors: Record<string, string>;
  onPaymentComplete?: (paymentId: string, method: string) => void;
  onAdvanceToProcessing?: () => void;
}

interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  fee: string;
  processingTime: string;
  recommended?: boolean;
  popular?: boolean;
  discount?: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'wallet',
    name: 'CapiMax Wallet',
    description: 'Use your existing CapiMax wallet balance for instant investment',
    icon: Wallet,
    fee: 'Free',
    processingTime: 'Instant',
    recommended: true,
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Pay with Bitcoin, Ethereum, or other cryptocurrencies',
    icon: Bitcoin,
    fee: '0.5%',
    processingTime: '10-30 minutes',
    popular: true,
  },
  {
    id: 'fiat',
    name: 'Credit/Debit Card',
    description: 'Pay instantly with Visa, Mastercard, or American Express',
    icon: CreditCard,
    fee: '2.9% + $0.30',
    processingTime: 'Instant',
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct transfer from your bank account (ACH/Wire)',
    icon: Building2,
    fee: 'Free (ACH)',
    processingTime: '1-3 business days',
  },
  {
    id: 'nova_sukuk',
    name: 'Nova Sukuk',
    description: 'Pay with Nova Sukuk certificate - upload PDF for admin review',
    icon: FileText,
    fee: 'Free',
    processingTime: '1-2 business days',
  },
  {
    id: 'pronova',
    name: 'Pronova',
    description: 'Pay with Pronova crypto on BNB Smart Chain - get 5% discount!',
    icon: Coins,
    fee: 'Free',
    processingTime: '5-15 minutes',
    recommended: true,
    discount: '5% OFF',
  },
];

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  investmentData,
  onUpdate,
  errors,
  onPaymentComplete,
  onAdvanceToProcessing
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(
    investmentData.paymentMethod || null
  );

  // Fetch the user's wallet state once so we can warn them inline if they
  // pick a crypto-native flow without an external wallet linked. We don't
  // BLOCK the payment (backend safely falls back to custodial); we just
  // surface the expected destination clearly.
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    WalletService.getWalletInfo()
      .then((info) => { if (!cancelled) setWalletInfo(info); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);
  const isCryptoLike = selectedMethod === 'crypto' || selectedMethod === 'pronova';
  const showCryptoWalletGuidance =
    isCryptoLike && walletInfo && !walletInfo.has_external;

  const handleMethodSelect = (methodId: string) => {
    console.log('Payment method selected:', methodId);
    setSelectedMethod(methodId);

    // Update the investment data with the selected payment method
    onUpdate({
      paymentMethod: methodId as 'crypto' | 'fiat' | 'wallet' | 'nova_sukuk' | 'pronova',
    });
  };

  const handleConfirmPayment = () => {
    console.log('🔥 HANDLE CONFIRM PAYMENT CALLED!');
    console.log('🔥 selectedMethod:', selectedMethod);
    console.log('🔥 onAdvanceToProcessing available:', !!onAdvanceToProcessing);

    if (!selectedMethod) {
      console.log('❌ No selected method, returning');
      onUpdate({ paymentMethod: null });
      return;
    }

    // Simulate payment processing
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ Generated paymentId:', paymentId);

    // Update investment data with payment completion
    onUpdate({
      paymentMethod: selectedMethod as 'crypto' | 'fiat' | 'wallet' | 'nova_sukuk' | 'pronova',
      paymentId: paymentId,
      paymentStatus: 'pending'
    });

    console.log('✅ Updated investment data');

    // Call the completion callback if provided
    if (onPaymentComplete) {
      console.log('✅ Calling onPaymentComplete callback');
      onPaymentComplete(paymentId, selectedMethod);
    } else {
      console.log('⚠️ onPaymentComplete callback not provided');
    }

    // Advance to processing step
    if (onAdvanceToProcessing) {
      console.log('🚀 CALLING onAdvanceToProcessing - THIS SHOULD ADVANCE TO STEP 2!');
      onAdvanceToProcessing();
      console.log('🚀 onAdvanceToProcessing call completed');
    } else {
      console.log('❌ onAdvanceToProcessing callback not provided!');
    }

    console.log('🔥 HANDLE CONFIRM PAYMENT COMPLETED!');
  };

  // If no amount is specified, show placeholder
  if (!investmentData.amount || investmentData.amount <= 0) {
    return (
      <Card className="p-8 text-center">
        <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <Text variant="h4" className="text-gray-600 mb-2">
          Investment Amount Required
        </Text>
        <Text variant="bodySmall" className="text-gray-500">
          Please select an investment amount to proceed with payment options
        </Text>
      </Card>
    );
  }

  const calculateFee = (method: PaymentMethodOption): number => {
    switch (method.id) {
      case 'crypto':
        return investmentData.amount * 0.005; // 0.5%
      case 'fiat':
        return investmentData.amount * 0.029 + 0.30; // 2.9% + $0.30
      case 'bank':
        return 0; // Free
      case 'wallet':
        return 0; // Free
      case 'nova_sukuk':
        return 0; // Free
      case 'pronova':
        return -(investmentData.amount * 0.05); // 5% discount
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Text variant="h3" className="text-gray-900 mb-2">
          Choose Payment Method
        </Text>
        <Text variant="body" className="text-gray-600 mb-4">
          Pay ${investmentData.amount.toLocaleString()} for your real estate investment
        </Text>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAYMENT_METHODS.map((method) => {
          const fee = calculateFee(method);
          const totalAmount = investmentData.amount + fee;

          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all border-2",
                  selectedMethod === method.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                    : "border-gray-200 hover:border-emerald-300 hover:shadow-md"
                )}
                onClick={() => handleMethodSelect(method.id)}
              >
                {/* Badges */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
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

                  {selectedMethod === method.id && (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  )}
                </div>

                {/* Icon and Title */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    method.id === 'crypto' ? 'bg-orange-100' :
                    method.id === 'fiat' ? 'bg-blue-100' :
                    method.id === 'bank' ? 'bg-emerald-100' :
                    method.id === 'nova_sukuk' ? 'bg-indigo-100' :
                    method.id === 'pronova' ? 'bg-yellow-100' :
                    'bg-purple-100'
                  )}>
                    <method.icon className={cn(
                      "h-6 w-6",
                      method.id === 'crypto' ? 'text-orange-600' :
                      method.id === 'fiat' ? 'text-blue-600' :
                      method.id === 'bank' ? 'text-emerald-600' :
                      method.id === 'nova_sukuk' ? 'text-indigo-600' :
                      method.id === 'pronova' ? 'text-yellow-600' :
                      'text-purple-600'
                    )} />
                  </div>

                  <div>
                    <Text variant="bodyLarge" weight="semibold" className="text-gray-900">
                      {method.name}
                    </Text>
                    <Text variant="bodySmall" className="text-gray-600">
                      {method.description}
                    </Text>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{fee < 0 ? 'Discount' : 'Fee'}</span>
                    </div>
                    <div className={cn("font-medium", fee < 0 && "text-emerald-600")}>
                      {fee < 0 ? `-$${Math.abs(fee).toFixed(2)}` : `$${fee.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-gray-500">{method.fee}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      <Clock className="h-3 w-3" />
                      <span>Processing</span>
                    </div>
                    <div className="font-medium text-sm">{method.processingTime}</div>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Error Display */}
      {errors.paymentMethod && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <Text variant="bodySmall">{errors.paymentMethod}</Text>
          </div>
        </Card>
      )}

      {/* Selected Method Confirmation */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <Text variant="body" weight="semibold" className="text-emerald-800 dark:text-emerald-200">
                  {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name} selected
                </Text>
                <Text variant="bodySmall" className="text-emerald-700 dark:text-emerald-300">
                  Click "Confirm & Pay" below to proceed
                </Text>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Crypto + no-external-wallet guidance — non-blocking, informational */}
      {showCryptoWalletGuidance && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-medium">
                You haven't linked an external wallet yet
              </div>
              <div>
                If you proceed with a crypto payment, your tokens will land in
                your <strong>platform-managed Capimax wallet</strong> instead
                of going directly to MetaMask. You can withdraw them to your
                own wallet anytime after that.
              </div>
              <div className="pt-1">
                <a
                  href="/wallet"
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  Link a wallet first ↗
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Destination preview — once we know the wallet info, show where the
          tokens will end up no matter what method was picked. */}
      {selectedMethod && walletInfo && (() => {
        const showExternal = isCryptoLike && walletInfo.has_external && walletInfo.external_wallet;
        const dest = showExternal ? walletInfo.external_wallet : walletInfo.primary_wallet;
        if (!dest) return null;
        return (
          <Card className="p-3 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tokens will be minted to
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                      showExternal
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                    )}
                  >
                    {showExternal ? 'Your wallet' : 'Platform-managed'}
                  </span>
                </div>
                <code className="block truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                  {dest}
                </code>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Security Notice */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">Secure Payment Processing</div>
            <div>
              All payments are processed through encrypted channels with industry-standard security measures.
              Your financial information is never stored on our servers.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};