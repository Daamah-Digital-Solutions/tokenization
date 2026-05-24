import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  SortAsc,
  TrendingUp,
  Activity,
  Eye,
  Grid3X3,
  List,
  RefreshCw,
  MapPin,
  DollarSign,
  Clock,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { Badge } from '../design-system/icons/Badge';
import { Container } from '../design-system/layout/Container';
import { PropertyCard } from '../design-system/cards/PropertyCard';
import { cn } from '../../utils/cn';
import { PropertyService } from '../../services/property/PropertyService';
import { useRouter } from '../../utils/router';
import type { Property, PropertyFilterOptions } from '../../services/api/types';

interface MarketplaceDashboardProps {
  className?: string;
  showStats?: boolean;
  showActivity?: boolean;
}

export const MarketplaceDashboard: React.FC<MarketplaceDashboardProps> = ({
  className,
  showStats = true,
  showActivity = true
}) => {
  const { navigate } = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'approved' | 'featured'>('approved');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFilterOptions>({
    status: 'approved' as any, // Show approved properties for investment
    sort: 'created_at',
    order: 'desc'
  });

  // Combine search and filters
  const combinedFilters = useMemo(() => {
    const combined = { ...filters };

    // Apply tab filters
    if (selectedTab === 'approved') {
      combined.status = 'approved' as any;
    } else if (selectedTab === 'featured') {
      // Add featured filter when available
      combined.status = 'approved' as any;
    }

    // Add search query
    if (searchQuery) {
      combined.search = searchQuery;
    }

    // Add pagination
    combined.page = currentPage;
    combined.limit = 20;

    return combined;
  }, [filters, selectedTab, searchQuery, currentPage]);

  // Fetch properties
  const {
    data: propertiesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['marketplace-properties', combinedFilters],
    queryFn: () => PropertyService.getProperties(combinedFilters),
    staleTime: 30000, // 30 seconds
  });

  const handleInvest = (propertyId: string) => {
    // This would open an investment modal/dialog
    console.log('Invest in property:', propertyId);
  };

  const handleViewDetails = (propertyId: string) => {
    // Navigate to property details page with property ID as URL parameter
    console.log('Navigating to property details:', propertyId);

    // Add property ID to URL as query parameter
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('propertyId', propertyId);
    window.history.pushState({ propertyId }, '', currentUrl.toString());

    // Navigate to property detail page
    navigate('property-detail');
  };

  const handleFiltersChange = (newFilters: PropertyFilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  const properties = propertiesData?.properties || [];
  const totalCount = propertiesData?.pagination.total || 0;
  const totalPages = propertiesData?.pagination.pages || 1;

  const tabs = [
    { id: 'approved', label: 'Available Properties', icon: Grid3X3 },
    { id: 'featured', label: 'Featured', icon: Zap },
    { id: 'all', label: 'All Properties', icon: List }
  ];

  return (
    <Container className={cn("py-8", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Property Marketplace
            </h1>
            <p className="text-gray-600">
              Own tokenized real estate properties
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Section - Hidden for now until property stats are implemented */}
        {false && showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm">Total Properties</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            </div>
          </div>
        )}

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search properties by title, location, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSelectedTab(id as any);
                setCurrentPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                selectedTab === id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Filters - TODO: Implement property-specific filters */}
          <AnimatePresence>
            {showFilters && (
              <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type
                    </label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={filters.property_type || ''}
                      onChange={(e) => handleFiltersChange({
                        ...filters,
                        property_type: e.target.value || undefined
                      })}
                    >
                      <option value="">All Types</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={filters.status || 'approved'}
                      onChange={(e) => handleFiltersChange({
                        ...filters,
                        status: e.target.value as any
                      })}
                    >
                      <option value="approved">Available to Buy</option>
                      <option value="under_review">Under Review</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Property Stats */}
          {!showActivity && (
            <div className="bg-white rounded-xl p-6 shadow-sm border sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Market Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Total Properties</span>
                  <span className="font-medium">{totalCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Available to Buy</span>
                  <span className="font-medium">{properties.filter(p => p.status === 'approved').length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {totalCount.toLocaleString()} Properties
              </h2>
              {searchQuery && (
                <Badge variant="secondary">
                  Results for "{searchQuery}"
                </Badge>
              )}
            </div>

            <select
              value={filters.sort || 'created_at'}
              onChange={(e) => handleFiltersChange({
                ...filters,
                sort: e.target.value,
                order: e.target.value.endsWith('_desc') ? 'desc' : 'asc'
              })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="created_at">Newest First</option>
              <option value="-created_at">Oldest First</option>
              <option value="-total_value">Price: High to Low</option>
              <option value="total_value">Price: Low to High</option>
              <option value="-total_tokens">Most Tokens</option>
              <option value="total_tokens">Fewest Tokens</option>
            </select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-200 rounded-2xl h-96"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                Failed to load marketplace listings
              </div>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && properties.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                No properties found matching your criteria
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ sort: 'created_at', order: 'desc' });
                  setSelectedTab('approved');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Properties Grid */}
          {!isLoading && !error && properties.length > 0 && (
            <>
              <motion.div
                layout
                className={cn(
                  viewMode === 'grid'
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    : "space-y-4"
                )}
              >
                <AnimatePresence mode="popLayout">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      {...property}
                      id={String(property.id)}
                      onInvestClick={() => handleInvest(String(property.id))}
                      onQuickView={() => handleViewDetails(String(property.id))}
                      onCardClick={() => handleViewDetails(String(property.id))}
                      className={viewMode === 'list' ? "flex-row" : undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
};