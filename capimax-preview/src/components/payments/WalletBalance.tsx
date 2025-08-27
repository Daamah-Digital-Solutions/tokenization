import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency, getCurrencyInfo } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface WalletBalanceProps {
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

export function WalletBalance({ className, showActions = true, compact = false }: WalletBalanceProps) {
  const { state, getTotalUSDBalance, openPaymentModal } = usePayment();
  const [showBalances, setShowBalances] = React.useState(true);

  const totalBalance = getTotalUSDBalance();
  const hasBalances = state.balances.length > 0;

  return (
    <div className={className}>
      {!compact && (
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Total Portfolio Value</h2>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              {showBalances ? (
                <Eye className="h-5 w-5 text-emerald-600" />
              ) : (
                <EyeOff className="h-5 w-5 text-emerald-600" />
              )}
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {showBalances ? formatCurrency(totalBalance, 'USD') : '$••••••'}
              </span>
              <span className="text-sm text-gray-500">USD</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 font-medium">+12.5%</span>
              <span className="text-sm text-gray-500">this month</span>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-3">
              <Button
                onClick={openPaymentModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Add Funds
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Individual Currency Balances */}
      <div className={`space-y-3 ${!compact ? 'mt-6' : ''}`}>
        <div className="flex items-center justify-between">
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-medium text-gray-900`}>
            Currency Balances
          </h3>
          {compact && showActions && (
            <Button
              size="sm"
              onClick={openPaymentModal}
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {!hasBalances ? (
          <Card className="p-4 text-center">
            <div className="text-gray-500 mb-2">No balances available</div>
            <Button
              size="sm"
              onClick={openPaymentModal}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Add Your First Funds
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {state.balances.map((balance) => {
              const currencyInfo = getCurrencyInfo(balance.currency);
              const isPositive = balance.balance > 0;

              return (
                <motion.div
                  key={balance.currency}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${
                          currencyInfo.type === 'crypto' 
                            ? 'from-orange-400 to-orange-600' 
                            : 'from-blue-400 to-blue-600'
                        } flex items-center justify-center`}>
                          <span className="text-white font-bold text-sm">
                            {currencyInfo.symbol}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {currencyInfo.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {currencyInfo.code}
                            {currencyInfo.network && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                {currencyInfo.network}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {showBalances 
                            ? formatCurrency(balance.balance, balance.currency)
                            : '••••••'
                          }
                        </div>
                        {balance.usdValue && showBalances && (
                          <div className="text-sm text-gray-500">
                            {formatCurrency(balance.usdValue, 'USD')}
                          </div>
                        )}
                        {balance.locked && balance.locked > 0 && (
                          <div className="text-xs text-orange-600">
                            {formatCurrency(balance.locked, balance.currency)} locked
                          </div>
                        )}
                      </div>
                    </div>

                    {!compact && showActions && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                        >
                          <ArrowDownLeft className="h-3 w-3" />
                          Deposit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 text-xs"
                          disabled={!isPositive}
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          Withdraw
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Transactions Alert */}
      {state.pendingTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4"
        >
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-yellow-800">
                {state.pendingTransactions.length} transaction{state.pendingTransactions.length > 1 ? 's' : ''} pending
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default WalletBalance;