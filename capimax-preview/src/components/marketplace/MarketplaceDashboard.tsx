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
import { Badge } from '../ui/Badge';
import { Container } from '../design-system/layout/Container';
import { MarketplaceListingCard } from './MarketplaceListingCard';
import { MarketplaceFilters } from './MarketplaceFilters';
import { MarketplaceStats } from './MarketplaceStats';
import { MarketplaceActivity } from './MarketplaceActivity';
import { cn } from '../../utils/cn';
import {
  marketplaceService,
  type MarketplaceFilters as FilterType,
  type SecondaryMarketListing
} from '../../services/marketplace/MarketplaceService';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'immediate' | 'auction'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({
    sort_by: 'created_desc'
  });

  // Combine search and filters
  const combinedFilters = useMemo(() => {
    const combined = { ...filters };

    if (selectedTab !== 'all') {
      combined.listing_type = selectedTab === 'immediate' ? 'IMMEDIATE' : 'AUCTION';
    }

    if (searchQuery) {
      // Search will be handled by the searchListings endpoint
      return combined;
    }

    return combined;
  }, [filters, selectedTab, searchQuery]);

  // Fetch listings
  const {
    data: listingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['marketplace-listings', combinedFilters, searchQuery, currentPage],
    queryFn: () => {
      if (searchQuery) {
        return marketplaceService.searchListings(searchQuery, combinedFilters, currentPage, 20);
      }
      return marketplaceService.getListings(combinedFilters, currentPage, 20);
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch marketplace stats
  const {
    data: statsData
  } = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: () => marketplaceService.getMarketplaceStats(),
    enabled: showStats,
    staleTime: 60000, // 1 minute
  });

  // Fetch recent activity
  const {
    data: activityData
  } = useQuery({
    queryKey: ['marketplace-activity'],
    queryFn: () => marketplaceService.getMarketplaceActivity(1, 10),
    enabled: showActivity,
    staleTime: 30000, // 30 seconds
  });

  const handlePurchase = (listingId: string) => {
    // This would open a purchase modal/dialog
    console.log('Purchase listing:', listingId);
  };

  const handleBid = (listingId: string) => {
    // This would open a bid modal/dialog
    console.log('Bid on listing:', listingId);
  };

  const handleViewDetails = (listingId: string) => {
    // This would navigate to listing details or open details modal
    console.log('View listing details:', listingId);
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  const listings = listingsData?.results || [];
  const totalCount = listingsData?.count || 0;
  const hasNextPage = !!listingsData?.next;
  const hasPreviousPage = !!listingsData?.previous;

  const tabs = [
    { id: 'all', label: 'All Listings', icon: Grid3X3 },
    { id: 'immediate', label: 'Buy Now', icon: Zap },
    { id: 'auction', label: 'Auctions', icon: Clock }
  ];

  return (
    <Container className={cn("py-8", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Secondary Market
            </h1>
            <p className="text-gray-600">
              Trade tokenized real estate on the secondary market
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

        {/* Stats Section */}
        {showStats && statsData && (
          <MarketplaceStats stats={statsData} className="mb-8" />
        )}

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search properties, locations, or token symbols..."
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
          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <MarketplaceFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                className="mb-6"
              />
            )}
          </AnimatePresence>

          {/* Recent Activity */}
          {showActivity && activityData && (
            <MarketplaceActivity
              activities={activityData.results}
              className="sticky top-6"
            />
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {totalCount.toLocaleString()} Listings
              </h2>
              {searchQuery && (
                <Badge variant="secondary">
                  Results for "{searchQuery}"
                </Badge>
              )}
            </div>

            <select
              value={filters.sort_by || 'created_desc'}
              onChange={(e) => handleFiltersChange({
                ...filters,
                sort_by: e.target.value as any
              })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="tokens_desc">Most Tokens</option>
              <option value="tokens_asc">Fewest Tokens</option>
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
          {!isLoading && !error && listings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                No listings found matching your criteria
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ sort_by: 'created_desc' });
                  setSelectedTab('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Listings Grid */}
          {!isLoading && !error && listings.length > 0 && (
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
                  {listings.map((listing) => (
                    <MarketplaceListingCard
                      key={listing.id}
                      listing={listing}
                      onPurchase={handlePurchase}
                      onBid={handleBid}
                      onViewDetails={handleViewDetails}
                      className={viewMode === 'list' ? "flex-row" : undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {(hasNextPage || hasPreviousPage) && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    disabled={!hasPreviousPage}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    disabled={!hasNextPage}
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