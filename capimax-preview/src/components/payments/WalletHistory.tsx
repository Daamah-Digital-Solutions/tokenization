import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ExternalLink,
  Calendar,
  DollarSign
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';

interface WalletHistoryProps {
  className?: string;
  compact?: boolean;
  limit?: number;
}

export function WalletHistory({ className, compact = false, limit }: WalletHistoryProps) {
  const { state } = usePayment();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  // Filter transactions
  const filteredTransactions = state.transactions
    .filter(tx => {
      const matchesSearch = !searchTerm || 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || tx.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      
      let matchesDate = true;
      if (dateRange !== 'all') {
        const now = new Date();
        const txDate = new Date(tx.timestamp);
        
        switch (dateRange) {
          case 'today':
            matchesDate = txDate.toDateString() === now.toDateString();
            break;
          case 'week':
            matchesDate = (now.getTime() - txDate.getTime()) <= (7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            matchesDate = (now.getTime() - txDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
            break;
        }
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    })
    .slice(0, limit);

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending' || status === 'processing') {
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    if (status === 'failed' || status === 'cancelled') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (status === 'completed') {
      switch (type) {
        case 'deposit':
          return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
        case 'withdrawal':
          return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
        case 'investment':
          return <DollarSign className="h-4 w-4 text-purple-500" />;
        case 'dividend':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'fee':
          return <AlertCircle className="h-4 w-4 text-orange-500" />;
        default:
          return <CheckCircle className="h-4 w-4 text-gray-500" />;
      }
    }
    
    return <AlertCircle className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
          Transaction History
        </h3>
        {!compact && (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              icon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
          
          <Select
            value={selectedType}
            onChange={setSelectedType}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'deposit', label: 'Deposits' },
              { value: 'withdrawal', label: 'Withdrawals' },
              { value: 'investment', label: 'Purchases' },
              { value: 'dividend', label: 'Dividends' },
              { value: 'fee', label: 'Fees' },
            ]}
          />
          
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
          
          <Select
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
            ]}
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-2">No transactions found</div>
            <div className="text-sm text-gray-400">
              {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || dateRange !== 'all'
                ? 'Try adjusting your filters'
                : 'Your transaction history will appear here'
              }
            </div>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredTransactions.map((transaction, index) => {
              const currencyInfo = getCurrencyInfo(transaction.currency);
              const isIncoming = transaction.type === 'deposit' || transaction.type === 'dividend';
              
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.type, transaction.status)}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {transaction.description}
                            </h4>
                            {getStatusBadge(transaction.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">
                              {formatDate(new Date(transaction.timestamp))}
                            </span>
                            
                            {transaction.txHash && (
                              <button 
                                onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, '_blank')}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className={`font-semibold ${
                          isIncoming ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          {isIncoming ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        
                        {transaction.fee && transaction.fee > 0 && (
                          <div className="text-sm text-gray-500">
                            Fee: {formatCurrency(transaction.fee, transaction.currency)}
                          </div>
                        )}
                        
                        {transaction.confirmations !== undefined && (
                          <div className="text-xs text-gray-400">
                            {transaction.confirmations}/12 confirmations
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!compact && transaction.paymentMethod && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          Payment Method: {
                            transaction.paymentMethod.type === 'crypto'
                              ? `${transaction.paymentMethod.currency} (${transaction.paymentMethod.network})`
                              : transaction.paymentMethod.type === 'card'
                              ? `•••• •••• •••• ${transaction.paymentMethod.last4}`
                              : transaction.paymentMethod.type
                          }
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      
      {!compact && limit && state.transactions.length > limit && (
        <div className="text-center mt-6">
          <Button variant="outline">
            View All Transactions
          </Button>
        </div>
      )}
    </div>
  );
}

export default WalletHistory;