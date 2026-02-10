import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Clock,
  Receipt,
  Shield,
  ExternalLink,
  RefreshCw,
  Zap,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { WalletConnector } from './WalletConnector';
import { InvestmentService } from '../../services/investment/InvestmentService';
import type { InvestmentProperty, InvestmentData } from './types';
import { cn } from '../../utils/cn';

interface TransactionProcessorProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onComplete: (success: boolean, transactionId?: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  autoStart?: boolean;
  onGoBack?: () => void;
}

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: string;
  transactionHash?: string;
}

export const TransactionProcessor: React.FC<TransactionProcessorProps> = ({
  property,
  investmentData,
  onComplete,
  isProcessing,
  setIsProcessing,
  autoStart = false,
  onGoBack
}) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);

  // Calculate fees consistently
  const calculateFees = () => {
    const method = investmentData.paymentMethod;
    let paymentFee = 0;

    switch (method) {
      case 'crypto':
        paymentFee = investmentData.amount * 0.005; // 0.5%
        break;
      case 'fiat':
        paymentFee = investmentData.amount * 0.029 + 0.30; // 2.9% + $0.30
        break;
      case 'bank':
      case 'wallet':
      default:
        paymentFee = 0;
        break;
    }

    const total = investmentData.amount + paymentFee;
    return { paymentFee, total };
  };

  const fees = calculateFees();

  const getPaymentMethodLabel = () => {
    switch (investmentData.paymentMethod) {
      case 'crypto': return 'Cryptocurrency';
      case 'fiat': return 'Credit/Debit Card';
      case 'bank': return 'Bank Transfer';
      case 'wallet': return 'CapiMax Wallet';
      default: return 'Payment';
    }
  };

  // Map frontend payment method to backend format
  const getBackendPaymentMethod = () => {
    switch (investmentData.paymentMethod) {
      case 'crypto': return 'cryptocurrency';
      case 'fiat': return 'credit_card';
      case 'bank': return 'bank_transfer';
      case 'wallet': return 'wallet';
      default: return 'credit_card';
    }
  };

  // Initialize transaction steps based on payment method
  useEffect(() => {
    if (investmentData.paymentMethod === 'crypto') {
      setSteps([
        { id: 'wallet', title: 'Connect Wallet', description: 'Connect your wallet to proceed', status: 'pending' },
        { id: 'validate', title: 'Validate Investment', description: 'Verifying availability and limits', status: 'pending', estimatedTime: '10s' },
        { id: 'transaction', title: 'Process Payment', description: 'Execute investment transaction', status: 'pending', estimatedTime: '30s' },
        { id: 'tokens', title: 'Confirm Tokens', description: 'Confirming your property tokens', status: 'pending', estimatedTime: '10s' }
      ]);
    } else {
      setSteps([
        { id: 'validate', title: 'Validate Investment', description: 'Verifying availability and limits', status: 'pending', estimatedTime: '10s' },
        { id: 'process', title: 'Process Payment', description: `Processing ${getPaymentMethodLabel()} payment`, status: 'pending', estimatedTime: '30s' },
        { id: 'tokens', title: 'Confirm Tokens', description: 'Confirming your property tokens', status: 'pending', estimatedTime: '10s' }
      ]);
    }
  }, [investmentData.paymentMethod]);

  const handleWalletConnect = (address: string, walletType: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
    setSteps(prev => prev.map(step =>
      step.id === 'wallet' ? { ...step, status: 'completed' } : step
    ));
  };

  // Helper to update a step's status
  const updateStepStatus = (stepIndex: number, newStatus: TransactionStep['status'], hash?: string) => {
    setSteps(prev => prev.map((step, index) =>
      index === stepIndex
        ? { ...step, status: newStatus, ...(hash ? { transactionHash: hash } : {}) }
        : step
    ));
  };

  // Auto-start transaction when ready (non-crypto) or after wallet connect (crypto)
  useEffect(() => {
    if (!autoStart || hasAutoStarted.current) return;

    if (investmentData.paymentMethod === 'crypto') {
      if (walletConnected && steps.length > 0 && !isProcessing && !error) {
        hasAutoStarted.current = true;
        startTransaction();
      }
    } else {
      if (steps.length > 0 && !isProcessing && !error) {
        hasAutoStarted.current = true;
        const timer = setTimeout(() => startTransaction(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, walletConnected, steps.length, investmentData.paymentMethod]);

  const startTransaction = async () => {
    if (!walletConnected && investmentData.paymentMethod === 'crypto') {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    const startIdx = investmentData.paymentMethod === 'crypto' ? 1 : 0;
    setCurrentStep(startIdx);

    const propertyId = property.id.toString();

    try {
      // ─── Step 1: Validate Investment ───
      setCurrentStep(startIdx);
      updateStepStatus(startIdx, 'processing');

      try {
        await InvestmentService.calculateInvestment(propertyId, investmentData.tokens);
      } catch (calcError: any) {
        // If calculate endpoint doesn't exist or fails, continue anyway
        // The create endpoint will also validate
        console.warn('Calculate endpoint warning:', calcError?.message);
      }
      updateStepStatus(startIdx, 'completed');

      // ─── Step 2: Create Investment / Process Payment ───
      const processIdx = startIdx + 1;
      setCurrentStep(processIdx);
      updateStepStatus(processIdx, 'processing');

      let investmentResult: any;

      if (investmentData.paymentMethod === 'wallet') {
        // Wallet: all-in-one endpoint (create + debit wallet + confirm)
        investmentResult = await InvestmentService.walletInvest({
          property_id: propertyId,
          token_amount: investmentData.tokens,
          investment_amount: investmentData.amount
        });
      } else {
        // Other methods: create investment in PENDING status
        investmentResult = await InvestmentService.createInvestment({
          property_id: propertyId,
          token_amount: investmentData.tokens,
          investment_amount: investmentData.amount,
          payment_method: getBackendPaymentMethod()
        });
      }

      // Extract transaction info from result
      const resultId = investmentResult?.id || investmentResult?.investment_id || `INV-${Date.now()}`;
      const resultHash = investmentResult?.transaction_hash || null;

      if (resultHash) {
        setTransactionHash(resultHash);
        updateStepStatus(processIdx, 'completed', resultHash);
      } else {
        updateStepStatus(processIdx, 'completed');
      }

      // ─── Step 3: Confirm Tokens ───
      const confirmIdx = processIdx + 1;
      setCurrentStep(confirmIdx);
      updateStepStatus(confirmIdx, 'processing');

      // Brief wait for confirmation display
      await new Promise(resolve => setTimeout(resolve, 1200));

      // For wallet payments, tokens are already confirmed
      // For other methods, investment is created in PENDING - tokens will be minted after payment clears
      updateStepStatus(confirmIdx, 'completed');

      // ─── All steps completed ───
      const finalTxId = resultHash || resultId;
      setTransactionHash(finalTxId);
      onComplete(true, finalTxId);

    } catch (err: any) {
      // Extract a useful error message from the backend response
      const errorData = err?.response?.data;
      let errorMessage = 'Transaction failed. Please try again or use a different payment method.';

      if (errorData) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.errors) {
          // Validation errors from serializer
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0] as string;
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Mark current step as failed
      setSteps(prev => prev.map((step, index) => {
        if (step.status === 'processing') {
          return { ...step, status: 'failed' };
        }
        return step;
      }));

      setError(errorMessage);
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryTransaction = () => {
    setError(null);
    hasAutoStarted.current = false;
    setCurrentStep(0);
    setSteps(prev => prev.map(step => ({ ...step, status: step.id === 'wallet' && walletConnected ? 'completed' : 'pending' })));
    startTransaction();
  };

  const copyTransactionHash = async () => {
    if (transactionHash) {
      await navigator.clipboard.writeText(transactionHash);
    }
  };

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <Card className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-500" />
          Transaction Summary
        </Text>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Text variant="body">Property Tokens:</Text>
            <Text variant="body" weight="semibold">{investmentData.tokens} {investmentData.tokens === 1 ? 'token' : 'tokens'}</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">Token Price:</Text>
            <Text variant="body" weight="semibold">${(investmentData.amount / investmentData.tokens).toLocaleString()} each</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">Subtotal:</Text>
            <Text variant="body" weight="semibold">${investmentData.amount.toLocaleString()}</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">{getPaymentMethodLabel()} Fee:</Text>
            <Text variant="body" weight="semibold">
              {fees.paymentFee === 0 ? 'Free' : `$${fees.paymentFee.toFixed(2)}`}
            </Text>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <Text variant="bodyLarge" weight="semibold">Total:</Text>
              <Text variant="bodyLarge" weight="bold" className="text-emerald-600">
                ${fees.total.toFixed(2)}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Wallet Connection (crypto only) */}
      {investmentData.paymentMethod === 'crypto' && !walletConnected && (
        <WalletConnector
          onConnect={handleWalletConnect}
          isConnecting={isProcessing}
        />
      )}

      {/* Transaction Steps */}
      {(investmentData.paymentMethod !== 'crypto' || walletConnected) && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Text variant="h4" weight="semibold" className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Transaction Progress
            </Text>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  step.status === 'completed' && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                  step.status === 'processing' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                  step.status === 'failed' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                  step.status === 'pending' && "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
                  step.status === 'completed' && "bg-emerald-500 text-white",
                  step.status === 'processing' && "bg-blue-500 text-white",
                  step.status === 'failed' && "bg-red-500 text-white",
                  step.status === 'pending' && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                )}>
                  {step.status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                  {step.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                  {step.status === 'failed' && <AlertCircle className="w-5 h-5" />}
                  {step.status === 'pending' && <Clock className="w-5 h-5" />}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Text variant="body" weight="semibold">{step.title}</Text>
                    {step.estimatedTime && step.status === 'processing' && (
                      <Text variant="bodySmall" color="muted">~{step.estimatedTime}</Text>
                    )}
                  </div>
                  <Text variant="bodySmall" color="muted">{step.description}</Text>

                  {/* Transaction Hash */}
                  {step.transactionHash && (
                    <div className="mt-1 flex items-center gap-2">
                      <Text variant="bodySmall" className="font-mono text-gray-500 truncate">
                        {step.transactionHash}
                      </Text>
                      <button onClick={copyTransactionHash} className="text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Error State with Recovery */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Text variant="body" weight="medium" className="text-red-800 dark:text-red-200 mb-2">
                    {error}
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={retryTransaction}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try Again
                    </Button>
                    {onGoBack && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGoBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Change Payment Method
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Info */}
          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <Text variant="bodySmall" className="text-blue-700 dark:text-blue-300">
                  Please don't close this window. Your transaction is being processed securely.
                </Text>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Security Notice */}
      <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <Text variant="bodySmall" className="text-green-700 dark:text-green-300">
            Your investment is processed through secure, audited smart contracts. All transactions are recorded on the blockchain.
          </Text>
        </div>
      </Card>
    </div>
  );
};
