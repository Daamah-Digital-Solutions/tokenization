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

import { TransactionService, type EnhancedTransaction, type TransactionFilters } from '../../../services/transaction/TransactionService';
import {
  TransactionType,
  PaymentMethod
} from '../../../services/api/types';
import type {
  Transaction,
  Investment
} from '../../../services/api/types';
import { Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/cn';

interface TransactionManagerProps {
  className?: string;
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
  const [isExporting, setIsExporting] = useState(false);
  const limit = 20;

  // Fetch transactions with filters
  const { data: transactionData, isLoading, refetch, error } = useQuery({
    queryKey: ['transactions', page, statusFilter, typeFilter, dateRange, searchTerm],
    queryFn: () => {
      const filters: TransactionFilters = {
        page,
        limit,
        ordering: '-created_at'
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        filters.type = typeFilter;
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date();
        let dateFrom = new Date();

        switch (dateRange) {
          case '7d':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case '30d':
            dateFrom.setDate(now.getDate() - 30);
            break;
          case '90d':
            dateFrom.setDate(now.getDate() - 90);
            break;
          case '1y':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }

        filters.date_from = dateFrom.toISOString().split('T')[0];
      }

      return TransactionService.getTransactions(filters);
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false
  });

  // Extract transactions from response
  const transactions = transactionData?.transactions || [];
  const pagination = transactionData?.pagination;
  const summary = transactionData?.summary;

  // Filtered transactions are handled by the API
  const filteredTransactions = transactions;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Try to export via API first (more comprehensive data)
      const filters: TransactionFilters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchTerm || undefined,
        date_from: dateRange !== 'all' ? getDateFromRange(dateRange) : undefined
      };

      const blob = await TransactionService.exportTransactions(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('API export failed, falling back to client-side export:', error);

      // Fallback to client-side CSV generation
      const csvContent = [
        ['Date', 'Type', 'Description', 'Amount', 'Status', 'Currency', 'Property', 'Payment Method'].join(','),
        ...filteredTransactions.map(t => [
          new Date((t as any).date || t.created_at).toLocaleDateString(),
          t.type,
          t.description,
          t.amount,
          t.status,
          t.currency,
          t.property?.title || 'N/A',
          t.payment_details?.method_display || 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const getDateFromRange = (range: DateRange): string => {
    const now = new Date();
    let dateFrom = new Date();

    switch (range) {
      case '7d':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(now.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(now.getDate() - 90);
        break;
      case '1y':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    return dateFrom.toISOString().split('T')[0];
  };

  const handleViewTransaction = (transactionId: string) => {
    setSelectedTransaction(transactionId);
  };

  const handleRetryTransaction = async (transactionId: string) => {
    try {
      await TransactionService.retryTransaction(transactionId);
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Failed to retry transaction:', error);
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await TransactionService.cancelTransaction(transactionId);
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Failed to cancel transaction:', error);
    }
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

  // The investment model has a richer status lifecycle than just
  // pending/completed/failed: pending → processing → payment_confirmed →
  // pending_mint → minting → completed (also mint_failed, refunded). Earlier
  // the switch only knew about the first three so PENDING_MINT and MINTING
  // fell through to the unstyled default (gray + Clock with no text colour),
  // which the user flagged. These maps now cover every real status string.
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return CheckCircle;
      case 'pending':
      case 'pending_mint':
      case 'payment_confirmed':
        return Clock;
      case 'processing':
      case 'minting':
        return RefreshCw;
      case 'failed':
      case 'mint_failed':
        return XCircle;
      case 'cancelled':
      case 'refunded':
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
      case 'pending_mint':
      case 'payment_confirmed':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'processing':
      case 'minting':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'failed':
      case 'mint_failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'cancelled':
      case 'refunded':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  // Render a status string like "pending_mint" as "Pending Mint" (Title Case
  // with spaces) so the badge isn't an ugly UPPERCASE_WITH_UNDERSCORES.
  const formatStatus = (status: string) =>
    status
      .toLowerCase()
      .split('_')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');

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

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <Text variant="h3" weight="semibold" className="mb-2">
            Failed to Load Transactions
          </Text>
          <Text variant="body" color="muted" className="mb-4">
            {error instanceof Error ? error.message : 'Unable to fetch your transaction history. Please try again.'}
          </Text>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-48 rounded" />
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded" />
        </div>
        <Card className="p-6">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-full rounded mb-4" />
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
            {summary && (
              <span className="ml-4">
                • Total: ${summary.total_amount.toLocaleString()}
                • Fees: ${summary.fees_paid.toFixed(2)}
              </span>
            )}
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className={cn("w-4 h-4 mr-2", isExporting && "animate-pulse")} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
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
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateRange !== '30d'
                ? 'Try adjusting your filters or search terms'
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
                              {formatStatus(transaction.status)}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <Text variant="body">
                              {new Date((transaction as any).date || transaction.created_at).toLocaleDateString()}
                            </Text>
                            <Text variant="caption" color="muted">
                              {new Date((transaction as any).date || transaction.created_at).toLocaleTimeString()}
                            </Text>
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/*
                                Single chevron toggle for inline details. The
                                previous version also rendered a separate "Eye"
                                button that called `setSelectedTransaction` —
                                but nothing consumed that state, so clicking
                                it did nothing visible. Dropped it to fix the
                                dead-button report from the user.
                              */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRowExpansion(transaction.id)}
                                title={isExpanded ? 'Collapse details' : 'Expand details'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              {(transaction as any).property?.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.location.href = `/property-detail?id=${(transaction as any).property.id}`;
                                  }}
                                  title="View property"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {(transaction.status.toLowerCase() === 'failed' ||
                                transaction.status.toLowerCase() === 'mint_failed') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetryTransaction(transaction.id)}
                                  title="Retry failed transaction"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              {/*
                                Cancel is only supported by the backend for the
                                PENDING state — once the investment moves to
                                PROCESSING / PENDING_MINT / MINTING the payment
                                or mint is already in flight and the user must
                                go through refund/support. Only show the
                                button when it can actually do something.
                              */}
                              {transaction.status.toLowerCase() === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelTransaction(transaction.id)}
                                  title="Cancel pending transaction"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
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
                                  
                                  {/*
                                    Payment Details panel — only render when
                                    we actually have something to display.
                                    The old version always rendered the panel
                                    with a "Method: N/A" row even for pure
                                    investment / mint transactions that don't
                                    have payment metadata. The user flagged
                                    that row twice in screenshots; dropping
                                    the whole section when empty is cleaner
                                    than showing a placeholder.
                                  */}
                                  {(transaction.payment_details?.method_display ||
                                    transaction.payment_details?.transaction_fee ||
                                    transaction.payment_details?.gas_fee) && (
                                    <div>
                                      <Text variant="body" weight="semibold" className="mb-2">
                                        Payment Details
                                      </Text>
                                      <div className="space-y-2 text-sm">
                                        {transaction.payment_details?.method_display && (
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Method:</Text>
                                            <Text variant="caption">
                                              {transaction.payment_details.method_display}
                                            </Text>
                                          </div>
                                        )}
                                        {transaction.payment_details?.transaction_fee && (
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Transaction Fee:</Text>
                                            <Text variant="caption">
                                              ${transaction.payment_details.transaction_fee.toFixed(2)}
                                            </Text>
                                          </div>
                                        )}
                                        {transaction.payment_details?.gas_fee && (
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Gas Fee:</Text>
                                            <Text variant="caption">
                                              ${transaction.payment_details.gas_fee.toFixed(2)}
                                            </Text>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Blockchain Details */}
                                  {transaction.blockchain_details && (
                                    <div>
                                      <Text variant="body" weight="semibold" className="mb-2">
                                        Blockchain Details
                                      </Text>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Network:</Text>
                                          <Text variant="caption">{transaction.blockchain_details.network}</Text>
                                        </div>
                                        <div className="flex justify-between">
                                          <Text variant="caption" color="muted">Confirmations:</Text>
                                          <Text variant="caption">
                                            {transaction.blockchain_details.confirmations}/{transaction.blockchain_details.required_confirmations}
                                          </Text>
                                        </div>
                                        {transaction.blockchain_details.transaction_hash && (
                                          <div className="flex items-center justify-between">
                                            <Text variant="caption" color="muted">Hash:</Text>
                                            <div className="flex items-center gap-2">
                                              <Text variant="caption" className="font-mono text-xs">
                                                {transaction.blockchain_details.transaction_hash.slice(0, 10)}...
                                              </Text>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="p-1"
                                                onClick={() => {
                                                  // Use correct explorer based on network
                                                  const network = transaction.blockchain_details?.network?.toLowerCase() || 'polygon';
                                                  const explorers: Record<string, string> = {
                                                    polygon: 'https://polygonscan.com/tx/',
                                                    ethereum: 'https://etherscan.io/tx/',
                                                    bsc: 'https://bscscan.com/tx/',
                                                  };
                                                  const baseUrl = explorers[network] || explorers.polygon;
                                                  window.open(`${baseUrl}${transaction.blockchain_details?.transaction_hash}`, '_blank', 'noopener,noreferrer');
                                                }}
                                                title="View on PolygonScan"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        {transaction.blockchain_details.gas_used && (
                                          <div className="flex justify-between">
                                            <Text variant="caption" color="muted">Gas Used:</Text>
                                            <Text variant="caption">
                                              {transaction.blockchain_details.gas_used.toLocaleString()}
                                            </Text>
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
            Showing {filteredTransactions.length} of {pagination?.total || filteredTransactions.length} transactions
          </Text>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400">
              Page {page} of {pagination?.pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination || page >= pagination.pages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};