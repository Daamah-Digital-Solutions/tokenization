import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Copy,
  ExternalLink,
  Settings,
  Zap,
  Shield
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo, CRYPTO_CURRENCIES } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';

interface CryptoPaymentFormProps {
  amount: number;
  onPaymentComplete?: (txHash: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface GasFeeEstimate {
  slow: { price: number; time: string };
  standard: { price: number; time: string };
  fast: { price: number; time: string };
}

interface NetworkInfo {
  chainId: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
}

const SUPPORTED_NETWORKS: Record<string, NetworkInfo> = {
  ethereum: {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  polygon: {
    chainId: '0x89',
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com/',
    blockExplorer: 'https://polygonscan.com'
  },
  bsc: {
    chainId: '0x38',
    name: 'BSC',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com'
  }
};

export function CryptoPaymentForm({ amount, onPaymentComplete, onCancel, className }: CryptoPaymentFormProps) {
  const { state, convertCurrency, addTransaction, setError } = usePayment();
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [cryptoAmount, setCryptoAmount] = useState<number>(0);
  const [gasEstimates, setGasEstimates] = useState<GasFeeEstimate | null>(null);
  const [selectedGasOption, setSelectedGasOption] = useState<'slow' | 'standard' | 'fast'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [step, setStep] = useState<'setup' | 'confirm' | 'processing' | 'complete'>('setup');
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Update crypto amount when currency or USD amount changes
  useEffect(() => {
    const updateCryptoAmount = async () => {
      try {
        const converted = await convertCurrency(amount, 'USD', selectedCurrency);
        setCryptoAmount(converted);
      } catch (error) {
        console.error('Failed to convert currency:', error);
        setCryptoAmount(0);
      }
    };

    updateCryptoAmount();
  }, [amount, selectedCurrency, convertCurrency]);

  // Get wallet balance for selected currency
  useEffect(() => {
    const balance = state.balances.find(b => b.currency === selectedCurrency)?.balance || 0;
    setWalletBalance(balance);
  }, [selectedCurrency, state.balances]);

  // Fetch gas estimates
  useEffect(() => {
    const fetchGasEstimates = async () => {
      // Mock gas estimates - in production, fetch from actual network
      const mockEstimates: GasFeeEstimate = {
        slow: { price: 0.001, time: '5-10 min' },
        standard: { price: 0.003, time: '2-5 min' },
        fast: { price: 0.008, time: '< 2 min' }
      };
      setGasEstimates(mockEstimates);
    };

    fetchGasEstimates();
  }, [selectedNetwork]);

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    
    // Auto-select appropriate network based on currency
    const currencyInfo = getCurrencyInfo(currency);
    if (currencyInfo.network) {
      setSelectedNetwork(currencyInfo.network);
    }
  };

  const handleNetworkSwitch = async (network: string) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SUPPORTED_NETWORKS[network].chainId }],
      });
      setSelectedNetwork(network);
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to wallet, add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SUPPORTED_NETWORKS[network].chainId,
              chainName: SUPPORTED_NETWORKS[network].name,
              rpcUrls: [SUPPORTED_NETWORKS[network].rpcUrl],
              blockExplorerUrls: [SUPPORTED_NETWORKS[network].blockExplorer],
            }],
          });
          setSelectedNetwork(network);
        } catch (addError) {
          setError('Failed to add network to wallet');
        }
      } else {
        setError('Failed to switch network');
      }
    }
  };

  const handlePayment = async () => {
    if (!window.ethereum) {
      setError('Please connect your wallet first');
      return;
    }

    if (cryptoAmount > walletBalance) {
      setError(`Insufficient balance. You need ${formatCurrency(cryptoAmount, selectedCurrency)}`);
      return;
    }

    setStep('confirm');
  };

  const confirmPayment = async () => {
    setIsProcessing(true);
    setStep('processing');

    try {
      // Get accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Calculate gas fee
      const gasFee = gasEstimates?.[selectedGasOption]?.price || 0;
      const totalAmount = cryptoAmount + gasFee;

      if (totalAmount > walletBalance) {
        throw new Error(`Insufficient balance including gas fee. Need ${formatCurrency(totalAmount, selectedCurrency)}`);
      }

      // Mock transaction - in production, use actual Web3 transaction
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create transaction record
      const transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'investment' as const,
        status: 'completed' as const,
        amount: cryptoAmount,
        currency: selectedCurrency,
        paymentMethod: {
          type: 'crypto' as const,
          currency: selectedCurrency,
          network: selectedNetwork,
          address: accounts[0],
        },
        timestamp: new Date(),
        description: `Investment payment of ${formatCurrency(cryptoAmount, selectedCurrency)}`,
        fee: gasFee,
        txHash: mockTxHash,
      };

      addTransaction(transaction);
      setTransactionHash(mockTxHash);
      setStep('complete');
      
      onPaymentComplete?.(mockTxHash);

    } catch (error: any) {
      console.error('Payment failed:', error);
      setError(error.message || 'Payment failed');
      setStep('setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Crypto Payment
        </h3>
        <p className="text-sm text-gray-600">
          Pay {formatCurrency(amount, 'USD')} with cryptocurrency
        </p>
      </div>

      <div className="space-y-4">
        {/* Currency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Currency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CRYPTO_CURRENCIES.map(currency => {
              const info = getCurrencyInfo(currency);
              return (
                <button
                  key={currency}
                  onClick={() => handleCurrencyChange(currency)}
                  className={`p-3 border rounded-lg text-center transition-all ${
                    selectedCurrency === currency
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{info.symbol}</div>
                  <div className="text-xs text-gray-500">{info.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Network Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Network
          </label>
          <Select
            value={selectedNetwork}
            onChange={setSelectedNetwork}
            options={Object.entries(SUPPORTED_NETWORKS).map(([key, network]) => ({
              value: key,
              label: network.name
            }))}
          />
        </div>

        {/* Amount Display */}
        <Card className="p-4 bg-gray-50">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Amount (USD):</span>
              <span className="font-medium">{formatCurrency(amount, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount ({selectedCurrency}):</span>
              <span className="font-semibold text-lg">
                {formatCurrency(cryptoAmount, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Wallet Balance:</span>
              <span>{formatCurrency(walletBalance, selectedCurrency)}</span>
            </div>
          </div>
        </Card>

        {/* Gas Fee Selection */}
        {gasEstimates && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Speed & Fee
            </label>
            <div className="space-y-2">
              {Object.entries(gasEstimates).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => setSelectedGasOption(key as any)}
                  className={`w-full p-3 border rounded-lg text-left transition-all ${
                    selectedGasOption === key
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium capitalize">{key}</div>
                      <div className="text-sm text-gray-600">{option.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(option.price, selectedCurrency)}</div>
                      <div className="text-sm text-gray-600">Gas Fee</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {cryptoAmount > walletBalance && (
          <Card className="p-3 bg-red-50 border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">
                Insufficient balance. Need {formatCurrency(cryptoAmount - walletBalance, selectedCurrency)} more.
              </span>
            </div>
          </Card>
        )}

        {selectedNetwork !== getCurrencyInfo(selectedCurrency).network && (
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Network mismatch detected
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleNetworkSwitch(getCurrencyInfo(selectedCurrency).network || 'ethereum')}
              >
                Switch Network
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handlePayment}
          disabled={cryptoAmount > walletBalance || cryptoAmount === 0}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Payment
        </h3>
        <p className="text-sm text-gray-600">
          Please review your transaction details
        </p>
      </div>

      <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Payment Amount:</span>
            <span className="font-semibold">{formatCurrency(cryptoAmount, selectedCurrency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Gas Fee ({selectedGasOption}):</span>
            <span>{formatCurrency(gasEstimates?.[selectedGasOption]?.price || 0, selectedCurrency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{SUPPORTED_NETWORKS[selectedNetwork].name}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Total:</span>
            <span>{formatCurrency((cryptoAmount + (gasEstimates?.[selectedGasOption]?.price || 0)), selectedCurrency)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Secure Transaction</div>
            <div>This transaction will be processed on the blockchain and cannot be reversed.</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
          Back
        </Button>
        <Button
          onClick={confirmPayment}
          disabled={isProcessing}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isProcessing ? 'Processing...' : 'Confirm Payment'}
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
          Processing Payment
        </h3>
        <p className="text-sm text-gray-600">
          Please wait while your transaction is being processed on the blockchain
        </p>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>{formatCurrency(cryptoAmount, selectedCurrency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{SUPPORTED_NETWORKS[selectedNetwork].name}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Time:</span>
            <span>{gasEstimates?.[selectedGasOption]?.time}</span>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Payment Complete
        </h3>
        <p className="text-sm text-gray-600">
          Your payment has been successfully processed
        </p>
      </div>

      {transactionHash && (
        <Card className="p-4 bg-emerald-50 border-emerald-200 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Transaction Hash:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(transactionHash)}
                  className="p-1 hover:bg-emerald-200 rounded"
                >
                  <Copy className="h-3 w-3 text-emerald-600" />
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(cryptoAmount, selectedCurrency)}</span>
            </div>
            <div className="pt-2 border-t">
              <button
                onClick={() => window.open(`${SUPPORTED_NETWORKS[selectedNetwork].blockExplorer}/tx/${transactionHash}`, '_blank')}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800"
              >
                <ExternalLink className="h-3 w-3" />
                <span>View on Explorer</span>
              </button>
            </div>
          </div>
        </Card>
      )}

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
            {step === 'setup' && renderSetup()}
            {step === 'confirm' && renderConfirm()}
            {step === 'processing' && renderProcessing()}
            {step === 'complete' && renderComplete()}
          </motion.div>
        </div>
      </Card>
    </div>
  );
}

export default CryptoPaymentForm;