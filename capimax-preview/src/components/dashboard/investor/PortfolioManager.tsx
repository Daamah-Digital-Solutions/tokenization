import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid3X3,
  List,
  Search,
  SortAsc,
  SortDesc,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Eye,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wallet,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  History,
  Receipt,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

import { type Portfolio, type Investment, PropertyType, InvestmentStatus } from '../../../services/api/types';
import { Card } from '../../design-system/cards/Card';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
import { BlockchainLink } from '../../ui/BlockchainLink';
import { cn } from '../../../utils/cn';

interface PortfolioManagerProps {
  portfolio: Portfolio | undefined;
  loading: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'value' | 'return' | 'date' | 'name' | 'yield';
type SortOrder = 'asc' | 'desc';
type FilterType = PropertyType | 'all';
type StatusFilter = InvestmentStatus | 'all';
type ActiveSection = 'investments' | 'distributions' | 'certificates' | 'transactions';

interface PropertyInvestment extends Investment {
  transaction_hash?: string | null;
  blockchain_confirmed?: boolean;
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
    images: string[];
    property_type: PropertyType;
    rental_yield: number;
    total_value: number;
    token_price: number;
    total_tokens: number;
    tokens_sold: number;
  };
  performance?: {
    current_value: number;
    roi_percentage: number;
    monthly_income: number;
    total_return: number;
  };
}

interface Distribution {
  id: string;
  date: Date;
  propertyId: string;
  propertyName: string;
  amount: number;
  type: 'rental' | 'dividend' | 'capital_gain';
  status: 'paid' | 'pending' | 'scheduled';
}

interface Certificate {
  id: string;
  propertyId: string;
  propertyName: string;
  certificateNumber: string;
  issueDate: Date;
  unitsHeld: number;
  downloadUrl: string;
}

