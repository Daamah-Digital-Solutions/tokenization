import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Copy
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { WalletConnector } from './WalletConnector';
import { Property, InvestmentData } from './InvestmentFlow';
import { cn } from '../../utils/cn';

interface TransactionProcessorProps {
  property: Property;
  investmentData: InvestmentData;
  onComplete: (success: boolean, transactionId?: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
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
  setIsProcessing
}) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string>('0.05');
  const [error, setError] = useState<string | null>(null);

  // Initialize transaction steps based on payment method
  useEffect(() => {
    const initializeSteps = () => {
      if (investmentData.paymentMethod === 'crypto') {
        setSteps([
          {
            id: 'wallet',
            title: 'Connect Wallet',
            description: 'Connect your wallet to proceed',
            status: 'pending'
          },
          {
            id: 'approve',
            title: 'Approve Token',
            description: 'Approve token spending',
            status: 'pending',
            estimatedTime: '30 seconds'
          },
          {
            id: 'transaction',
            title: 'Process Payment',
            description: 'Execute investment transaction',
            status: 'pending',
            estimatedTime: '2-5 minutes'
          },
          {
            id: 'confirm',
            title: 'Blockchain Confirmation',
            description: 'Wait for network confirmation',
            status: 'pending',
            estimatedTime: '1-3 minutes'
          },
          {
            id: 'tokens',
            title: 'Mint Property Tokens',
            description: 'Create your property tokens',
            status: 'pending',
            estimatedTime: '1-2 minutes'
          }
        ]);
      } else {
        setSteps([
          {
            id: 'validate',
            title: 'Validate Payment',
            description: 'Verify payment information',
            status: 'pending',
            estimatedTime: '10 seconds'
          },
          {
            id: 'process',
            title: 'Process Payment',
            description: 'Charge payment method',
            status: 'pending',
            estimatedTime: '30 seconds'
          },
          {
            id: 'verify',
            title: 'Bank Verification',
            description: 'Verify with financial institution',
            status: 'pending',
            estimatedTime: '1-2 minutes'
          },
          {
            id: 'tokens',
            title: 'Mint Property Tokens',
            description: 'Create your property tokens',
            status: 'pending',
            estimatedTime: '30 seconds'
          }
        ]);
      }
    };

    initializeSteps();
  }, [investmentData.paymentMethod]);

  const handleWalletConnect = (address: string, walletType: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
    
    // Mark wallet step as completed
    setSteps(prev => prev.map((step, index) => 
      step.id === 'wallet' 
        ? { ...step, status: 'completed' }
        : step
    ));
  };

  const startTransaction = async () => {
    if (!walletConnected && investmentData.paymentMethod === 'crypto') {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep(investmentData.paymentMethod === 'crypto' ? 1 : 0);

    try {
      // Process each step
      for (let i = (investmentData.paymentMethod === 'crypto' ? 1 : 0); i < steps.length; i++) {
        setCurrentStep(i);
        
        // Update step to processing
        setSteps(prev => prev.map((step, index) => 
          index === i 
            ? { ...step, status: 'processing' }
            : step
        ));

        // Simulate step processing time
        const stepDelay = [2000, 3000, 4000, 2000, 2000][i] || 2000;
        await new Promise(resolve => setTimeout(resolve, stepDelay));

        // Add transaction hash for blockchain steps
        if (steps[i]?.id === 'transaction' || steps[i]?.id === 'approve') {
          const mockHash = `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 8)}`;
          setTransactionHash(mockHash);
          setSteps(prev => prev.map((step, index) => 
            index === i 
              ? { ...step, status: 'completed', transactionHash: mockHash }
              : step
          ));
        } else {
          // Mark step as completed
          setSteps(prev => prev.map((step, index) => 
            index === i 
              ? { ...step, status: 'completed' }
              : step
          ));
        }
      }

      // All steps completed successfully
      const finalTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      setTransactionHash(finalTransactionHash);
      onComplete(true, finalTransactionHash);
      
    } catch (err) {
      // Mark current step as failed
      setSteps(prev => prev.map((step, index) => 
        index === currentStep 
          ? { ...step, status: 'failed' }
          : step
      ));
      
      setError('Transaction failed. Please try again.');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryTransaction = () => {
    setError(null);
    setCurrentStep(0);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    startTransaction();
  };

  const copyTransactionHash = async () => {
    if (transactionHash) {
      await navigator.clipboard.writeText(transactionHash);
      // Could add toast notification here
    }
  };

  const calculateFees = () => {
    const gasFee = parseFloat(gasPrice);
    const platformFee = investmentData.amount * 0.01; // 1% platform fee
    const total = investmentData.amount + gasFee + platformFee;
    
    return { gasFee, platformFee, total };
  };

  const fees = calculateFees();

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <Card className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-500" />
          Transaction Summary
        </Text>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Text variant="body">Investment Amount:</Text>
            <Text variant="body" weight="semibold">${investmentData.amount.toLocaleString()}</Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text variant="body">Property Tokens:</Text>
            <Text variant="body" weight="semibold">{investmentData.tokens} tokens</Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text variant="body">Platform Fee:</Text>
            <Text variant="body" weight="semibold">${fees.platformFee.toFixed(2)}</Text>
          </div>
          
          {investmentData.paymentMethod === 'crypto' && (
            <div className="flex justify-between items-center">
              <Text variant="body">Estimated Gas Fee:</Text>
              <div className="flex items-center gap-2">
                <Text variant="body" weight="semibold">${fees.gasFee} ETH</Text>
                <Button variant="ghost" size="sm" className="p-1">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <Text variant="bodyLarge" weight="semibold">Total Amount:</Text>
              <Text variant="bodyLarge" weight="bold" className="text-emerald-600">
                ${fees.total.toFixed(2)}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Wallet Connection (for crypto payments) */}
      {investmentData.paymentMethod === 'crypto' && !walletConnected && (
        <WalletConnector
          onConnect={handleWalletConnect}
          isConnecting={isProcessing}
        />
      )}

      {/* Transaction Steps */}
      {((investmentData.paymentMethod === 'crypto' && walletConnected) || investmentData.paymentMethod === 'fiat') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Text variant="h4" weight="semibold" className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Transaction Progress
            </Text>
            {!isProcessing && !error && (
              <Button
                variant="primary"
                onClick={startTransaction}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Start Transaction
              </Button>
            )}
          </div>

          <div className="space-y-4">
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
                  "flex items-center justify-center w-10 h-10 rounded-full",
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
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Text variant="bodyLarge" weight="semibold">
                      {step.title}
                    </Text>
                    {step.estimatedTime && step.status === 'processing' && (
                      <Text variant="bodySmall" color="muted">
                        Est. {step.estimatedTime}
                      </Text>
                    )}
                  </div>
                  <Text variant="body" color="muted">
                    {step.description}
                  </Text>
                  
                  {/* Transaction Hash */}
                  {step.transactionHash && (
                    <div className="mt-2 flex items-center gap-2">
                      <Text variant="bodySmall" className="font-mono text-gray-600 dark:text-gray-400">
                        {step.transactionHash}
                      </Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyTransactionHash}
                        className="p-1"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <Text variant="bodySmall">{error}</Text>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryTransaction}
                  className="text-red-600 hover:text-red-700"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Processing State Info */}
          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <Text variant="bodySmall" weight="medium" className="text-blue-800 dark:text-blue-200 mb-1">
                    Transaction in Progress
                  </Text>
                  <Text variant="bodySmall" className="text-blue-700 dark:text-blue-300">
                    Please don't close this window or navigate away. Your transaction is being processed securely.
                  </Text>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Security Notice */}
      <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <Text variant="bodySmall" weight="semibold" className="text-green-800 dark:text-green-200 mb-1">
              Secure Transaction Processing
            </Text>
            <Text variant="bodySmall" className="text-green-700 dark:text-green-300 leading-relaxed">
              Your investment is processed through secure, audited smart contracts. All transactions are recorded 
              immutably on the blockchain for complete transparency and security.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};