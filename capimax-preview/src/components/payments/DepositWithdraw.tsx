import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  CreditCard, 
  Building2, 
  Smartphone,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  Copy,
  QrCode
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo, ALL_CURRENCIES } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';

interface DepositWithdrawProps {
  className?: string;
  mode?: 'deposit' | 'withdraw';
  onClose?: () => void;
}

export function DepositWithdraw({ className, mode: initialMode = 'deposit', onClose }: DepositWithdrawProps) {
  const { state, getBalance, addTransaction, setError } = usePayment();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);
  const [step, setStep] = useState<'method' | 'amount' | 'confirm' | 'processing' | 'complete'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'crypto' | 'card' | 'bank' | 'paypal'>('crypto');
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [processingTx, setProcessingTx] = useState<any>(null);

  const isDeposit = mode === 'deposit';
  const availableBalance = getBalance(selectedCurrency);
  const minAmount = isDeposit ? 0.001 : 0.001;
  const maxAmount = isDeposit ? Infinity : availableBalance;

  const handleMethodSelect = (method: 'crypto' | 'card' | 'bank' | 'paypal') => {
    setSelectedMethod(method);
    setStep('amount');
  };

  const handleAmountConfirm = () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount < minAmount) {
      setError(`Minimum amount is ${formatCurrency(minAmount, selectedCurrency)}`);
      return;
    }
    
    if (!isDeposit && numAmount > maxAmount) {
      setError(`Insufficient balance. Available: ${formatCurrency(availableBalance, selectedCurrency)}`);
      return;
    }
    
    setStep('confirm');
  };

  const handleConfirmTransaction = async () => {
    setStep('processing');
    
    // Create transaction
    const transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: isDeposit ? 'deposit' : 'withdrawal' as const,
      status: 'processing' as const,
      amount: parseFloat(amount),
      currency: selectedCurrency,
      paymentMethod: {
        type: selectedMethod,
        currency: selectedMethod === 'crypto' ? selectedCurrency : 'USD',
        network: selectedMethod === 'crypto' ? 'ethereum' : undefined,
      } as any,
      timestamp: new Date(),
      description: `${isDeposit ? 'Deposit' : 'Withdraw'} ${formatCurrency(parseFloat(amount), selectedCurrency)}`,
      fee: selectedMethod === 'crypto' ? 0.001 : parseFloat(amount) * 0.025, // Example fees
    };
    
    setProcessingTx(transaction);
    addTransaction(transaction);
    
    // Simulate processing time
    setTimeout(() => {
      setStep('complete');
    }, 3000);
  };

  const resetForm = () => {
    setStep('method');
    setAmount('');
    setProcessingTx(null);
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isDeposit ? 'Add Funds' : 'Withdraw Funds'}
        </h3>
        <p className="text-sm text-gray-600">
          {isDeposit 
            ? 'Choose your preferred deposit method'
            : 'Select how you\'d like to receive your funds'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-emerald-300"
          onClick={() => handleMethodSelect('crypto')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Cryptocurrency</h4>
              <p className="text-sm text-gray-600">ETH, BTC, USDT, USDC</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-emerald-300"
          onClick={() => handleMethodSelect('card')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Credit/Debit Card</h4>
              <p className="text-sm text-gray-600">Visa, Mastercard, Amex</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-emerald-300"
          onClick={() => handleMethodSelect('bank')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Bank Transfer</h4>
              <p className="text-sm text-gray-600">ACH, Wire transfer</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-emerald-300"
          onClick={() => handleMethodSelect('paypal')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">PayPal</h4>
              <p className="text-sm text-gray-600">Digital payments</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderAmountInput = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Enter Amount
        </h3>
        <p className="text-sm text-gray-600">
          {isDeposit ? 'How much would you like to add?' : 'How much would you like to withdraw?'}
        </p>
      </div>

      <div className="space-y-4">
        {selectedMethod === 'crypto' && (
          <Select
            label="Currency"
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            options={ALL_CURRENCIES.map(currency => {
              const info = getCurrencyInfo(currency);
              return {
                value: currency,
                label: `${info.name} (${info.symbol})`
              };
            })}
          />
        )}

        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Enter amount in ${selectedCurrency}`}
          step={selectedMethod === 'crypto' ? '0.000001' : '0.01'}
        />

        {!isDeposit && (
          <div className="text-sm text-gray-600">
            Available balance: {formatCurrency(availableBalance, selectedCurrency)}
          </div>
        )}

        {amount && (
          <Card className="p-4 bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>{formatCurrency(parseFloat(amount) || 0, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fee:</span>
                <span>
                  {selectedMethod === 'crypto' 
                    ? formatCurrency(0.001, selectedCurrency)
                    : formatCurrency((parseFloat(amount) || 0) * 0.025, selectedCurrency)
                  }
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total:</span>
                <span>
                  {isDeposit 
                    ? formatCurrency((parseFloat(amount) || 0) + (selectedMethod === 'crypto' ? 0.001 : (parseFloat(amount) || 0) * 0.025), selectedCurrency)
                    : formatCurrency(parseFloat(amount) || 0, selectedCurrency)
                  }
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setStep('method')}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleAmountConfirm}
          disabled={!amount || parseFloat(amount) < minAmount}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm {isDeposit ? 'Deposit' : 'Withdrawal'}
        </h3>
        <p className="text-sm text-gray-600">
          Please review your transaction details
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Amount:</span>
            <span className="text-lg font-semibold">{formatCurrency(parseFloat(amount), selectedCurrency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Method:</span>
            <span className="capitalize">{selectedMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Fee:</span>
            <span>
              {selectedMethod === 'crypto' 
                ? formatCurrency(0.001, selectedCurrency)
                : formatCurrency(parseFloat(amount) * 0.025, selectedCurrency)
              }
            </span>
          </div>
        </div>
      </Card>

      {selectedMethod === 'crypto' && isDeposit && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Important:</p>
              <p>Only send {selectedCurrency} to this address. Sending other currencies may result in loss of funds.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setStep('amount')}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleConfirmTransaction}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isDeposit ? 'Confirm Deposit' : 'Confirm Withdrawal'}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <Clock className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Processing Transaction
        </h3>
        <p className="text-sm text-gray-600">
          Please wait while we process your {isDeposit ? 'deposit' : 'withdrawal'}
        </p>
      </div>

      {processingTx && (
        <Card className="p-4 bg-blue-50 border-blue-200 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono text-xs">{processingTx.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(processingTx.amount, processingTx.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="capitalize">{processingTx.status}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Transaction Complete
        </h3>
        <p className="text-sm text-gray-600">
          Your {isDeposit ? 'deposit' : 'withdrawal'} has been processed successfully
        </p>
      </div>

      {processingTx && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono text-xs">{processingTx.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(processingTx.amount, processingTx.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>New Balance:</span>
              <span>{formatCurrency(getBalance(processingTx.currency), processingTx.currency)}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={resetForm} className="flex-1">
          {isDeposit ? 'Deposit More' : 'Withdraw More'}
        </Button>
        <Button onClick={onClose} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-md mx-auto">
        <div className="p-6">
          {/* Mode Toggle */}
          <div className="flex mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => {
                setMode('deposit');
                resetForm();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'deposit'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit
            </button>
            <button
              onClick={() => {
                setMode('withdraw');
                resetForm();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'withdraw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 'method' && renderMethodSelection()}
              {step === 'amount' && renderAmountInput()}
              {step === 'confirm' && renderConfirmation()}
              {step === 'processing' && renderProcessing()}
              {step === 'complete' && renderComplete()}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

export default DepositWithdraw;