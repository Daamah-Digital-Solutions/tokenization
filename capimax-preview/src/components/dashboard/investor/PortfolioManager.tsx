import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Grid3X3,
  List,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  TrendingUp,
  TrendingDown,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Plus,
  Minus,
  Eye,
  MoreVertical,
  Share,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wallet
} from 'lucide-react';

import { DashboardService } from '../../../services/dashboard/DashboardService';
import { type Portfolio, type Investment, PropertyType, InvestmentStatus } from '../../../services/api/types';
import { StatsCard, Card } from '../../design-system';
import { Text } from '../../design-system/typography/Text';
import { Button } from '../../ui/Button';
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

interface PropertyInvestment extends Investment {
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
  const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);

  // Mock property data for investments (in real app, this would come from the API)
  const investments: PropertyInvestment[] = useMemo(() => {
    if (!portfolio?.investments) return [];
    
    return portfolio.investments.map((investment, index) => ({
      ...investment,
      property: {
        id: `prop-${index}`,
        title: `Property ${index + 1}`,
        address: `123 Main St ${index + 1}`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Miami'][index % 4],
        images: [`/images/property-${index + 1}.jpg`],
        property_type: [PropertyType.RESIDENTIAL, PropertyType.COMMERCIAL, PropertyType.MIXED_USE][index % 3],
        rental_yield: 8.5 + Math.random() * 4,
        total_value: 1000000 + Math.random() * 2000000,
        token_price: 100 + Math.random() * 400,
        total_tokens: 10000,
        tokens_sold: 7500 + Math.random() * 2500,
      },
      performance: {
        current_value: investment.investment_amount * (1 + Math.random() * 0.3 - 0.1),
        roi_percentage: (Math.random() - 0.3) * 40,
        monthly_income: investment.investment_amount * 0.007 * Math.random(),
        total_return: investment.investment_amount * (Math.random() * 0.2),
      }
    }));
  }, [portfolio?.investments]);

  // Filtered and sorted investments
  const filteredInvestments = useMemo(() => {
    let filtered = investments;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(investment =>
        investment.property?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.property?.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.property?.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(investment => investment.property?.property_type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(investment => investment.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
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

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Loading skeleton */}
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-48 rounded" />
          <div className="flex gap-2">
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-24 rounded" />
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-24 rounded" />
          </div>
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
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Text variant="h3" weight="semibold" className="mb-2">
            Portfolio Manager
          </Text>
          <Text variant="body" color="muted">
            {filteredInvestments.length} of {investments.length} investments
          </Text>
        </div>

        <div className="flex items-center gap-3">
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
              className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Filters */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value={PropertyType.RESIDENTIAL}>Residential</option>
            <option value={PropertyType.COMMERCIAL}>Commercial</option>
            <option value={PropertyType.MIXED_USE}>Mixed Use</option>
            <option value={PropertyType.INDUSTRIAL}>Industrial</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value={InvestmentStatus.COMPLETED}>Active</option>
            <option value={InvestmentStatus.PENDING}>Pending</option>
            <option value={InvestmentStatus.PROCESSING}>Processing</option>
            <option value={InvestmentStatus.FAILED}>Failed</option>
          </select>
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
          { field: 'yield' as const, label: 'Yield' },
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

      {/* Investment Grid/List */}
      <AnimatePresence mode="wait">
        {filteredInvestments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <Text variant="h3" weight="semibold" className="mb-2">
              No investments found
            </Text>
            <Text variant="body" color="muted" className="mb-4">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Start building your real estate portfolio'}
            </Text>
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Browse Properties
            </Button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredInvestments.map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {filteredInvestments.map((investment) => (
              <InvestmentListItem key={investment.id} investment={investment} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Investment Card Component
const InvestmentCard: React.FC<{ investment: PropertyInvestment }> = ({ investment }) => {
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
          <div className="absolute inset-0 flex items-center justify-center">
            <Building className="w-16 h-16 text-slate-400" />
          </div>
          
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

          {/* Action Menu */}
          <div className="absolute top-3 right-3">
            <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
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
              Invested {new Date(investment.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Investment Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Text variant="caption" color="muted" className="mb-1">
                Current Value
              </Text>
              <Text variant="body" weight="semibold">
                ${investment.performance?.current_value?.toLocaleString()}
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
                ${investment.performance?.monthly_income?.toLocaleString()}
              </Text>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Buy More
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
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
const InvestmentListItem: React.FC<{ investment: PropertyInvestment }> = ({ investment }) => {
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
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8 text-slate-400" />
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
                ${investment.performance?.current_value?.toLocaleString()}
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
                ${investment.performance?.monthly_income?.toLocaleString()}
              </Text>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};