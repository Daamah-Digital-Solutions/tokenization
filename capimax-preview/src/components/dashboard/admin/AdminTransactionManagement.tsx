import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../../services';
import type {
  AdminTransaction,
  TransactionFilters,
  PaginatedTransactions,
  WithdrawalRequest,
  FinancialMetrics
} from '../../../services';

interface TransactionDetailViewProps {
  transaction: AdminTransaction;
  onClose: () => void;
}

const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({ transaction, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Transaction Details
            </h2>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
              ID: {transaction.id.substring(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Transaction Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Amount</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                ${transaction.amount.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Fee</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                ${transaction.fee.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Type</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {transaction.type}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Status</p>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                transaction.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : transaction.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : transaction.status === 'processing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {transaction.status}
              </span>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">User Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">User Name</p>
                <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.userName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">User Email</p>
                <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">User ID</p>
                <p className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                  {transaction.userId.substring(0, 16)}...
                </p>
              </div>
            </div>
          </div>

          {/* Property Information (if applicable) */}
          {transaction.propertyId && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Property Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">Property Title</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.propertyTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">Property ID</p>
                  <p className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                    {transaction.propertyId.substring(0, 16)}...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500 dark:text-slate-400">Payment Method</span>
                <span className="font-medium text-neutral-900 dark:text-slate-100">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500 dark:text-slate-400">Payment Reference</span>
                  <span className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                    {transaction.paymentReference}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500 dark:text-slate-400">Created At</span>
                <span className="text-sm text-neutral-900 dark:text-slate-100">
                  {new Date(transaction.createdAt).toLocaleString()}
                </span>
              </div>
              {transaction.processedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500 dark:text-slate-400">Processed At</span>
                  <span className="text-sm text-neutral-900 dark:text-slate-100">
                    {new Date(transaction.processedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Information (if applicable) */}
          {transaction.blockchain && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Blockchain Information</h3>
              <div className="space-y-3">
                {transaction.blockchain.transactionHash && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">Transaction Hash</p>
                    <p className="font-mono text-xs text-neutral-900 dark:text-slate-100 break-all">
                      {transaction.blockchain.transactionHash}
                    </p>
                  </div>
                )}
                {transaction.blockchain.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-500 dark:text-slate-400">Block Number</span>
                    <span className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                      {transaction.blockchain.blockNumber}
                    </span>
                  </div>
                )}
                {transaction.blockchain.gasFee && (
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-500 dark:text-slate-400">Gas Fee</span>
                    <span className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                      ${transaction.blockchain.gasFee.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Failure Reason (if failed) */}
          {transaction.failureReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Failure Reason</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{transaction.failureReason}</p>
            </div>
          )}

          {/* Metadata (if available) */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Additional Metadata</h3>
              <pre className="text-xs text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(transaction.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface WithdrawalManagementProps {
  onClose: () => void;
}

const WithdrawalManagement: React.FC<WithdrawalManagementProps> = ({ onClose }) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadWithdrawals = async () => {
      setLoading(true);
      try {
        const data = await adminService.getPendingWithdrawals(1, 50);
        setWithdrawals(data);
      } catch (error) {
        console.error('Failed to load withdrawals:', error);
      } finally {
        setLoading(false);
      }
    };
    loadWithdrawals();
  }, []);

  const handleApprove = async (withdrawalId: string) => {
    const notes = prompt('Add approval notes (optional):');
    try {
      await adminService.approveWithdrawal(withdrawalId, notes || undefined);
      // Reload withdrawals
      const data = await adminService.getPendingWithdrawals(1, 50);
      setWithdrawals(data);
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    const reason = prompt('Please provide rejection reason:');
    if (reason) {
      try {
        await adminService.rejectWithdrawal(withdrawalId, reason);
        // Reload withdrawals
        const data = await adminService.getPendingWithdrawals(1, 50);
        setWithdrawals(data);
      } catch (error) {
        console.error('Failed to reject withdrawal:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
            Withdrawal Requests ({withdrawals.length})
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          ) : withdrawals.length > 0 ? (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-slate-100">{withdrawal.userName}</h3>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{withdrawal.userEmail}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      withdrawal.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : withdrawal.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {withdrawal.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Amount</p>
                      <p className="font-semibold text-neutral-900 dark:text-slate-100">
                        ${withdrawal.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Fee</p>
                      <p className="font-semibold text-neutral-900 dark:text-slate-100">
                        ${withdrawal.fee.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Net Amount</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        ${withdrawal.netAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">Requested</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-2">Bank Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">Bank Name</p>
                        <p className="text-neutral-900 dark:text-slate-100">{withdrawal.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">Account Holder</p>
                        <p className="text-neutral-900 dark:text-slate-100">{withdrawal.bankDetails.accountHolderName}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">Account Number</p>
                        <p className="font-mono text-neutral-900 dark:text-slate-100">
                          {withdrawal.bankDetails.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">Routing Number</p>
                        <p className="font-mono text-neutral-900 dark:text-slate-100">
                          {withdrawal.bankDetails.routingNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {withdrawal.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(withdrawal.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(withdrawal.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {withdrawal.notes && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-200">{withdrawal.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500 dark:text-slate-400">
              No pending withdrawal requests
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminTransactionManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<PaginatedTransactions | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransaction | null>(null);
  const [showWithdrawals, setShowWithdrawals] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
    type: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined
  });

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDetailedTransactions(filters);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load financial metrics
  const loadFinancialMetrics = useCallback(async () => {
    try {
      const metrics = await adminService.getFinancialDashboard('30d');
      setFinancialMetrics(metrics);
    } catch (error) {
      console.error('Failed to load financial metrics:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadFinancialMetrics();
  }, [loadTransactions, loadFinancialMetrics]);

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleExportCSV = () => {
    if (!transactions || transactions.transactions.length === 0) return;

    const headers = ['Date', 'Type', 'User', 'Amount', 'Fee', 'Status', 'Payment Method', 'Reference'];
    const rows = transactions.transactions.map(t => [
      new Date(t.createdAt).toLocaleDateString(),
      t.type,
      t.userName,
      t.amount.toString(),
      t.fee.toString(),
      t.status,
      t.paymentMethod,
      t.paymentReference || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Transaction Management</h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">
            Monitor transactions, manage withdrawals, and view financial metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowWithdrawals(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Withdrawal Requests
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Financial Statistics */}
      {financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Revenue',
              value: `$${financialMetrics.totalRevenue.toLocaleString()}`,
              change: `${financialMetrics.revenueChange > 0 ? '+' : ''}${financialMetrics.revenueChange.toFixed(1)}%`,
              color: 'green'
            },
            {
              label: 'Monthly Revenue',
              value: `$${financialMetrics.monthlyRevenue.toLocaleString()}`,
              change: 'This month',
              color: 'blue'
            },
            {
              label: 'Transaction Count',
              value: financialMetrics.transactionCount.toLocaleString(),
              change: `Avg: $${financialMetrics.averageTransactionAmount.toLocaleString()}`,
              color: 'purple'
            },
            {
              label: 'Pending Withdrawals',
              value: `$${financialMetrics.pendingWithdrawalAmount.toLocaleString()}`,
              change: `${financialMetrics.pendingWithdrawals} requests`,
              color: 'orange'
            }
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-1">{stat.value}</p>
              <p className="text-sm text-neutral-600 dark:text-slate-400">{stat.change}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Transaction Type
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">All Types</option>
              <option value="investment">Purchase</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="deposit">Deposit</option>
              <option value="dividend">Dividend</option>
              <option value="commission">Commission</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Results Per Page
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Transaction List ({transactions?.totalCount || 0} total)
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={loadTransactions}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : transactions && transactions.transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                  {transactions.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs">{new Date(transaction.createdAt).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          {transaction.type}
                        </span>
                        {transaction.propertyTitle && (
                          <div className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                            {transaction.propertyTitle}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          {transaction.userName}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-slate-400">{transaction.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        ${transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                        ${transaction.fee.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : transaction.status === 'processing'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-slate-100">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-neutral-500 dark:text-slate-400">
                Showing {((filters.page || 1) - 1) * (filters.limit || 20) + 1} to{' '}
                {Math.min((filters.page || 1) * (filters.limit || 20), transactions.totalCount)} of{' '}
                {transactions.totalCount} transactions
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={!transactions.hasPreviousPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-700 dark:text-slate-300">
                  Page {filters.page} of {transactions.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={!transactions.hasNextPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-slate-400">
            No transactions found
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailView
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {/* Withdrawal Management Modal */}
      {showWithdrawals && (
        <WithdrawalManagement onClose={() => setShowWithdrawals(false)} />
      )}
    </div>
  );
};

export default AdminTransactionManagement;
