import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';

export interface TokenReservation {
  id: string;
  propertyId: string;
  propertyName: string;
  tokensReserved: number;
  tokenPrice: number;
  reservationDate: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'activated' | 'cancelled';
  paymentsPaid: number;
  totalPayments: number;
  nextPaymentDue?: string;
  nextPaymentAmount?: number;
  tokensActivated: number;
  remainingBalance: number;
  autoActivation: boolean;
  activationThreshold: number; // Percentage of payments required before activation
}

interface ReservedTokenManagerProps {
  reservations: TokenReservation[];
  onActivateTokens: (reservationId: string, tokensToActivate?: number) => void;
  onCancelReservation: (reservationId: string) => void;
  onExtendReservation: (reservationId: string, extensionDays: number) => void;
  onToggleAutoActivation: (reservationId: string, enabled: boolean) => void;
  onMakePayment: (reservationId: string, amount?: number) => void;
  onModifyReservation: (reservationId: string, newTokenAmount: number) => void;
  className?: string;
}

export const ReservedTokenManager: React.FC<ReservedTokenManagerProps> = ({
  reservations,
  onActivateTokens,
  onCancelReservation,
  onExtendReservation,
  onToggleAutoActivation,
  onMakePayment,
  onModifyReservation,
  className = ''
}) => {
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [activationAmount, setActivationAmount] = useState<number>(0);
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [modifyTokens, setModifyTokens] = useState<number>(0);
  const [actionType, setActionType] = useState<'activate' | 'extend' | 'modify' | null>(null);

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

  const getActivationProgress = (reservation: TokenReservation) => {
    return (reservation.paymentsPaid / reservation.totalPayments) * 100;
  };

  const canActivate = (reservation: TokenReservation) => {
    const progress = getActivationProgress(reservation);
    return progress >= reservation.activationThreshold && reservation.status === 'active';
  };

  const getMaxActivatableTokens = (reservation: TokenReservation) => {
    const progress = getActivationProgress(reservation);
    const activatablePercentage = Math.min(progress / 100, 1);
    return Math.floor((reservation.tokensReserved * activatablePercentage) - reservation.tokensActivated);
  };

  const handleActionSubmit = () => {
    if (!selectedReservation || !actionType) return;

    switch (actionType) {
      case 'activate':
        onActivateTokens(selectedReservation, activationAmount || undefined);
        break;
      case 'extend':
        onExtendReservation(selectedReservation, extensionDays);
        break;
      case 'modify':
        onModifyReservation(selectedReservation, modifyTokens);
        break;
    }
    
    setSelectedReservation(null);
    setActionType(null);
    setActivationAmount(0);
    setExtensionDays(30);
    setModifyTokens(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400';
      case 'expired': return 'text-red-600 dark:text-red-400';
      case 'activated': return 'text-blue-600 dark:text-blue-400';
      case 'cancelled': return 'text-neutral-600 dark:text-slate-400';
      default: return 'text-neutral-600 dark:text-slate-400';
    }
  };

  const activeReservations = reservations.filter(r => r.status === 'active');
  const totalReservedValue = activeReservations.reduce((sum, r) => sum + (r.tokensReserved * r.tokenPrice), 0);
  const totalActivatedValue = reservations.reduce((sum, r) => sum + (r.tokensActivated * r.tokenPrice), 0);
  const nearExpiration = activeReservations.filter(r => getDaysRemaining(r.expirationDate) <= 7).length;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header & Summary */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
            Token Reservation Manager
          </h2>
          {nearExpiration > 0 && (
            <div className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-sm font-medium rounded-full">
              {nearExpiration} expiring soon
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {activeReservations.length}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Active Reservations
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
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              ${totalActivatedValue.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Activated Value
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {reservations.filter(r => canActivate(r)).length}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              Ready to Activate
            </div>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="p-6">
        {reservations.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📋</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              No Token Reservations
            </h3>
            <p className="text-neutral-600 dark:text-slate-400">
              You don't have any token reservations yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => {
              const daysRemaining = getDaysRemaining(reservation.expirationDate);
              const progress = getActivationProgress(reservation);
              const maxActivatable = getMaxActivatableTokens(reservation);
              const isNearExpiration = daysRemaining <= 7 && daysRemaining >= 0;

              return (
                <div
                  key={reservation.id}
                  className="border border-neutral-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-slate-100">
                          {reservation.propertyName}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-slate-400">
                          {reservation.tokensReserved.toLocaleString()} tokens @ ${reservation.tokenPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getStatusColor(reservation.status)}`}>
                          {reservation.status.toUpperCase()}
                        </div>
                        {reservation.status === 'active' && (
                          <div className="text-xs text-neutral-500 dark:text-slate-400">
                            {daysRemaining >= 0 ? `${daysRemaining} days left` : 'Expired'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                          Payment Progress
                        </span>
                        <span className="text-sm text-neutral-600 dark:text-slate-400">
                          {reservation.paymentsPaid}/{reservation.totalPayments} payments
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-neutral-500 dark:text-slate-400">
                        <span>{Math.round(progress)}% complete</span>
                        <span>
                          {reservation.tokensActivated > 0 && 
                            `${reservation.tokensActivated.toLocaleString()} tokens activated`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Token Status */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">Reserved</span>
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {reservation.tokensReserved.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">Activated</span>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {reservation.tokensActivated.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">Available</span>
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {maxActivatable.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">Remaining Balance</span>
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          ${reservation.remainingBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Auto Activation Toggle */}
                    <div className="flex items-center justify-between mb-3 p-2 bg-neutral-50 dark:bg-slate-700 rounded">
                      <div>
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          Auto Activation
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-slate-400">
                          Automatically activate tokens when {reservation.activationThreshold}% payments are made
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleAutoActivation(reservation.id, !reservation.autoActivation)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          reservation.autoActivation 
                            ? 'bg-primary-600' 
                            : 'bg-neutral-200 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            reservation.autoActivation ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Alerts */}
                    {isNearExpiration && (
                      <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-orange-600 dark:text-orange-400">⚠️</span>
                          <span className="text-sm text-orange-800 dark:text-orange-300">
                            Reservation expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {reservation.nextPaymentDue && (
                      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-800 dark:text-blue-300">
                            Next payment due: {formatDate(reservation.nextPaymentDue)}
                          </span>
                          {reservation.nextPaymentAmount && (
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                              ${reservation.nextPaymentAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      {canActivate(reservation) && maxActivatable > 0 && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedReservation(reservation.id);
                            setActionType('activate');
                            setActivationAmount(maxActivatable);
                          }}
                        >
                          Activate {maxActivatable.toLocaleString()} Tokens
                        </Button>
                      )}

                      {reservation.nextPaymentDue && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMakePayment(reservation.id)}
                        >
                          Make Payment
                        </Button>
                      )}

                      {reservation.status === 'active' && isNearExpiration && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReservation(reservation.id);
                            setActionType('extend');
                          }}
                        >
                          Extend Reservation
                        </Button>
                      )}

                      {reservation.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReservation(reservation.id);
                            setActionType('modify');
                            setModifyTokens(reservation.tokensReserved);
                          }}
                        >
                          Modify
                        </Button>
                      )}

                      {(reservation.status === 'active' || reservation.status === 'expired') && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onCancelReservation(reservation.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedReservation && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
              {actionType === 'activate' && 'Activate Tokens'}
              {actionType === 'extend' && 'Extend Reservation'}
              {actionType === 'modify' && 'Modify Reservation'}
            </h3>

            {actionType === 'activate' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Tokens to Activate
                  </label>
                  <Input
                    type="number"
                    value={activationAmount}
                    onChange={(e) => setActivationAmount(parseInt(e.target.value) || 0)}
                    max={getMaxActivatableTokens(reservations.find(r => r.id === selectedReservation)!)}
                    min={1}
                  />
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Maximum available: {getMaxActivatableTokens(reservations.find(r => r.id === selectedReservation)!).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {actionType === 'extend' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Extension Period (Days)
                  </label>
                  <Input
                    type="number"
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
                    min={1}
                    max={90}
                  />
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Extension fee may apply
                  </p>
                </div>
              </div>
            )}

            {actionType === 'modify' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    New Token Amount
                  </label>
                  <Input
                    type="number"
                    value={modifyTokens}
                    onChange={(e) => setModifyTokens(parseInt(e.target.value) || 0)}
                    min={1}
                  />
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Additional payment may be required for increases
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReservation(null);
                  setActionType(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleActionSubmit}
                className="flex-1"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};