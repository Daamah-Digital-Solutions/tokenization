import React from 'react';
import { Calendar, CreditCard, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { InvestmentData, InvestmentProperty } from './types';

interface PaymentScheduleStepProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
}

/**
 * Step shown ONLY for under-construction properties that explicitly support
 * installment plans. Investors pick between paying everything upfront or
 * splitting their commitment into N installments. On the chain side, an
 * installment purchase escrows the full token allotment on the per-property
 * contract; tokens are released to the investor's wallet as each
 * ``ConstructionInstallment`` is paid (see processInstallment).
 *
 * For ready / income-generating properties this step is gated out by the
 * parent flow — they never see it.
 */
export const PaymentScheduleStep: React.FC<PaymentScheduleStepProps> = ({
  property,
  investmentData,
  onUpdate,
}) => {
  // Reasonable defaults: cap at the period the owner configured, fall back
  // to 12 months if they didn't set one.
  const maxMonths = property.installment_period_months || 12;
  const presets = Array.from(
    new Set([3, 6, 12, maxMonths].filter((n) => n >= 2 && n <= maxMonths)),
  ).sort((a, b) => a - b);

  const isInstallment = !!investmentData.is_installment_purchase;
  const installments = investmentData.total_installments || presets[0] || 3;

  const perInstallment = isInstallment
    ? investmentData.amount / installments
    : investmentData.amount;

  const handleUpfront = () => {
    onUpdate({ is_installment_purchase: false, total_installments: undefined });
  };

  const handleInstallment = (n: number) => {
    onUpdate({ is_installment_purchase: true, total_installments: n });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Payment schedule
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This is an under-construction property. You can pay the full amount
          now or split it across multiple payments.
        </p>
      </div>

      {/* Upfront option */}
      <button
        type="button"
        onClick={handleUpfront}
        className={cn(
          'w-full text-left p-4 rounded-xl border-2 transition-colors',
          !isInstallment
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 mt-1 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Pay upfront
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Single payment of ${investmentData.amount.toLocaleString()}.
              Tokens are minted directly to your wallet on payment confirmation.
            </div>
          </div>
        </div>
      </button>

      {/* Installment option */}
      <button
        type="button"
        onClick={() => handleInstallment(installments)}
        className={cn(
          'w-full text-left p-4 rounded-xl border-2 transition-colors',
          isInstallment
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 mt-1 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Pay in installments
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Spread the total cost across {installments} monthly payments. Your
              tokens are reserved on-chain and released as you pay each installment.
            </div>

            {isInstallment && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Number of installments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstallment(n);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          n === installments
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Per payment</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      ${perInstallment.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total commitment</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      ${investmentData.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {property.expected_completion_date && (
                  <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                    <span>
                      Expected completion: <strong>{property.expected_completion_date}</strong>.
                      You can hold your tokens or trade them on the secondary market once construction is done.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};
