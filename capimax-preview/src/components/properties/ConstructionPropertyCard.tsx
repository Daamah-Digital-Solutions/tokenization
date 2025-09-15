import React from 'react';
import { Button } from '../ui/Button';

export interface ConstructionProperty {
  id: string;
  name: string;
  location: string;
  developer: string;
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  reservedTokens: number;
  activeTokens: number;
  constructionProgress: number;
  expectedCompletion: string;
  currentMilestone: string;
  nextPaymentDue: string;
  minimumInvestment: number;
  installmentOptions: Array<{
    id: string;
    name: string;
    payments: number;
    downPayment: number;
    description: string;
  }>;
  images: string[];
  description: string;
  keyFeatures: string[];
  developmentStage: 'planning' | 'foundation' | 'structure' | 'finishing' | 'completion';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedYield: number;
  completionRisk?: string;
}

interface ConstructionPropertyCardProps {
  property: ConstructionProperty;
  onReserveTokens: (propertyId: string) => void;
  onViewDetails: (propertyId: string) => void;
  className?: string;
}

export const ConstructionPropertyCard: React.FC<ConstructionPropertyCardProps> = ({
  property,
  onReserveTokens,
  onViewDetails,
  className = ''
}) => {
  const progressPercentage = property.constructionProgress;
  const tokenAvailability = ((property.totalTokens - property.reservedTokens - property.activeTokens) / property.totalTokens) * 100;
  
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'foundation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'structure': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'finishing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completion': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-neutral-600 dark:text-slate-400';
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* Property Image */}
      <div className="relative h-48">
        <img 
          src={property.images[0] || '/api/placeholder/400/200'} 
          alt={property.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex space-x-2">
          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
            Under Construction
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(property.developmentStage)}`}>
            {property.developmentStage.charAt(0).toUpperCase() + property.developmentStage.slice(1)}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 bg-white dark:bg-slate-800 text-xs font-medium rounded-full ${getRiskColor(property.riskLevel)}`}>
            {property.riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-1">
            {property.name}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-slate-400">
            {property.location} • by {property.developer}
          </p>
        </div>

        {/* Construction Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              Construction Progress
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2 mb-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            Current: {property.currentMilestone}
          </p>
        </div>

        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Token Price</p>
            <p className="font-semibold text-neutral-900 dark:text-slate-100">
              ${property.tokenPrice.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Min. Investment</p>
            <p className="font-semibold text-neutral-900 dark:text-slate-100">
              ${property.minimumInvestment.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Est. Completion</p>
            <p className="font-semibold text-neutral-900 dark:text-slate-100">
              {new Date(property.expectedCompletion).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-slate-400">Est. Yield</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {property.estimatedYield}%
            </p>
          </div>
        </div>

        {/* Token Availability */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              Token Availability
            </span>
            <span className="text-sm text-neutral-600 dark:text-slate-400">
              {(property.totalTokens - property.reservedTokens - property.activeTokens).toLocaleString()} available
            </span>
          </div>
          <div className="flex space-x-1 h-2 rounded-full overflow-hidden bg-neutral-200 dark:bg-slate-700">
            <div 
              className="bg-green-500"
              style={{ width: `${(property.activeTokens / property.totalTokens) * 100}%` }}
              title={`${property.activeTokens.toLocaleString()} Active Tokens`}
            ></div>
            <div 
              className="bg-yellow-500"
              style={{ width: `${(property.reservedTokens / property.totalTokens) * 100}%` }}
              title={`${property.reservedTokens.toLocaleString()} Reserved Tokens`}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-neutral-500 dark:text-slate-400">
            <span>🟢 Active: {property.activeTokens.toLocaleString()}</span>
            <span>🟡 Reserved: {property.reservedTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Installment Options Preview */}
        <div className="mb-4 p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-slate-100 mb-2">
            Installment Options Available
          </h4>
          <div className="space-y-1">
            {property.installmentOptions.slice(0, 2).map((option) => (
              <div key={option.id} className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-slate-400">
                  {option.name}
                </span>
                <span className="text-neutral-900 dark:text-slate-100 font-medium">
                  {option.payments} payments, {option.downPayment}% down
                </span>
              </div>
            ))}
            {property.installmentOptions.length > 2 && (
              <p className="text-xs text-primary-600 dark:text-primary-400">
                +{property.installmentOptions.length - 2} more options
              </p>
            )}
          </div>
        </div>

        {/* Next Payment Due (if applicable) */}
        {property.nextPaymentDue && (
          <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600 dark:text-yellow-400 text-sm">⏰</span>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Next Payment Due
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {new Date(property.nextPaymentDue).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onReserveTokens(property.id)}
            disabled={tokenAvailability === 0}
          >
            {tokenAvailability === 0 ? 'Fully Reserved' : 'Reserve Tokens'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(property.id)}
          >
            View Details
          </Button>
        </div>

        {/* Completion Risk Warning */}
        {property.completionRisk && (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-orange-600 dark:text-orange-400 text-sm">⚠️</span>
              <p className="text-xs text-orange-800 dark:text-orange-300">
                <strong>Risk Notice:</strong> {property.completionRisk}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};