interface Transaction {
  id: string;
  date: Date;
  type: 'purchase' | 'sale' | 'distribution' | 'withdrawal';
  propertyId?: string;
  propertyName?: string;
  amount: number;
  units?: number;
  status: 'completed' | 'pending' | 'failed';
  transactionHash?: string;
}

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  portfolio,
  loading,
  className
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeSection, setActiveSection] = useState<ActiveSection>('investments');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Transform portfolio investments with property data
  const investments: PropertyInvestment[] = useMemo(() => {
    if (!portfolio?.investments) return [];

    return portfolio.investments.map((investment) => {
      // Use real property data if available, otherwise create placeholder
      const propertyData = investment.property_id ? {
        id: investment.property_id,
        title: investment.property_title || `Property ${investment.property_id.slice(0, 6)}`,
        address: investment.property_address || 'Address not available',
        city: investment.property_city || 'City',
        images: investment.property_images || [],
        property_type: (investment.property_type as PropertyType) || PropertyType.RESIDENTIAL,
        rental_yield: investment.rental_yield || 8.5,
        total_value: investment.property_value || 1000000,
        token_price: investment.token_price || 100,
        total_tokens: investment.total_tokens || 10000,
        tokens_sold: investment.tokens_sold || 7500,
      } : undefined;

      // Calculate performance metrics
      const currentValue = investment.current_value || investment.investment_amount * 1.1;
      const roiPercentage = ((currentValue - investment.investment_amount) / investment.investment_amount) * 100;
      const monthlyIncome = investment.monthly_income || investment.investment_amount * 0.007;

      return {
        ...investment,
        property: propertyData,
        performance: {
          current_value: currentValue,
          roi_percentage: roiPercentage,
          monthly_income: monthlyIncome,
          total_return: currentValue - investment.investment_amount,
        }
      };
    });
  }, [portfolio?.investments]);

  // Sample distributions data (would come from API)
  const distributions: Distribution[] = useMemo(() => {
    if (!portfolio?.distributions) {
      // Generate sample data based on investments
      return investments.flatMap((inv, idx) => [
        {
          id: `dist-${idx}-1`,
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          propertyId: inv.property?.id || '',
          propertyName: inv.property?.title || 'Property',
          amount: inv.performance?.monthly_income || 0,
          type: 'rental' as const,
          status: 'paid' as const
        },
        {
          id: `dist-${idx}-2`,
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          propertyId: inv.property?.id || '',
          propertyName: inv.property?.title || 'Property',
          amount: inv.performance?.monthly_income || 0,
          type: 'rental' as const,
          status: 'paid' as const
        }
      ]);
    }
    return portfolio.distributions as Distribution[];
  }, [portfolio?.distributions, investments]);

  // Sample certificates data (would come from API)
  const certificates: Certificate[] = useMemo(() => {
    if (!portfolio?.certificates) {
      return investments
        .filter(inv => inv.status === InvestmentStatus.COMPLETED)
        .map((inv, idx) => ({
          id: `cert-${idx}`,
          propertyId: inv.property?.id || '',
          propertyName: inv.property?.title || 'Property',
          certificateNumber: `CERT-${Date.now()}-${idx}`,
          issueDate: new Date(inv.created_at),
          unitsHeld: inv.token_amount,
          downloadUrl: '#'
        }));
    }
    return portfolio.certificates as Certificate[];
  }, [portfolio?.certificates, investments]);

  // Sample transactions data (would come from API)
  const transactions: Transaction[] = useMemo(() => {
    if (!portfolio?.transactions) {
      return investments.map((inv, idx) => ({
        id: `tx-${idx}`,
        date: new Date(inv.created_at),
        type: 'purchase' as const,
        propertyId: inv.property?.id,
        propertyName: inv.property?.title,
        amount: inv.investment_amount,
        units: inv.token_amount,
        status: inv.status === InvestmentStatus.COMPLETED ? 'completed' as const : 'pending' as const,
        transactionHash: inv.transaction_hash || undefined
      }));
    }
    return portfolio.transactions as Transaction[];
  }, [portfolio?.transactions, investments]);

  // Filtered and sorted investments
  const filteredInvestments = useMemo(() => {
    let filtered = investments;

    if (searchTerm) {
      filtered = filtered.filter(investment =>
        investment.property?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.property?.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.property?.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(investment => investment.property?.property_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(investment => investment.status === statusFilter);
    }

    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'value':
          aValue = a.performance?.current_value || 0;
          bValue = b.performance?.current_value || 0;
          break;
        case 'return':
          aValue = a.performance?.roi_percentage || 0;
          bValue = b.performance?.roi_percentage || 0;
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'name':
          aValue = a.property?.title || '';
          bValue = b.property?.title || '';
          break;
        case 'yield':
          aValue = a.property?.rental_yield || 0;
          bValue = b.property?.rental_yield || 0;
          break;
        default:
          aValue = a.investment_amount;
          bValue = b.investment_amount;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [investments, searchTerm, typeFilter, statusFilter, sortField, sortOrder]);

  // Portfolio summary stats
  const portfolioSummary = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.investment_amount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + (inv.performance?.current_value || 0), 0);
    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    const totalDistributions = distributions.reduce((sum, d) => sum + d.amount, 0);
    const monthlyIncome = investments.reduce((sum, inv) => sum + (inv.performance?.monthly_income || 0), 0);

    return {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      totalDistributions,
      monthlyIncome,
      propertiesCount: investments.length,
      activeInvestments: investments.filter(i => i.status === InvestmentStatus.COMPLETED).length
    };
  }, [investments, distributions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Property', 'Purchase Amount', 'Current Value', 'ROI %', 'Monthly Income', 'Status', 'Date'];
    const rows = filteredInvestments.map(inv => [
      inv.property?.title || '',
      inv.investment_amount.toString(),
      inv.performance?.current_value?.toString() || '',
      inv.performance?.roi_percentage?.toFixed(2) || '',
      inv.performance?.monthly_income?.toString() || '',
      inv.status,
      new Date(inv.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: InvestmentStatus) => {
    switch (status) {
      case InvestmentStatus.COMPLETED:
        return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case InvestmentStatus.PENDING:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case InvestmentStatus.PROCESSING:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case InvestmentStatus.FAILED:
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case InvestmentStatus.CANCELLED:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: InvestmentStatus) => {
    switch (status) {
      case InvestmentStatus.COMPLETED:
        return CheckCircle;
      case InvestmentStatus.PENDING:
      case InvestmentStatus.PROCESSING:
        return Clock;
      case InvestmentStatus.FAILED:
      case InvestmentStatus.CANCELLED:
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-48 rounded" />
          <div className="flex gap-2">
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-24 rounded" />
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-24 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Portfolio Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <Text variant="caption" color="muted">Total Owned</Text>
              <Text variant="bodyLarge" weight="bold">{formatCurrency(portfolioSummary.totalInvested)}</Text>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <Text variant="caption" color="muted">Current Value</Text>
              <Text variant="bodyLarge" weight="bold">{formatCurrency(portfolioSummary.currentValue)}</Text>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              portfolioSummary.totalReturn >= 0
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              {portfolioSummary.totalReturn >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <Text variant="caption" color="muted">Total Return</Text>
              <Text variant="bodyLarge" weight="bold" className={cn(
                portfolioSummary.totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {portfolioSummary.totalReturn >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalReturn)}
                <span className="text-sm ml-1">({portfolioSummary.returnPercentage.toFixed(1)}%)</span>
              </Text>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <Text variant="caption" color="muted">Monthly Income</Text>
              <Text variant="bodyLarge" weight="bold">{formatCurrency(portfolioSummary.monthlyIncome)}</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {[
          { id: 'investments' as const, label: 'Properties', icon: Building, count: investments.length },
          { id: 'distributions' as const, label: 'Distributions', icon: Receipt, count: distributions.length },
          { id: 'certificates' as const, label: 'Certificates', icon: Award, count: certificates.length },
          { id: 'transactions' as const, label: 'Transaction History', icon: History, count: transactions.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                activeSection === tab.id
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'investments' && (
          <motion.div
            key="investments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header and Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <Text variant="h3" weight="semibold" className="mb-2">
                  My Properties
                </Text>
                <Text variant="body" color="muted">
                  {filteredInvestments.length} of {investments.length} properties
                </Text>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded transition-colors',
                      viewMode === 'grid'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded transition-colors',
                      viewMode === 'list'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-48"
                  />
                </div>

                {/* Filters */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as FilterType)}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value={PropertyType.RESIDENTIAL}>Residential</option>
                  <option value={PropertyType.COMMERCIAL}>Commercial</option>
                  <option value={PropertyType.MIXED_USE}>Mixed Use</option>
                </select>

                {/* Export Button */}
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <Text variant="body" color="muted" className="mr-4">
                Sort by:
              </Text>
              {[
                { field: 'value' as const, label: 'Current Value' },
                { field: 'return' as const, label: 'ROI' },
                { field: 'date' as const, label: 'Date' },
                { field: 'name' as const, label: 'Name' },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                    sortField === field
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                  {sortField === field && (
                    sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>

            {/* Property Grid/List */}
            {filteredInvestments.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <Text variant="h3" weight="semibold" className="mb-2">
                  No properties found
                </Text>
                <Text variant="body" color="muted" className="mb-4">
                  {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'Start building your real estate portfolio'}
                </Text>
                <Button variant="primary" onClick={() => window.location.href = '/properties'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Properties
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvestments.map((investment) => (
                  <InvestmentCard
                    key={investment.id}
                    investment={investment}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvestments.map((investment) => (
                  <InvestmentListItem
                    key={investment.id}
                    investment={investment}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'distributions' && (
          <motion.div
            key="distributions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text variant="h3" weight="semibold" className="mb-2">
                  Distribution History
                </Text>
                <Text variant="body" color="muted">
                  Total distributions received: {formatCurrency(portfolioSummary.totalDistributions)}
                </Text>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Statement
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Property</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist) => (
                      <tr key={dist.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">
                          {new Date(dist.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">{dist.propertyName}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-600 dark:text-slate-400">{dist.type}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          +{formatCurrency(dist.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            dist.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                            dist.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {dist.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeSection === 'certificates' && (
          <motion.div
            key="certificates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <Text variant="h3" weight="semibold" className="mb-2">
                Ownership Certificates
              </Text>
              <Text variant="body" color="muted">
                Download your digital ownership certificates for each property.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <Card key={cert.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      #{cert.certificateNumber}
                    </span>
                  </div>

                  <Text variant="bodyLarge" weight="semibold" className="mb-1">
                    {cert.propertyName}
                  </Text>
                  <Text variant="caption" color="muted" className="mb-4">
                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                  </Text>

                  <div className="flex justify-between items-center py-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Units Held</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cert.unitsHeld.toLocaleString()}
                    </span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === 'transactions' && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text variant="h3" weight="semibold" className="mb-2">
                  Transaction History
                </Text>
                <Text variant="body" color="muted">
                  Complete history of all your portfolio transactions.
                </Text>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Property</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 px-4 text-slate-900 dark:text-white">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium capitalize",
                            tx.type === 'purchase' ? "bg-emerald-100 text-emerald-700" :
                            tx.type === 'sale' ? "bg-blue-100 text-blue-700" :
                            tx.type === 'distribution' ? "bg-purple-100 text-purple-700" :
                            "bg-yellow-100 text-yellow-700"
                          )}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white">
                          {tx.propertyName || '-'}
                          {tx.units && <span className="text-sm text-slate-500 ml-2">({tx.units} tokens)</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          <span className={cn(
                            tx.type === 'purchase' || tx.type === 'withdrawal' ? "text-red-600" : "text-emerald-600"
                          )}>
                            {tx.type === 'purchase' || tx.type === 'withdrawal' ? '-' : '+'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            tx.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                            tx.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {tx.transactionHash ? (
                            <BlockchainLink
                              transactionHash={tx.transactionHash}
                              network="polygon"
                              status="completed"
                              variant="link"
                              size="sm"
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Investment Card Component
const InvestmentCard: React.FC<{
  investment: PropertyInvestment;
  getStatusColor: (status: InvestmentStatus) => string;
  getStatusIcon: (status: InvestmentStatus) => React.FC<{ className?: string }>;
  formatCurrency: (amount: number) => string;
}> = ({ investment, getStatusColor, getStatusIcon, formatCurrency }) => {
  const StatusIcon = getStatusIcon(investment.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Property Image */}
        <div className="relative h-48 bg-slate-200 dark:bg-slate-700">
          {investment.property?.images?.[0] ? (
            <img
              src={investment.property.images[0]}
              alt={investment.property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building className="w-16 h-16 text-slate-400" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <div className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getStatusColor(investment.status)
            )}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {investment.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Property Info */}
          <div className="mb-4">
            <Text variant="h4" weight="semibold" className="mb-1">
              {investment.property?.title}
            </Text>
            <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              {investment.property?.city}
            </div>
            <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              Purchased {new Date(investment.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Investment Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Text variant="caption" color="muted" className="mb-1">
                Current Value
              </Text>
              <Text variant="body" weight="semibold">
                {formatCurrency(investment.performance?.current_value || 0)}
              </Text>
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1">
                ROI
              </Text>
              <Text
                variant="body"
                weight="semibold"
                className={cn(
                  (investment.performance?.roi_percentage || 0) >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                )}
              >
                {(investment.performance?.roi_percentage || 0) >= 0 ? '+' : ''}
                {investment.performance?.roi_percentage?.toFixed(2)}%
              </Text>
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1">
                Tokens Owned
              </Text>
              <Text variant="body" weight="semibold">
                {investment.token_amount.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1">
                Monthly Income
              </Text>
              <Text variant="body" weight="semibold">
                {formatCurrency(investment.performance?.monthly_income || 0)}
              </Text>
            </div>
          </div>

          {/* Blockchain Verification */}
          {investment.status === InvestmentStatus.COMPLETED && investment.transaction_hash && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <Text variant="caption" weight="medium" className="text-emerald-700 dark:text-emerald-300">
                    Verified on Blockchain
                  </Text>
                </div>
                <BlockchainLink
                  transactionHash={investment.transaction_hash}
                  network="polygon"
                  status="completed"
                  variant="link"
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => window.location.href = '/properties'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Buy More
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.location.href = `/properties/${investment.property_id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Investment List Item Component
const InvestmentListItem: React.FC<{
  investment: PropertyInvestment;
  getStatusColor: (status: InvestmentStatus) => string;
  getStatusIcon: (status: InvestmentStatus) => React.FC<{ className?: string }>;
  formatCurrency: (amount: number) => string;
}> = ({ investment, getStatusColor, getStatusIcon, formatCurrency }) => {
  const StatusIcon = getStatusIcon(investment.status);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          {/* Property Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
              {investment.property?.images?.[0] ? (
                <img
                  src={investment.property.images[0]}
                  alt={investment.property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Text variant="body" weight="semibold">
                  {investment.property?.title}
                </Text>
                <div className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(investment.status)
                )}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {investment.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {investment.property?.city}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(investment.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Wallet className="w-4 h-4 mr-1" />
                  {investment.token_amount.toLocaleString()} tokens
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-8">
            <div className="text-right">
              <Text variant="caption" color="muted">
                Current Value
              </Text>
              <Text variant="body" weight="semibold">
                {formatCurrency(investment.performance?.current_value || 0)}
              </Text>
            </div>

            <div className="text-right">
              <Text variant="caption" color="muted">
                ROI
              </Text>
              <Text
                variant="body"
                weight="semibold"
                className={cn(
                  (investment.performance?.roi_percentage || 0) >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600'
                )}
              >
                {(investment.performance?.roi_percentage || 0) >= 0 ? '+' : ''}
                {investment.performance?.roi_percentage?.toFixed(2)}%
              </Text>
            </div>

            <div className="text-right">
              <Text variant="caption" color="muted">
                Monthly Income
              </Text>
              <Text variant="body" weight="semibold">
                {formatCurrency(investment.performance?.monthly_income || 0)}
              </Text>
            </div>

            {/* Blockchain Verification */}
            {investment.status === InvestmentStatus.COMPLETED && investment.transaction_hash && (
              <div className="text-right mr-4">
                <BlockchainLink
                  transactionHash={investment.transaction_hash}
                  network="polygon"
                  status="completed"
                  variant="badge"
                  size="sm"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
