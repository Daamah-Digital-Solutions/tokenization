import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  ExternalLink,
  RefreshCw,
  FileText,
  CreditCard,
  Wallet,
  Building,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { DashboardService } from '../../../services/dashboard/DashboardService';
import { 
  type Transaction, 
  TransactionType, 
  PaymentMethod,
  type Investment 
} from '../../../services/api/types';
import { Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/cn';

interface TransactionManagerProps {
  className?: string;
}

interface ExtendedTransaction extends Transaction {
  property?: {
    title: string;
    address: string;
  };
  investment?: Investment;
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';
type TypeFilter = 'all' | TransactionType;
type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

export const TransactionManager: React.FC<TransactionManagerProps> = ({
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch transactions
  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions', page, statusFilter, typeFilter, dateRange],
    queryFn: () => DashboardService.getRecentTransactions(limit * page),
  });

  // Generate mock extended transaction data
  const extendedTransactions: ExtendedTransaction[] = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.map((transaction, index) => ({
      ...transaction,
      property: transaction.property_id ? {
        title: `Property ${index + 1}`,
        address: `${123 + index} Main St, New York`,
      } : undefined,
      // Add some mock metadata for better UX
      metadata: {
        ...transaction.metadata,
        payment_method: ['credit_card', 'bank_transfer', 'cryptocurrency'][Math.floor(Math.random() * 3)],
        transaction_fee: transaction.amount * 0.02,
        gas_fee: transaction.type === TransactionType.INVESTMENT ? Math.random() * 50 : undefined,
        confirmation_blocks: transaction.type === TransactionType.INVESTMENT ? Math.floor(Math.random() * 12) + 1 : undefined,
      }
    }));
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = extendedTransactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.property?.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (dateRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(transaction => 
        new Date(transaction.created_at) >= cutoffDate
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [extendedTransactions, searchTerm, statusFilter, typeFilter, dateRange]);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Status', 'Currency'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        t.type,
        t.description,
        t.amount,
        t.status,
        t.currency
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRowExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedRows(newExpanded);
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INVESTMENT:
        return Building;
      case TransactionType.DIVIDEND:
        return TrendingUp;
      case TransactionType.WITHDRAWAL:
        return ArrowUpRight;
      case TransactionType.DEPOSIT:
        return ArrowDownLeft;
      case TransactionType.FEE:
        return CreditCard;
      case TransactionType.REFUND:
        return TrendingDown;
      default:
        return DollarSign;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'processing':
        return RefreshCw;
      case 'failed':
        return XCircle;
      case 'cancelled':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'processing':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DIVIDEND:
      case TransactionType.DEPOSIT:
      case TransactionType.REFUND:
        return 'text-emerald-600';
      case TransactionType.INVESTMENT:
      case TransactionType.WITHDRAWAL:
      case TransactionType.FEE:
        return 'text-red-600';
      default:
        return 'text-slate-900 dark:text-white';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-48 rounded" />
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded" />
        </div>
        <Card className="p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-16 rounded mb-4" />
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            Transaction History
          </Text>
          <Text variant="body" color="muted">
            {filteredTransactions.length} transactions found
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value={TransactionType.INVESTMENT}>Investment</option>
              <option value={TransactionType.DIVIDEND}>Dividend</option>
              <option value={TransactionType.WITHDRAWAL}>Withdrawal</option>
              <option value={TransactionType.DEPOSIT}>Deposit</option>
              <option value={TransactionType.FEE}>Fee</option>
              <option value={TransactionType.REFUND}>Refund</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <Text variant="h3" weight="semibold" className="mb-2">
              No transactions found
            </Text>
            <Text variant="body" color="muted">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your transaction history will appear here'}
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                <AnimatePresence>
                  {filteredTransactions.map((transaction) => {
                    const TransactionIcon = getTransactionIcon(transaction.type);
                    const StatusIcon = getStatusIcon(transaction.status);
                    const isExpanded = expandedRows.has(transaction.id);
                    
                    return (
                      <React.Fragment key={transaction.id}>
                        {/* Main Row */}
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <TransactionIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div>
                                <Text variant="body" weight="medium" className="truncate max-w-[200px]">
                                  {transaction.description}
                                </Text>
                                <Text variant="caption" color="muted">
                                  ID: {transaction.id.slice(0, 8)}...
                                </Text>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                              {transaction.type.replace('_', ' ').toUpperCase()}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <Text 
                              variant="body" 
                              weight="semibold"
                              className={getAmountColor(transaction.type)}
                            >
                              {[TransactionType.DIVIDEND, TransactionType.DEPOSIT, TransactionType.REFUND].includes(transaction.type) ? '+' : '-'}
                              ${transaction.amount.toLocaleString()}
                            </Text>
                            <Text variant="caption" color="muted">
                              {transaction.currency}
                            </Text>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className={cn(
                              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                              getStatusColor(transaction.status)
                            )}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {transaction.status.toUpperCase()}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <Text variant="body">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </Text>
                            <Text variant="caption" color="muted">
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </Text>
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRowExpansion(transaction.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                        
                        {/* Expanded Row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50 dark:bg-slate-800/50"
                            >
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Transaction Details */}
                                  <div>
                                    <Text variant="body" weight="semibold" className="mb-2">
                                      Transaction Details
                                    </Text>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <Text variant="caption" color="muted">Transaction ID:</Text>
                                        <Text variant="caption" className="font-mono">
                                          {transaction.id}
                                        </Text>
                                      </div>
                                      {transaction.property && (
                                        <>
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Property:</Text>
                                            <Text variant="caption">
                                              {transaction.property.title}
                                            </Text>
                                          </div>
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Address:</Text>
                                            <Text variant="caption">
                                              {transaction.property.address}
                                            </Text>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Payment Details */}
                                  <div>
                                    <Text variant="body" weight="semibold" className="mb-2">
                                      Payment Details
                                    </Text>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <Text variant="caption" color="muted">Method:</Text>
                                        <Text variant="caption">
                                          {transaction.metadata?.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                                        </Text>
                                      </div>
                                      {transaction.metadata?.transaction_fee && (
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Fee:</Text>
                                          <Text variant="caption">
                                            ${transaction.metadata.transaction_fee.toFixed(2)}
                                          </Text>
                                        </div>
                                      )}
                                      {transaction.metadata?.gas_fee && (
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Gas Fee:</Text>
                                          <Text variant="caption">
                                            ${transaction.metadata.gas_fee.toFixed(2)}
                                          </Text>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Blockchain Details */}
                                  {transaction.type === TransactionType.INVESTMENT && (
                                    <div>
                                      <Text variant="body" weight="semibold" className="mb-2">
                                        Blockchain Details
                                      </Text>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Network:</Text>
                                          <Text variant="caption">Ethereum</Text>
                                        </div>
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Confirmations:</Text>
                                          <Text variant="caption">
                                            {transaction.metadata?.confirmation_blocks || 0}/12
                                          </Text>
                                        </div>
                                        {transaction.metadata?.transaction_hash && (
                                          <div className="flex items-center gap-2">
                                            <Text variant="caption" color="muted">Hash:</Text>
                                            <Button variant="outline" size="sm" className="p-1">
                                              <ExternalLink className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between">
          <Text variant="body" color="muted">
            Showing {filteredTransactions.length} of {extendedTransactions.length} transactions
          </Text>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={filteredTransactions.length < limit}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};