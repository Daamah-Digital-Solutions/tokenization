import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  MapPin, 
  Star, 
  Users, 
  TrendingUp, 
  Calendar, 
  Building, 
  Building2,
  Shield, 
  Clock,
  DollarSign,
  Calculator,
  Eye,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Award,
  CheckCircle,
  Info,
  BarChart3,
  Loader,
  Home,
  CreditCard,
  Percent,
  CalendarDays
} from 'lucide-react';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Property } from '../../services/api/types';

interface PropertyDetailEnhancedProps {
  property: Property;
  onInvestClick?: () => void;
  investmentAmount: number;
  setInvestmentAmount: (amount: number) => void;
}

export const PropertyDetailEnhanced: React.FC<PropertyDetailEnhancedProps> = ({
  property,
  onInvestClick,
  investmentAmount,
  setInvestmentAmount
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Helper functions
  const isUnderConstruction = property.property_category === 'under_construction';
  const isReadyProperty = property.property_category === 'ready_property';
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const fundingPercentage = property.total_tokens > 0 ? 
    Math.round((property.tokens_sold / property.total_tokens) * 100) : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'financials', label: 'Financials', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'location', label: 'Location', icon: MapPin },
  ];

  const nextImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const previousImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  const calculateReturns = () => {
    const tokens = Math.floor(investmentAmount / property.token_price);
    const returnRate = property.expected_return || 10;
    const annualReturn = (investmentAmount * returnRate) / 100;
    const quarterlyDividend = annualReturn / 4;
    return { tokens, annualReturn, quarterlyDividend };
  };

  const { tokens, annualReturn, quarterlyDividend } = calculateReturns();

  return (
    <div className="space-y-8">
      {/* Image Gallery */}
      <Card className="overflow-hidden">
        <div className="relative h-96 md:h-[500px]">
          <img
            src={property.images?.[currentImageIndex] || '/default-property.jpg'}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-property.jpg';
            }}
          />
          
          {/* Image Navigation */}
          {property.images && property.images.length > 1 && (
            <>
              <button
                onClick={previousImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      currentImageIndex === index
                        ? "bg-white scale-125"
                        : "bg-white/50 hover:bg-white/75"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Status Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {fundingPercentage < 50 && (
              <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Award className="w-3 h-3" />
                FEATURED
              </div>
            )}
            
            {/* Property Category Badge */}
            {isUnderConstruction ? (
              <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                UNDER CONSTRUCTION
              </div>
            ) : isReadyProperty && property.rental_income_active ? (
              <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                INCOME ACTIVE
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Home className="w-3 h-3" />
                READY PROPERTY
              </div>
            )}
          </div>

          {/* Quick Stats Overlay */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">4.5</span>
              </div>
            </div>
            <div className="px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/20">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{property.investor_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Property Info */}
      <Card className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="text-lg">{property.city}, {property.state || property.country}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Property Type</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {property.property_type?.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <Text variant="body" className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
          {property.description}
        </Text>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 p-4 rounded-xl">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(property.total_value)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Value</div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {formatCurrency(property.token_price)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Per Token</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {formatPercentage(property.expected_return || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isUnderConstruction ? 'Expected Return' : 'Annual Return'}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {isUnderConstruction && property.expected_completion_date ? (
                formatDate(property.expected_completion_date)
              ) : isReadyProperty && property.monthly_rental_income ? (
                formatCurrency(property.monthly_rental_income)
              ) : (
                property.year_built || 'N/A'
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isUnderConstruction ? 'Completion' : isReadyProperty ? 'Monthly Income' : 'Year Built'}
            </div>
          </div>
        </div>

        {/* Progress Section - Different for Construction vs Ready */}
        <div className="mb-8">
          {isUnderConstruction ? (
            /* Construction Progress */
            <div>
              <div className="flex justify-between items-center mb-3">
                <Text variant="bodyLarge" weight="semibold">Construction Progress</Text>
                <Text variant="bodyLarge" weight="bold" className="text-orange-600 dark:text-orange-400">
                  {formatPercentage(property.construction_progress || 0)}
                </Text>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${property.construction_progress || 0}%` }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{property.construction_status_display || 'In Progress'}</span>
                <span>Expected: {property.expected_completion_date ? formatDate(property.expected_completion_date) : 'TBD'}</span>
              </div>
              
              {/* Funding Progress below construction */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <Text variant="bodyLarge" weight="semibold">Funding Progress</Text>
                  <Text variant="bodyLarge" weight="bold" className="text-emerald-600 dark:text-emerald-400">
                    {fundingPercentage}% Complete
                  </Text>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${fundingPercentage}%` }}
                    transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                  />
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{property.tokens_sold?.toLocaleString()} tokens sold</span>
                  <span>{property.total_tokens?.toLocaleString()} total tokens</span>
                </div>
              </div>
            </div>
          ) : (
            /* Ready Property - Funding Progress */
            <div>
              <div className="flex justify-between items-center mb-3">
                <Text variant="bodyLarge" weight="semibold">Funding Progress</Text>
                <Text variant="bodyLarge" weight="bold" className="text-emerald-600 dark:text-emerald-400">
                  {fundingPercentage}% Complete
                </Text>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fundingPercentage}%` }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{property.tokens_sold?.toLocaleString()} tokens sold</span>
                <span>{property.total_tokens?.toLocaleString()} total tokens</span>
              </div>
              
              {/* Rental Income Info for Ready Properties */}
              {isReadyProperty && property.rental_income_active && (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Text variant="bodyLarge" weight="semibold" className="text-emerald-800 dark:text-emerald-200">
                      Active Rental Income
                    </Text>
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Monthly Income:</span>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(property.monthly_rental_income || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Occupancy Rate:</span>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatPercentage(property.occupancy_rate || 100)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Investment Calculator */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Investment Calculator
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Investment Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                min={property.token_price}
                step={property.token_price}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum: {formatCurrency(property.token_price)}
            </p>
            
            {/* Installment Payment Option for Construction Properties */}
            {isUnderConstruction && property.supports_installments && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <Text variant="bodySmall" weight="semibold" className="text-blue-800 dark:text-blue-200">
                    Installment Option Available
                  </Text>
                </div>
                <Text variant="caption" className="text-blue-700 dark:text-blue-300">
                  Pay over {property.installment_period_months} months with flexible installment plans
                </Text>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Your Investment</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{tokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Annual Return:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(annualReturn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {isReadyProperty ? 'Monthly Dividend:' : 'Quarterly Dividend:'}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(isReadyProperty ? quarterlyDividend / 3 : quarterlyDividend)}
                </span>
              </div>
            </div>
          </div>

          <Button 
            variant="primary" 
            size="lg" 
            className="w-full"
            onClick={onInvestClick}
          >
            {isUnderConstruction && property.supports_installments ? (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Reserve with Installments
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Invest {formatCurrency(investmentAmount)}
              </>
            )}
          </Button>
          
          <div className="text-center">
            <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
              <Eye className="w-4 h-4 mr-2" />
              Preview Investment Terms
            </Button>
          </div>
        </div>
      </Card>

      {/* Trust Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trust & Security</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-gray-700 dark:text-gray-300">SEC Compliant</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-gray-700 dark:text-gray-300">Verified Property</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-gray-700 dark:text-gray-300">Insured Investment</span>
          </div>
          
          {/* Category-specific trust indicators */}
          {isUnderConstruction ? (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-5 h-5 text-orange-500" />
                <span className="text-gray-700 dark:text-gray-300">Construction Monitored</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">Milestone Reporting</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Monthly Distributions</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">Quarterly Reporting</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};