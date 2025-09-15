import React, { useState } from 'react';
import { Button } from '../ui/Button';

export interface ReservedToken {
  id: string;
  propertyId: string;
  propertyName: string;
  tokensReserved: number;
  tokenPrice: number;
  reservationDate: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'activated' | 'cancelled';
  paymentScheduleId?: string;
  installmentPlan?: {
    id: string;
    name: string;
    totalPayments: number;
    downPayment: number;
    nextPaymentDue: string;
    nextPaymentAmount: number;
  };
  activationProgress: number; // Percentage of payments made
  tokensActivated: number;
  remainingReservationDays: number;
  cancellationDeadline?: string;
  refundEligible: boolean;
  reservationFee?: number;
  totalValue: number;
  conditions?: string[];
}

interface ReservedTokensDisplayProps {
  reservedTokens: ReservedToken[];
  onActivateTokens: (tokenId: string) => void;
  onMakePayment: (tokenId: string) => void;
  onCancelReservation: (tokenId: string) => void;
  onExtendReservation?: (tokenId: string) => void;
  onViewPaymentSchedule: (scheduleId: string) => void;
  className?: string;
  showActions?: boolean;
}

export const ReservedTokensDisplay: React.FC<ReservedTokensDisplayProps> = ({
  reservedTokens,
  onActivateTokens,
  onMakePayment,
  onCancelReservation,
  onExtendReservation,
  onViewPaymentSchedule,
  className = '',
  showActions = true
}) => {
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'activated': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🔒';
      case 'expired': return '⏰';
      case 'activated': return '✅';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTokens = filterStatus === 'all' 
    ? reservedTokens 
    : reservedTokens.filter(token => token.status === filterStatus);

  const totalReservedValue = reservedTokens
    .filter(token => token.status === 'active')
    .reduce((sum, token) => sum + token.totalValue, 0);

  const totalTokensReserved = reservedTokens
    .filter(token => token.status === 'active')
    .reduce((sum, token) => sum + token.tokensReserved, 0);

  const totalTokensActivated = reservedTokens
    .reduce((sum, token) => sum + token.tokensActivated, 0);

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'text-red-600 dark:text-red-400';
    if (days <= 7) return 'text-orange-600 dark:text-orange-400';
    if (days <= 14) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-neutral-600 dark:text-slate-400';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Reserved Tokens
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              Manage your token reservations and activation progress
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="activated">Activated</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {totalTokensReserved.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Tokens Reserved
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {totalTokensActivated.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Tokens Activated
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              ${totalReservedValue.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Reserved Value
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {reservedTokens.filter(t => t.status === 'active').length}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Active Reservations
            </div>
          </div>
        </div>
      </div>

      {/* Reserved Tokens List */}
      <div className="p-6">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🔍</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              No Reserved Tokens
            </h3>
            <p className="text-neutral-600 dark:text-slate-400">
              {filterStatus === 'all' ? 'You have no token reservations' : `No ${filterStatus} reservations found`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTokens.map((token) => {
              const isExpanded = expandedToken === token.id;
              const daysRemaining = getDaysRemaining(token.expirationDate);
              const activationPercentage = token.activationProgress;

              return (
                <div
                  key={token.id}
                  className={`border border-neutral-200 dark:border-slate-700 rounded-lg transition-colors ${
                    isExpanded ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedToken(isExpanded ? null : token.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <span className="text-lg">{getStatusIcon(token.status)}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                              {token.propertyName}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(token.status)}`}>
                              {token.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-neutral-600 dark:text-slate-400">
                            <span>
                              {token.tokensReserved.toLocaleString()} tokens @ ${token.tokenPrice.toLocaleString()}
                            </span>
                            {token.status === 'active' && daysRemaining >= 0 && (
                              <span className={getUrgencyColor(daysRemaining)}>
                                {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} days left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-neutral-900 dark:text-slate-100">
                            ${token.totalValue.toLocaleString()}
                          </p>
                          {token.tokensActivated > 0 && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {token.tokensActivated.toLocaleString()} activated
                            </p>
                          )}
                        </div>

                        {showActions && token.status === 'active' && (
                          <div className="flex items-center space-x-2">
                            {token.installmentPlan && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMakePayment(token.id);
                                }}
                              >
                                Make Payment
                              </Button>
                            )}
                            {activationPercentage === 100 && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onActivateTokens(token.id);
                                }}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Activation Progress Bar */}
                    {token.status === 'active' && activationPercentage > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                            Activation Progress
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-slate-400">
                            {Math.round(activationPercentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${activationPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-900/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Reserved Date</p>
                          <p className="font-medium text-neutral-900 dark:text-slate-100">
                            {formatDate(token.reservationDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Expiration Date</p>
                          <p className="font-medium text-neutral-900 dark:text-slate-100">
                            {formatDate(token.expirationDate)}
                          </p>
                        </div>
                        {token.reservationFee && (
                          <div>
                            <p className="text-neutral-500 dark:text-slate-400">Reservation Fee</p>
                            <p className="font-medium text-neutral-900 dark:text-slate-100">
                              ${token.reservationFee.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-neutral-500 dark:text-slate-400">Refund Eligible</p>
                          <p className={`font-medium ${token.refundEligible ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {token.refundEligible ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>

                      {/* Installment Plan Details */}
                      {token.installmentPlan && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h5 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                            {token.installmentPlan.name}
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-blue-600 dark:text-blue-400">Total Payments</p>
                              <p className="font-medium text-blue-800 dark:text-blue-300">
                                {token.installmentPlan.totalPayments}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 dark:text-blue-400">Down Payment</p>
                              <p className="font-medium text-blue-800 dark:text-blue-300">
                                {token.installmentPlan.downPayment}%
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 dark:text-blue-400">Next Payment</p>
                              <p className="font-medium text-blue-800 dark:text-blue-300">
                                ${token.installmentPlan.nextPaymentAmount.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Due: {formatDate(token.installmentPlan.nextPaymentDue)}
                              </p>
                            </div>
                          </div>
                          {showActions && token.paymentScheduleId && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewPaymentSchedule(token.paymentScheduleId!)}
                              >
                                View Full Schedule
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conditions */}
                      {token.conditions && token.conditions.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">
                            Reservation Conditions
                          </h5>
                          <ul className="space-y-1">
                            {token.conditions.map((condition, index) => (
                              <li key={index} className="text-sm text-neutral-600 dark:text-slate-400 flex items-start">
                                <span className="text-neutral-400 mr-2">•</span>
                                {condition}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {showActions && token.status === 'active' && (
                        <div className="flex items-center space-x-3">
                          {activationPercentage === 100 && (
                            <Button
                              variant="primary"
                              onClick={() => onActivateTokens(token.id)}
                            >
                              Activate All Tokens
                            </Button>
                          )}
                          {token.installmentPlan && (
                            <Button
                              variant="outline"
                              onClick={() => onMakePayment(token.id)}
                            >
                              Make Payment
                            </Button>
                          )}
                          {onExtendReservation && daysRemaining <= 7 && daysRemaining > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => onExtendReservation(token.id)}
                            >
                              Extend Reservation
                            </Button>
                          )}
                          {token.cancellationDeadline && getDaysRemaining(token.cancellationDeadline) > 0 && (
                            <Button
                              variant="danger"
                              onClick={() => onCancelReservation(token.id)}
                            >
                              Cancel Reservation
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Expiration Warning */}
                      {token.status === 'active' && daysRemaining <= 7 && daysRemaining >= 0 && (
                        <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-orange-600 dark:text-orange-400">⚠️</span>
                            <p className="text-sm text-orange-800 dark:text-orange-300">
                              <strong>Expiring Soon:</strong> This reservation expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
                              {token.refundEligible ? ' Complete activation or cancel for refund.' : ' Complete activation or lose reservation.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};