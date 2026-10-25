import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../../services';
import type {
  AdminTransaction,
  TransactionFilters,
  PaginatedTransactions,
  WithdrawalRequest,
  FinancialMetrics
} from '../../../services';

const dateLocale = (lng?: string) => (lng?.startsWith('ar') ? 'ar-EG' : 'en-US');

interface TransactionDetailViewProps {
  transaction: AdminTransaction;
  onClose: () => void;
}

const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({ transaction, onClose }) => {
  const { t, i18n } = useTranslation('admin');
  const locale = dateLocale(i18n.language);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              {t('transactions.detail.title')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
              {t('transactions.detail.id', { id: transaction.id.substring(0, 8) })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('shared.close')}
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
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('transactions.fields.amount')}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                ${transaction.amount.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('transactions.fields.fee')}</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                ${transaction.fee.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('transactions.fields.type')}</p>
              <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {t(`shared.txTypes.${String(transaction.type || '').toLowerCase()}`, { defaultValue: transaction.type })}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('transactions.fields.status')}</p>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                transaction.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : transaction.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : transaction.status === 'processing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {t(`shared.status.${transaction.status}`, { defaultValue: transaction.status })}
              </span>
            </div>
          </div>

          {/* User Information */}
          <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('transactions.detail.userInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.userName')}</p>
                <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.userName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.userEmail')}</p>
                <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.userId')}</p>
                <p className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                  {transaction.userId.substring(0, 16)}...
                </p>
              </div>
            </div>
          </div>

          {/* Property Information (if applicable) */}
          {transaction.propertyId && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('transactions.detail.propertyInfo')}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.propertyTitle')}</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">{transaction.propertyTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.propertyId')}</p>
                  <p className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                    {transaction.propertyId.substring(0, 16)}...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('transactions.detail.paymentDetails')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.fields.paymentMethod')}</span>
                <span className="font-medium text-neutral-900 dark:text-slate-100">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.paymentReference')}</span>
                  <span className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                    {transaction.paymentReference}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.createdAt')}</span>
                <span className="text-sm text-neutral-900 dark:text-slate-100">
                  {new Date(transaction.createdAt).toLocaleString(locale)}
                </span>
              </div>
              {transaction.processedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.processedAt')}</span>
                  <span className="text-sm text-neutral-900 dark:text-slate-100">
                    {new Date(transaction.processedAt).toLocaleString(locale)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Information (if applicable) */}
          {transaction.blockchain && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('transactions.detail.blockchainInfo')}</h3>
              <div className="space-y-3">
                {transaction.blockchain.transactionHash && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-1">{t('transactions.detail.txHash')}</p>
                    <p className="font-mono text-xs text-neutral-900 dark:text-slate-100 break-all">
                      {transaction.blockchain.transactionHash}
                    </p>
                  </div>
                )}
                {transaction.blockchain.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.blockNumber')}</span>
                    <span className="font-mono text-sm text-neutral-900 dark:text-slate-100">
                      {transaction.blockchain.blockNumber}
                    </span>
                  </div>
                )}
                {transaction.blockchain.gasFee && (
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.detail.gasFee')}</span>
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
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">{t('transactions.detail.failureReason')}</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{transaction.failureReason}</p>
            </div>
          )}

          {/* Metadata (if available) */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('transactions.detail.metadata')}</h3>
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
  const { t, i18n } = useTranslation('admin');
  const statusLabel = (s: string) => t(`shared.status.${s}`, { defaultValue: s });
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
    const notes = prompt(t('transactions.withdrawals.approvePrompt'));
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
    const reason = prompt(t('transactions.withdrawals.rejectPrompt'));
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
            {t('transactions.withdrawals.titleCount', { count: withdrawals.length })}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('shared.close')}
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
                      {statusLabel(withdrawal.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.fields.amount')}</p>
                      <p className="font-semibold text-neutral-900 dark:text-slate-100">
                        ${withdrawal.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.fields.fee')}</p>
                      <p className="font-semibold text-neutral-900 dark:text-slate-100">
                        ${withdrawal.fee.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.netAmount')}</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        ${withdrawal.netAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.requested')}</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100">
                        {new Date(withdrawal.requestedAt).toLocaleDateString(dateLocale(i18n.language))}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-slate-100 mb-2">{t('transactions.withdrawals.bankDetails')}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.bankName')}</p>
                        <p className="text-neutral-900 dark:text-slate-100">{withdrawal.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.accountHolder')}</p>
                        <p className="text-neutral-900 dark:text-slate-100">{withdrawal.bankDetails.accountHolderName}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.accountNumber')}</p>
                        <p className="font-mono text-neutral-900 dark:text-slate-100">
                          {withdrawal.bankDetails.accountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500 dark:text-slate-400">{t('transactions.withdrawals.routingNumber')}</p>
                        <p className="font-mono text-neutral-900 dark:text-slate-100">
                          {withdrawal.bankDetails.routingNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {withdrawal.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(withdrawal.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        {t('shared.approve')}
                      </button>
                      <button
                        onClick={() => handleReject(withdrawal.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {t('shared.reject')}
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
              {t('transactions.withdrawals.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminTransactionManagement: React.FC = () => {
  const { t, i18n } = useTranslation('admin');
  const locale = dateLocale(i18n.language);
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
      setError(err instanceof Error ? err.message : t('transactions.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

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
    const rows = transactions.transactions.map(tx => [
      new Date(tx.createdAt).toLocaleDateString(),
      tx.type,
      tx.userName,
      tx.amount.toString(),
      tx.fee.toString(),
      tx.status,
      tx.paymentMethod,
      tx.paymentReference || ''
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{t('transactions.title')}</h1>
          <p className="text-neutral-500 dark:text-slate-400 mt-1">
            {t('transactions.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWithdrawals(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            {t('transactions.withdrawals.title')}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('transactions.exportCsv')}
          </button>
          <button
            onClick={loadTransactions}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            <span>{t('shared.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Financial Statistics */}
      {financialMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: t('dashboard.financial.totalRevenue'),
              value: `$${financialMetrics.totalRevenue.toLocaleString()}`,
              change: `${financialMetrics.revenueChange > 0 ? '+' : ''}${financialMetrics.revenueChange.toFixed(1)}%`,
              color: 'green'
            },
            {
              label: t('dashboard.financial.monthlyRevenue'),
              value: `$${financialMetrics.monthlyRevenue.toLocaleString()}`,
              change: t('dashboard.financial.thisMonth'),
              color: 'blue'
            },
            {
              label: t('transactions.stats.count'),
              value: financialMetrics.transactionCount.toLocaleString(),
              change: t('transactions.stats.average', { amount: `$${financialMetrics.averageTransactionAmount.toLocaleString()}` }),
              color: 'purple'
            },
            {
              label: t('dashboard.financial.pendingWithdrawals'),
              value: `$${financialMetrics.pendingWithdrawalAmount.toLocaleString()}`,
              change: t('dashboard.financial.requests', { count: financialMetrics.pendingWithdrawals }),
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
              {t('transactions.filters.type')}
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">{t('transactions.filters.allTypes')}</option>
              <option value="investment">{t('shared.txTypes.investment')}</option>
              <option value="withdrawal">{t('shared.txTypes.withdrawal')}</option>
              <option value="deposit">{t('shared.txTypes.deposit')}</option>
              <option value="dividend">{t('shared.txTypes.dividend')}</option>
              <option value="commission">{t('shared.txTypes.commission')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('transactions.fields.status')}
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-neutral-900 dark:text-slate-100"
            >
              <option value="">{t('transactions.filters.allStatuses')}</option>
              <option value="pending">{t('shared.status.pending')}</option>
              <option value="processing">{t('shared.status.processing')}</option>
              <option value="completed">{t('shared.status.completed')}</option>
              <option value="failed">{t('shared.status.failed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              {t('transactions.filters.startDate')}
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
              {t('transactions.filters.endDate')}
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
              {t('transactions.filters.perPage')}
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
            {t('transactions.listTitle', { count: transactions?.totalCount || 0 })}
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
              {t('shared.retry')}
            </button>
          </div>
        ) : transactions && transactions.transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.date')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.type')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.user')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.amount')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.fee')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.status')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('transactions.fields.paymentMethod')}
                    </th>
                    <th className="px-6 py-3 text-end text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('shared.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                  {transactions.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                        {new Date(transaction.createdAt).toLocaleDateString(locale)}
                        <br />
                        <span className="text-xs">{new Date(transaction.createdAt).toLocaleTimeString(locale)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          {t(`shared.txTypes.${String(transaction.type || '').toLowerCase()}`, { defaultValue: transaction.type })}
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
                          {t(`shared.status.${transaction.status}`, { defaultValue: transaction.status })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-slate-100">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end text-sm">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                        >
                          {t('shared.viewDetails')}
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
                {t('transactions.pagination.showing', {
                  from: ((filters.page || 1) - 1) * (filters.limit || 20) + 1,
                  to: Math.min((filters.page || 1) * (filters.limit || 20), transactions.totalCount),
                  total: transactions.totalCount
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={!transactions.hasPreviousPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  {t('shared.previous')}
                </button>
                <span className="text-sm text-neutral-700 dark:text-slate-300">
                  {t('shared.pageOf', { page: filters.page, pages: transactions.totalPages })}
                </span>
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={!transactions.hasNextPage}
                  className="px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm font-medium text-neutral-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-slate-700"
                >
                  {t('shared.next')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-slate-400">
            {t('transactions.empty')}
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
