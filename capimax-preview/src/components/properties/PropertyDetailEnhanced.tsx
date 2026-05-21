import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Star,
  Users,
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
  BarChart3,
  Home,
  CreditCard,
  CalendarDays,
  Briefcase,
  Scale,
  Globe,
  ExternalLink,
  Lock,
  Folder,
  TrendingUp,
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Property, PropertyDocuments } from '../../services/api/types';

interface PropertyDetailEnhancedProps {
  property: Property;
  analytics?: any;
  investors?: any[];
  documents?: PropertyDocuments[];
  isUnderConstruction?: boolean;
  constructionProgressData?: any;
  onInvestClick?: (tokenCount?: number) => void;
  onImageClick?: (index: number) => void;
  currentImageIndex?: number;
}

type TabId = 'overview' | 'financials' | 'spv' | 'documents' | 'location';

export const PropertyDetailEnhanced: React.FC<PropertyDetailEnhancedProps> = ({
  property,
  analytics,
  investors = [],
  documents = [],
  isUnderConstruction = false,
  constructionProgressData,
  onInvestClick,
  onImageClick,
  currentImageIndex: externalImageIndex
}) => {
  const [internalImageIndex, setInternalImageIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const currentImageIndex = externalImageIndex ?? internalImageIndex;
  const setCurrentImageIndex = onImageClick ?? setInternalImageIndex;

  // Helper functions
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
    { id: 'overview' as const, label: 'Overview', icon: Eye },
    { id: 'financials' as const, label: 'Financials', icon: BarChart3 },
    { id: 'spv' as const, label: 'SPV Info', icon: Briefcase },
    { id: 'documents' as const, label: 'Data Room', icon: Folder },
    { id: 'location' as const, label: 'Location', icon: MapPin },
  ];

  const nextImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((currentImageIndex + 1) % property.images.length);
    }
  };

  const previousImage = () => {
    if (property.images?.length > 1) {
      setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length);
    }
  };

  const availableTokens = property.total_tokens - property.tokens_sold;

  const calculateReturns = () => {
    const investmentAmount = tokenCount * property.token_price;
    const returnRate = property.expected_return || 10;
    const annualReturn = (investmentAmount * returnRate) / 100;
    const quarterlyDividend = annualReturn / 4;
    const monthlyDividend = annualReturn / 12;
    return { investmentAmount, annualReturn, quarterlyDividend, monthlyDividend };
  };

  const { investmentAmount, annualReturn, quarterlyDividend, monthlyDividend } = calculateReturns();

  // SPV Information (would come from backend in real app)
  const spvInfo = {
    name: `${property.title} SPV Ltd`,
    jurisdiction: 'United Arab Emirates',
    formationDate: property.created_at ? formatDate(property.created_at.toString()) : 'N/A',
    registrationNumber: `SPV-${property.id?.slice(0, 8).toUpperCase()}`,
    legalStructure: 'Special Purpose Vehicle',
    managingDirector: 'Capimax RT Management',
    auditor: 'Independent Audit Firm',
    custodian: 'Licensed Custodian Bank'
  };

  // Distribution schedule
  const distributionSchedule = [
    { quarter: 'Q1', month: 'March', status: 'upcoming' },
    { quarter: 'Q2', month: 'June', status: 'upcoming' },
    { quarter: 'Q3', month: 'September', status: 'upcoming' },
    { quarter: 'Q4', month: 'December', status: 'upcoming' },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
                <span className="font-semibold text-gray-900 dark:text-white">{property.investor_count || investors.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {property.images && property.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {property.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  currentImageIndex === index
                    ? "border-emerald-500"
                    : "border-transparent hover:border-gray-300"
                )}
              >
                <img
                  src={image}
                  alt={`${property.title} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Tab Navigation */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        {property.rental_yield ? formatPercentage(property.rental_yield) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Rental Yield</div>
                    </div>
                  </div>
                </Card>

                {/* Progress Section */}
                <Card className="p-8">
                  {isUnderConstruction ? (
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

                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-6">
                        <span>{property.construction_status_display || 'In Progress'}</span>
                        <span>Expected: {property.expected_completion_date ? formatDate(property.expected_completion_date) : 'TBD'}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Funding Progress */}
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
                      <span>{(property.total_tokens - property.tokens_sold)?.toLocaleString()} available</span>
                    </div>
                  </div>
                </Card>

                {/* Distribution Schedule */}
                <Card className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      Distribution Schedule
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isReadyProperty ? 'Monthly' : 'Quarterly'} Distributions
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {distributionSchedule.map((dist, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"
                      >
                        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {dist.quarter}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {dist.month}
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Investment Calculator */}
                <Card className="sticky top-24">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-emerald-600" />
                      Investment Calculator
                    </h3>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Number of Tokens
                        </label>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatCurrency(property.token_price)}/token
                        </span>
                      </div>
                      <input
                        type="number"
                        value={tokenCount}
                        onChange={(e) => setTokenCount(Math.max(1, Math.min(Math.floor(Number(e.target.value) || 1), availableTokens)))}
                        min={1}
                        max={availableTokens}
                        step={1}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold text-center"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Available: {availableTokens.toLocaleString()} tokens
                      </p>
                      {/* Quick token select */}
                      <div className="flex gap-2 mt-2">
                        {[1, 5, 10, 25].filter(n => n <= availableTokens).map((count) => (
                          <button
                            key={count}
                            onClick={() => setTokenCount(count)}
                            className={cn(
                              "flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all",
                              tokenCount === count
                                ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Your Investment</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{tokenCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(investmentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Ownership:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {((tokenCount / property.total_tokens) * 100).toFixed(4)}%
                          </span>
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
                            {formatCurrency(isReadyProperty ? monthlyDividend : quarterlyDividend)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => onInvestClick?.(tokenCount)}
                    >
                      Buy {tokenCount} {tokenCount === 1 ? 'Token' : 'Tokens'} — {formatCurrency(investmentAmount)}
                    </Button>
                  </div>
                </Card>

                {/* Trust Indicators */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trust & Security</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">Regulatory Compliant</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">Verified Property</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Lock className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">SPV Protected</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Scale className="w-5 h-5 text-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">Independent Valuation</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
                Financial Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Investment Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Investment Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Token Price</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Total Tokens</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{property.total_tokens?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Available Tokens</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{(property.total_tokens - property.tokens_sold)?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Minimum Investment</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.token_price)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">Expected Yield</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPercentage(property.expected_return || 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Property Financials */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Financials</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Property Value</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(property.total_value)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Rental Yield</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatPercentage(property.rental_yield || 0)}</span>
                    </div>
                    {property.monthly_rental_income && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Monthly Rental Income</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(property.monthly_rental_income)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Management Fee</span>
                      <span className="font-semibold text-gray-900 dark:text-white">2.5%</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
                      <span className="font-semibold text-gray-900 dark:text-white">1.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'spv' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-emerald-600" />
                SPV Information
              </h2>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 mb-8">
                <p className="text-emerald-800 dark:text-emerald-200">
                  This property is held through a Special Purpose Vehicle (SPV) structure, providing legal separation and investor protection. The SPV owns the underlying asset and investors hold economic rights through their token holdings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SPV Details</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">SPV Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Jurisdiction</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.jurisdiction}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Formation Date</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.formationDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">Registration Number</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.registrationNumber}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Providers</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Managing Director</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.managingDirector}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Auditor</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.auditor}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 dark:text-gray-400">Custodian</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{spvInfo.custodian}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button variant="outline" className="mr-4">
                  <FileText className="w-4 h-4 mr-2" />
                  View SPV Documents
                </Button>
                <Button variant="ghost">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Verify Registration
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'documents' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Folder className="w-6 h-6 text-emerald-600" />
                Data Room
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Access all property documentation, including ownership records, valuation reports, insurance policies, and SPV documents.
              </p>

              {/*
                Replaced a hardcoded category list ("Title Deed", "Operating
                Agreement", etc. — pure UI mock with no onClick) with a real
                grouping over the `documents` prop. Documents are bucketed by
                their backend `type` field and each one wires the Download
                button to its actual file URL.
              */}
              {documents.length === 0 ? (
                <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                    No documents available yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    The property owner has not uploaded supporting documentation for this listing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Friendlier labels for the raw backend `type` strings.
                    const typeLabels: Record<string, string> = {
                      ownership: 'Ownership Documents',
                      legal: 'Legal Documents',
                      financial: 'Financial Reports',
                      valuation: 'Valuation Reports',
                      insurance: 'Insurance Documents',
                      spv: 'SPV Documents',
                      construction: 'Construction Documents',
                      other: 'Other Documents',
                    };
                    const typeIcons: Record<string, any> = {
                      ownership: FileText,
                      legal: Shield,
                      financial: TrendingUp,
                      valuation: BarChart3,
                      insurance: Shield,
                      spv: Briefcase,
                      construction: Folder,
                      other: FileText,
                    };

                    // Bucket documents by type.
                    const grouped: Record<string, PropertyDocuments[]> = {};
                    for (const doc of documents) {
                      const key = (doc.type || 'other').toLowerCase();
                      (grouped[key] = grouped[key] || []).push(doc);
                    }

                    const handleDownload = (doc: PropertyDocuments) => {
                      if (!doc.url) {
                        alert('This document does not have a download URL configured.');
                        return;
                      }
                      const a = document.createElement('a');
                      a.href = doc.url;
                      a.download = doc.name || 'document';
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    };

                    return Object.entries(grouped).map(([type, docs]) => {
                      const Icon = typeIcons[type] || FileText;
                      const title = typeLabels[type] || type.replace(/_/g, ' ');
                      const isExpanded = expandedSection === title;

                      return (
                        <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleSection(title)}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-gray-900 dark:text-white capitalize">{title}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{docs.length} document{docs.length === 1 ? '' : 's'}</div>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 space-y-2">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                          <div className="text-gray-700 dark:text-gray-300 truncate">{doc.name}</div>
                                          {doc.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                              {doc.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {doc.url && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}
                                            title="View"
                                            aria-label={`View ${doc.name}`}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownload(doc)}
                                          title="Download"
                                          aria-label={`Download ${doc.name}`}
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">Verified Investor Access</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Some documents require investor verification. Complete your KYC to access all documentation.
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'location' && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" />
                Location
              </h2>

              {/* Map Placeholder */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Interactive Map</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{property.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Address</h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p>{property.address}</p>
                    <p>{property.city}, {property.state}</p>
                    <p>{property.country} {property.zip_code}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nearby Amenities</h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-400">
                    <p>• Shopping Centers - 0.5 km</p>
                    <p>• Public Transport - 0.2 km</p>
                    <p>• Schools - 1.0 km</p>
                    <p>• Hospital - 2.0 km</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
