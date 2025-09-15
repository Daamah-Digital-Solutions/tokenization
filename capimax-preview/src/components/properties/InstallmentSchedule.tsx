import React, { useState } from 'react';
import { Button } from '../ui/Button';

export interface InstallmentPayment {
  id: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'due' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: string;
  paidAmount?: number;
  lateFee?: number;
  milestone?: string;
  tokenReleaseAmount?: number;
  notes?: string;
}

export interface InstallmentScheduleData {
  investmentId: string;
  propertyName: string;
  totalInvestment: number;
  downPayment: number;
  installmentAmount: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'milestone';
  totalPayments: number;
  remainingPayments: number;
  nextPaymentDue?: string;
  payments: InstallmentPayment[];
  autoPayEnabled: boolean;
  paymentMethod?: string;
  gracePeriodDays: number;
  lateFeePercentage: number;
  completionBonus?: number;
}

interface InstallmentScheduleProps {
  scheduleData: InstallmentScheduleData;
  onMakePayment: (paymentId: string) => void;
  onSetupAutoPay: () => void;
  onEditPaymentMethod: () => void;
  className?: string;
  showActions?: boolean;
}

export const InstallmentSchedule: React.FC<InstallmentScheduleProps> = ({
  scheduleData,
  onMakePayment,
  onSetupAutoPay,
  onEditPaymentMethod,
  className = '',
  showActions = true
}) => {
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'due': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return '✅';
      case 'due': return '⚠️';
      case 'overdue': return '🚨';
      case 'upcoming': return '📅';
      case 'cancelled': return '❌';
      default: return '📅';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredPayments = viewMode === 'upcoming' 
    ? scheduleData.payments.filter(p => p.status !== 'paid' && p.status !== 'cancelled')
    : scheduleData.payments;

  const paidPayments = scheduleData.payments.filter(p => p.status === 'paid').length;
  const totalPaid = scheduleData.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.paidAmount || p.amount), 0);
  const completionPercentage = (paidPayments / scheduleData.totalPayments) * 100;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Payment Schedule
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              {scheduleData.propertyName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'upcoming' ? 'all' : 'upcoming')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {viewMode === 'upcoming' ? 'View All' : 'View Upcoming'}
            </button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {paidPayments}/{scheduleData.totalPayments}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Payments Made
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              ${totalPaid.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Total Paid
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              ${scheduleData.installmentAmount.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Payment Amount
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {Math.round(completionPercentage)}%
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Complete
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>

        {/* Next Payment Alert */}
        {scheduleData.nextPaymentDue && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-blue-600 dark:text-blue-400 text-lg">💰</span>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    Next Payment Due
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {formatDate(scheduleData.nextPaymentDue)} - ${scheduleData.installmentAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              {showActions && (
                <div className="flex items-center space-x-2">
                  {!scheduleData.autoPayEnabled && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const nextPayment = scheduleData.payments.find(p => p.status === 'due' || p.status === 'upcoming');
                        if (nextPayment) onMakePayment(nextPayment.id);
                      }}
                    >
                      Pay Now
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSetupAutoPay}
                  >
                    {scheduleData.autoPayEnabled ? 'Manage' : 'Setup'} AutoPay
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment List */}
      <div className="p-6">
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const daysUntil = getDaysUntilDue(payment.dueDate);
            const isSelected = selectedPayment === payment.id;

            return (
              <div
                key={payment.id}
                className={`border border-neutral-200 dark:border-slate-700 rounded-lg transition-colors ${
                  isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-slate-700'
                }`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedPayment(isSelected ? null : payment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getStatusIcon(payment.status)}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                            Payment #{payment.paymentNumber}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-neutral-600 dark:text-slate-400">
                          <span>Due: {formatDate(payment.dueDate)}</span>
                          {payment.milestone && (
                            <span>Milestone: {payment.milestone}</span>
                          )}
                          {daysUntil >= 0 && payment.status !== 'paid' && (
                            <span className={
                              daysUntil <= 7 ? 'text-orange-600 dark:text-orange-400' : 
                              daysUntil <= 0 ? 'text-red-600 dark:text-red-400' : 
                              'text-neutral-600 dark:text-slate-400'
                            }>
                              {daysUntil === 0 ? 'Due Today' : 
                               daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                               `${daysUntil} days remaining`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-neutral-900 dark:text-slate-100">
                          ${payment.amount.toLocaleString()}
                        </p>
                        {payment.lateFee && payment.lateFee > 0 && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            +${payment.lateFee.toLocaleString()} late fee
                          </p>
                        )}
                        {payment.tokenReleaseAmount && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {payment.tokenReleaseAmount} tokens released
                          </p>
                        )}
                      </div>
                      
                      {showActions && (payment.status === 'due' || payment.status === 'overdue') && (
                        <Button
                          size="sm"
                          variant={payment.status === 'overdue' ? 'danger' : 'primary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMakePayment(payment.id);
                          }}
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Payment Details */}
                {isSelected && (
                  <div className="border-t border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {payment.paidDate && (
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Paid Date</p>
                          <p className="font-medium text-neutral-900 dark:text-slate-100">
                            {formatDate(payment.paidDate)}
                          </p>
                        </div>
                      )}
                      {payment.paidAmount && payment.paidAmount !== payment.amount && (
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Amount Paid</p>
                          <p className="font-medium text-neutral-900 dark:text-slate-100">
                            ${payment.paidAmount.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {payment.tokenReleaseAmount && (
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Tokens Released</p>
                          <p className="font-medium text-green-600 dark:text-green-400">
                            {payment.tokenReleaseAmount.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {payment.status === 'overdue' && (
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Grace Period</p>
                          <p className="font-medium text-orange-600 dark:text-orange-400">
                            {scheduleData.gracePeriodDays} days
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-neutral-900 dark:text-slate-100 mb-1">Notes</p>
                        <p className="text-sm text-neutral-600 dark:text-slate-400">
                          {payment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🎉</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              All Caught Up!
            </h3>
            <p className="text-neutral-600 dark:text-slate-400">
              {viewMode === 'upcoming' ? 'No upcoming payments' : 'All payments completed'}
            </p>
          </div>
        )}
      </div>

      {/* Payment Method & Settings */}
      {showActions && (
        <div className="border-t border-neutral-200 dark:border-slate-700 p-6 bg-neutral-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${scheduleData.autoPayEnabled ? 'bg-green-500' : 'bg-neutral-300'}`}></span>
                <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                  AutoPay {scheduleData.autoPayEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {scheduleData.paymentMethod && (
                <div className="text-sm text-neutral-600 dark:text-slate-400">
                  Payment Method: {scheduleData.paymentMethod}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onEditPaymentMethod}
              >
                Payment Method
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSetupAutoPay}
              >
                {scheduleData.autoPayEnabled ? 'Manage' : 'Setup'} AutoPay
              </Button>
            </div>
          </div>

          {scheduleData.completionBonus && scheduleData.completionBonus > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400">🎁</span>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Completion Bonus Available
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Earn ${scheduleData.completionBonus.toLocaleString()} for completing all payments on time
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};