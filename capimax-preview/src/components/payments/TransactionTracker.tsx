import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Bell,
  Filter,
  Calendar,
  Search
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';

interface TransactionTrackerProps {
  className?: string;
  transactionId?: string;
  compact?: boolean;
}

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  timestamp?: Date;
  details?: string;
  link?: string;
}

export function TransactionTracker({ className, transactionId, compact = false }: TransactionTrackerProps) {
  const { state, updateTransaction, dispatch } = usePayment();
  const [selectedTx, setSelectedTx] = useState<string | null>(transactionId || null);
  const [isTracking, setIsTracking] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    type: 'all',
    timeRange: '30days'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);

  const transaction = selectedTx 
    ? state.transactions.find(tx => tx.id === selectedTx) 
    : null;

  // Get transaction steps based on type and payment method
  const getTransactionSteps = (tx: any): TransactionStep[] => {
    if (!tx) return [];

    const baseSteps: TransactionStep[] = [];

    // Common initial steps
    baseSteps.push({
      id: 'initiated',
      title: 'Transaction Initiated',
      description: 'Payment request created',
      status: 'completed',
      timestamp: tx.timestamp,
      details: `${tx.type} of ${formatCurrency(tx.amount, tx.currency)}`
    });

    // Payment method specific steps
    if (tx.paymentMethod.type === 'crypto') {
      baseSteps.push(
        {
          id: 'wallet_connected',
          title: 'Wallet Connected',
          description: 'Cryptocurrency wallet connected',
          status: 'completed',
          timestamp: new Date(tx.timestamp.getTime() + 30000),
          details: `Connected to ${tx.paymentMethod.network} network`
        },
        {
          id: 'transaction_signed',
          title: 'Transaction Signed',
          description: 'Transaction signed in wallet',
          status: tx.status === 'failed' ? 'failed' : 'completed',
          timestamp: new Date(tx.timestamp.getTime() + 60000),
          details: tx.txHash ? `Tx Hash: ${tx.txHash}` : undefined
        }
      );

      if (tx.confirmations !== undefined) {
        baseSteps.push({
          id: 'confirmations',
          title: 'Network Confirmations',
          description: `Waiting for network confirmations`,
          status: tx.confirmations >= 12 ? 'completed' : 
                 tx.status === 'failed' ? 'failed' : 'current',
          timestamp: tx.confirmations > 0 ? new Date(tx.timestamp.getTime() + 120000) : undefined,
          details: `${tx.confirmations || 0}/12 confirmations`,
          link: tx.txHash ? `https://etherscan.io/tx/${tx.txHash}` : undefined
        });
      }
    }

    if (tx.paymentMethod.type === 'card') {
      baseSteps.push(
        {
          id: 'card_processing',
          title: 'Card Processing',
          description: 'Processing card payment',
          status: tx.status === 'failed' ? 'failed' : 'completed',
          timestamp: new Date(tx.timestamp.getTime() + 30000),
          details: `Card ending in ${tx.paymentMethod.last4}`
        },
        {
          id: 'payment_authorized',
          title: 'Payment Authorized',
          description: 'Payment authorized by card issuer',
          status: tx.status === 'failed' ? 'failed' : 'completed',
          timestamp: new Date(tx.timestamp.getTime() + 60000)
        }
      );
    }

    if (tx.paymentMethod.type === 'bank') {
      baseSteps.push(
        {
          id: 'bank_transfer',
          title: 'Bank Transfer Initiated',
          description: 'Transfer initiated from your bank',
          status: tx.status === 'pending' ? 'current' : 
                 tx.status === 'failed' ? 'failed' : 'completed',
          timestamp: new Date(tx.timestamp.getTime() + 300000),
          details: 'Processing time: 1-3 business days'
        }
      );
    }

    // Final steps
    baseSteps.push({
      id: 'completed',
      title: 'Payment Complete',
      description: 'Payment successfully processed',
      status: tx.status === 'completed' ? 'completed' :
              tx.status === 'failed' ? 'failed' : 'pending',
      timestamp: tx.status === 'completed' ? new Date(tx.timestamp.getTime() + 180000) : undefined,
      details: tx.status === 'completed' ? 'Funds have been credited to your account' : undefined
    });

    return baseSteps;
  };

  // Simulate real-time updates
  useEffect(() => {
    if (!selectedTx || !transaction || transaction.status === 'completed' || transaction.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      // Simulate progress updates
      if (transaction.paymentMethod.type === 'crypto' && transaction.confirmations !== undefined) {
        const newConfirmations = Math.min((transaction.confirmations || 0) + 1, 12);
        updateTransaction(transaction.id, { confirmations: newConfirmations });
        
        if (newConfirmations >= 12 && transaction.status === 'processing') {
          updateTransaction(transaction.id, { status: 'completed' });
          setNotifications(prev => [...prev, `Transaction ${transaction.id} completed!`]);
        }
      } else if (Math.random() > 0.7) {
        // Random status updates for demo
        const statuses = ['processing', 'completed'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        if (newStatus !== transaction.status) {
          updateTransaction(transaction.id, { status: newStatus as any });
          setNotifications(prev => [...prev, `Transaction ${transaction.id} status updated to ${newStatus}`]);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTx, transaction, updateTransaction]);

  // Auto-refresh transactions
  const handleRefresh = () => {
    setIsTracking(true);
    // In a real app, this would fetch fresh data from API
    setTimeout(() => {
      setIsTracking(false);
    }, 1000);
  };

  // Filter transactions
  const filteredTransactions = state.transactions.filter(tx => {
    const matchesSearch = !searchQuery || 
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filter.status === 'all' || tx.status === filter.status;
    const matchesType = filter.type === 'all' || tx.type === filter.type;
    
    // Time range filter
    let matchesTime = true;
    const now = new Date();
    const txDate = new Date(tx.timestamp);
    
    switch (filter.timeRange) {
      case '24h':
        matchesTime = (now.getTime() - txDate.getTime()) <= (24 * 60 * 60 * 1000);
        break;
      case '7days':
        matchesTime = (now.getTime() - txDate.getTime()) <= (7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        matchesTime = (now.getTime() - txDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesTime;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderTransactionDetails = () => {
    if (!transaction) return null;

    const steps = getTransactionSteps(transaction);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Transaction Details
            </h3>
            <p className="text-sm text-gray-600">
              Track the progress of your transaction
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isTracking}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isTracking ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Transaction Summary */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-semibold text-gray-900">{transaction.description}</div>
              <div className="text-sm text-gray-600">
                ID: {transaction.id}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(transaction.status)}
              <span className={`text-sm font-medium capitalize ${
                transaction.status === 'completed' ? 'text-emerald-600' :
                transaction.status === 'failed' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {transaction.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <div className="font-semibold">
                {formatCurrency(transaction.amount, transaction.currency)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Method:</span>
              <div className="font-semibold capitalize">
                {transaction.paymentMethod.type}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Started:</span>
              <div className="font-semibold">
                {transaction.timestamp.toLocaleDateString()} at {transaction.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Fee:</span>
              <div className="font-semibold">
                {transaction.fee ? formatCurrency(transaction.fee, transaction.currency) : 'No fee'}
              </div>
            </div>
          </div>
        </Card>

        {/* Progress Steps */}
        <Card className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Progress</h4>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-emerald-100' :
                  step.status === 'current' ? 'bg-yellow-100' :
                  step.status === 'failed' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  {step.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  )}
                  {step.status === 'current' && (
                    <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
                  )}
                  {step.status === 'failed' && (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className={`font-medium ${
                      step.status === 'completed' ? 'text-gray-900' :
                      step.status === 'current' ? 'text-gray-900' :
                      step.status === 'failed' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </h5>
                    {step.timestamp && (
                      <span className="text-xs text-gray-500">
                        {step.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${
                    step.status === 'pending' ? 'text-gray-500' : 'text-gray-700'
                  }`}>
                    {step.description}
                  </p>
                  {step.details && (
                    <p className="text-xs text-gray-600 mt-1">
                      {step.details}
                    </p>
                  )}
                  {step.link && (
                    <button
                      onClick={() => window.open(step.link, '_blank')}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on blockchain
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-900 mb-2">Recent Updates</h5>
                <div className="space-y-1">
                  {notifications.slice(-3).map((notification, index) => (
                    <p key={index} className="text-sm text-blue-800">
                      {notification}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderTransactionList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          All Transactions
        </h3>
        <Button
          onClick={handleRefresh}
          disabled={isTracking}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isTracking ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px]"
            icon={<Search className="h-4 w-4 text-gray-400" />}
          />
          
          <Select
            value={filter.status}
            onChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
          
          <Select
            value={filter.type}
            onChange={(value) => setFilter(prev => ({ ...prev, type: value }))}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'investment', label: 'Investment' },
              { value: 'deposit', label: 'Deposit' },
              { value: 'withdrawal', label: 'Withdrawal' },
              { value: 'dividend', label: 'Dividend' },
            ]}
          />
          
          <Select
            value={filter.timeRange}
            onChange={(value) => setFilter(prev => ({ ...prev, timeRange: value }))}
            options={[
              { value: '24h', label: 'Last 24h' },
              { value: '7days', label: 'Last 7 days' },
              { value: '30days', label: 'Last 30 days' },
              { value: 'all', label: 'All time' },
            ]}
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
          {filteredTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTx === tx.id ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
                }`}
                onClick={() => setSelectedTx(tx.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tx.status)}
                    <div>
                      <div className="font-medium text-gray-900 truncate">
                        {tx.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tx.timestamp.toLocaleDateString()} • {tx.paymentMethod.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className={`text-xs capitalize ${
                      tx.status === 'completed' ? 'text-emerald-600' :
                      tx.status === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTransactions.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-500 mb-2">No transactions found</div>
          <div className="text-sm text-gray-400">
            Try adjusting your filters or search query
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className={className}>
      {compact ? (
        selectedTx ? renderTransactionDetails() : renderTransactionList()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>{renderTransactionList()}</div>
          <div>{selectedTx ? renderTransactionDetails() : (
            <Card className="p-8 text-center">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 mb-2">Select a transaction</div>
              <div className="text-sm text-gray-400">
                Click on a transaction to view detailed tracking information
              </div>
            </Card>
          )}</div>
        </div>
      )}
    </div>
  );
}

export default TransactionTracker;