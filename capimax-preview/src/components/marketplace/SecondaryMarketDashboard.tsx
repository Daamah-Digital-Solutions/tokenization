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
  Zap,
  ArrowUpDown,
  Users,
  ShoppingCart,
  Plus,
  BarChart3,
  Timer,
  Building2,
  XCircle,
  Tag,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { Badge } from '../design-system/icons/Badge';
import { Container } from '../design-system/layout/Container';
import { cn } from '../../utils/cn';
import { marketplaceService, type SecondaryMarketListing, type MarketplaceFilters } from '../../services/marketplace/MarketplaceService';
import { useUser } from '../../contexts/AuthContext';
import { Card } from '../design-system/cards/Card';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';
import { BuyOrderModal } from './BuyOrderModal';
import { CreateListingModal } from './CreateListingModal';
import { useRouter } from '../../utils/router';
import { useTranslation } from 'react-i18next';

interface SecondaryMarketDashboardProps {
  className?: string;
  showStats?: boolean;
}

export const SecondaryMarketDashboard: React.FC<SecondaryMarketDashboardProps> = ({
  className,
  showStats = true
}) => {
  const user = useUser(); // useAuth() exposes { state }, so { user } was always undefined
  const { navigate } = useRouter();
  const { t } = useTranslation('market');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'sell' | 'buy' | 'mine'>('sell');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    sort_by: 'created_desc'
  });
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SecondaryMarketListing | null>(null);
  const [createListingModalOpen, setCreateListingModalOpen] = useState(false);

  // Combine search and filters
  const combinedFilters = useMemo(() => {
    const combined = { ...filters };

    // Apply tab filters
    if (selectedTab === 'mine') {
      // all of the user's own listings, any status, so they can follow and cancel them
      (combined as any).my_listings = 'true';
    } else {
      // the market only shows what can still be traded
      (combined as any).active_only = 'true';
      if (selectedTab === 'sell') {
        combined.listing_type = 'sell';
      } else if (selectedTab === 'buy') {
        combined.listing_type = 'buy';
      }
    }

    // Add search query
    if (searchQuery) {
      combined.search = searchQuery;
    }

    // Add pagination
    combined.page = currentPage;
    combined.page_size = 20;

    return combined;
  }, [filters, selectedTab, searchQuery, currentPage]);

  // Fetch listings
  const {
    data: listingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['secondary-market-listings', combinedFilters],
    queryFn: () => marketplaceService.getListings(combinedFilters, currentPage, 20),
    staleTime: 10000, // 10 seconds for real-time feel
  });

  // Fetch market stats
  const {
    data: marketStats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: () => marketplaceService.getMarketplaceStats(),
    staleTime: 30000, // 30 seconds
    enabled: showStats
  });

  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: (listingId: string) => marketplaceService.cancelListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secondary-market-listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-stats'] });
    },
    onError: (err: any) => {
      window.alert(err?.message || t('smd.cancelFailed'));
    },
  });

  const handleCancelListing = (listing: SecondaryMarketListing) => {
    if (window.confirm(t('smd.cancelConfirm'))) {
      cancelMutation.mutate(listing.id);
    }
  };

  const handleCreateListing = () => {
    setCreateListingModalOpen(true);
  };

  const handleBuyTokens = (listing: SecondaryMarketListing) => {
    setSelectedListing(listing);
    setBuyModalOpen(true);
  };

  const handleViewDetails = (listing: SecondaryMarketListing) => {
    // Send the buyer to the underlying property's detail page — that's
    // where the data room, valuation history, investor list, and other
    // due-diligence material lives. A listing-level details view doesn't
    // exist yet and the property page covers the same need.
    const propertyId = (listing.property_listing as any)?.id;
    if (propertyId) {
      navigate('property-detail', { id: propertyId });
    } else {
      // Fall back to the all-properties browse page so the click never dies.
      navigate('properties');
    }
  };

  const handleFiltersChange = (newFilters: MarketplaceFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  const listings = listingsData?.results || [];
  const totalCount = listingsData?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const tabs = [
    { id: 'sell', label: t('smd.tabSell'), icon: ArrowUpDown, description: t('smd.tabSellDesc') },
    { id: 'buy', label: t('smd.tabBuy'), icon: ShoppingCart, description: t('smd.tabBuyDesc') },
    { id: 'all', label: t('smd.tabAll'), icon: List, description: t('smd.tabAllDesc') },
    ...(user ? [{ id: 'mine', label: t('smd.tabMine'), icon: Tag, description: t('smd.tabMineDesc') }] : [])
  ];

  const stats = [
    {
      label: t('smd.statActiveListings'),
      value: marketStats?.total_listings || 0,
      icon: Activity,
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      label: t('smd.stat24hVolume'),
      value: `$${(marketStats?.total_volume_24h || 0).toLocaleString()}`,
      icon: BarChart3,
      change: '+8.2%',
      changeType: 'positive' as const
    },
    {
      label: t('smd.statAvgPrice'),
      value: `$${(marketStats?.average_price_per_token || 0).toFixed(2)}`,
      icon: DollarSign,
      change: '+2.1%',
      changeType: 'positive' as const
    },
    {
      label: t('smd.statActiveTraders'),
      value: marketStats?.active_traders || 0,
      icon: Users,
      change: marketStats?.active_traders ? `${marketStats.active_traders}` : '0',
      changeType: 'neutral' as const
    }
  ];

  return (
    <div className={cn("py-8 px-4 max-w-7xl mx-auto", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('smd.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('smd.subtitle')}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex items-center gap-2 shrink-0"
              aria-label={t('common.refresh')}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </Button>
            <Button
              onClick={handleCreateListing}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('smd.createListing')}
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.label}</span>
                  <stat.icon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    stat.changeType === 'positive' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {stat.change}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t('smd.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
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
              {t('smd.filters')}
            </Button>

            <div className="flex border rounded-lg dark:border-gray-600">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-e-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-s-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => {
                setSelectedTab(id as any);
                setCurrentPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all flex-1 shrink-0 whitespace-nowrap",
                selectedTab === id
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-4 h-4" />
              <div className="text-start">
                <div className="font-semibold">{label}</div>
                <div className="text-xs opacity-75 hidden sm:block">{description}</div>
              </div>
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('smd.filters')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('smd.propertyType')}
                    </label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={filters.property_type || ''}
                      onChange={(e) => handleFiltersChange({
                        ...filters,
                        property_type: e.target.value || undefined
                      })}
                    >
                      <option value="">{t('smd.allTypes')}</option>
                      <option value="residential">{t('propertyTypes.residential')}</option>
                      <option value="commercial">{t('propertyTypes.commercial')}</option>
                      <option value="industrial">{t('propertyTypes.industrial')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('smd.priceRange')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder={t('smd.min')}
                        value={filters.min_price || ''}
                        onChange={(e) => handleFiltersChange({
                          ...filters,
                          min_price: e.target.value ? Number(e.target.value) : undefined
                        })}
                      />
                      <Input
                        type="number"
                        placeholder={t('smd.max')}
                        value={filters.max_price || ''}
                        onChange={(e) => handleFiltersChange({
                          ...filters,
                          max_price: e.target.value ? Number(e.target.value) : undefined
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('smd.sortBy')}
                    </label>
                    <select
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={filters.sort_by || 'created_desc'}
                      onChange={(e) => handleFiltersChange({
                        ...filters,
                        sort_by: e.target.value as any
                      })}
                    >
                      <option value="created_desc">{t('sort.newest')}</option>
                      <option value="created_asc">{t('sort.oldest')}</option>
                      <option value="price_asc">{t('sort.priceAsc')}</option>
                      <option value="price_desc">{t('sort.priceDesc')}</option>
                      <option value="tokens_asc">{t('sort.tokensAsc')}</option>
                      <option value="tokens_desc">{t('sort.tokensDesc')}</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Market Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('smd.marketStatus')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">{t('smd.marketStatus')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">{t('smd.open')}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">{t('smd.totalListings')}</span>
                <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">{t('smd.activeSellOrders')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {listings.filter(l => l.listing_type === 'sell' && l.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 text-sm">{t('smd.activeBuyOrders')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {listings.filter(l => l.listing_type === 'buy' && l.status === 'active').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {totalCount.toLocaleString()} {selectedTab === 'all' ? t('smd.listings') : selectedTab === 'sell' ? t('smd.tabSell') : t('smd.tabBuy')}
              </h2>
              {searchQuery && (
                <Badge variant="secondary">
                  {t('smd.resultsFor', { query: searchQuery })}
                </Badge>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-96"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-4">
                {t('smd.loadError')}
              </div>
              <Button onClick={() => refetch()}>{t('smd.tryAgain')}</Button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && listings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                {t('smd.noResults')}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ sort_by: 'created_desc' });
                  setSelectedTab('sell');
                }}
              >
                {t('smd.clearFilters')}
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
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      viewMode={viewMode}
                      onBuy={handleBuyTokens}
                      onViewDetails={handleViewDetails}
                      onCancel={handleCancelListing}
                      cancelling={cancelMutation.isPending && cancelMutation.variables === listing.id}
                      currentUser={user}
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
                    {t('smd.previous')}
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('smd.pageOf', { page: currentPage, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    {t('smd.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Buy Order Modal */}
      <BuyOrderModal
        isOpen={buyModalOpen}
        onClose={() => {
          setBuyModalOpen(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        onSuccess={() => {
          refetch(); // Refresh listings after successful order
        }}
      />

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={createListingModalOpen}
        onClose={() => setCreateListingModalOpen(false)}
        onSuccess={() => {
          refetch(); // Refresh listings after successful creation
        }}
      />
    </div>
  );
};

// Listing Card Component
interface ListingCardProps {
  listing: SecondaryMarketListing;
  viewMode: 'grid' | 'list';
  onBuy: (listing: SecondaryMarketListing) => void;
  onViewDetails: (listing: SecondaryMarketListing) => void;
  onCancel: (listing: SecondaryMarketListing) => void;
  cancelling?: boolean;
  currentUser: any;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  viewMode,
  onBuy,
  onViewDetails,
  onCancel,
  cancelling,
  currentUser
}) => {
  const { t, i18n } = useTranslation('market');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : undefined;
  const isOwnListing = currentUser?.id === listing.seller.id;
  const isOpen = listing.status === 'active' || listing.status === 'partially_filled';
  const fillPercentage = ((listing.tokens_offered - listing.tokens_remaining) / listing.tokens_offered) * 100;
  const expiresAt = new Date(listing.expires_at);
  const isExpiringSoon = (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // 24 hours

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    partially_filled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  const typeColors = {
    sell: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    buy: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer",
        viewMode === 'list' ? "flex" : ""
      )}
      onClick={() => onViewDetails(listing)}
    >
      {/* Property Image */}
      <div className={cn(
        "relative bg-gradient-to-br from-blue-100 via-emerald-50 to-amber-50 dark:from-blue-900/30 dark:via-emerald-900/20 dark:to-amber-900/20",
        viewMode === 'list' ? "w-48 flex-shrink-0" : "h-48"
      )}>
        {(() => {
          const imgUrl =
            listing.property_listing.images?.[0]?.image ||
            (listing.property_listing as any).image_url;
          if (imgUrl) {
            return (
              <img
                src={imgUrl}
                alt={listing.property_listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // The src returned by the backend may 404 (e.g., demo data
                  // with no real image file). Hide the broken-image icon and
                  // let the gradient + emoji fallback show through.
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          }
          return (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-blue-300 dark:text-blue-700" />
            </div>
          );
        })()}
        <div className="absolute top-3 start-3">
          <Badge
            className={cn("text-xs font-medium px-2 py-1", typeColors[listing.listing_type])}
          >
            {listing.listing_type === 'sell' ? t('smd.forSale') : t('smd.wantToBuy')}
          </Badge>
        </div>
        <div className="absolute top-3 end-3">
          <Badge
            className={cn("text-xs font-medium px-2 py-1", statusColors[listing.status])}
          >
            {t(`status.${listing.status}`, { defaultValue: listing.status.replace('_', ' ') })}
          </Badge>
        </div>
        {isExpiringSoon && listing.status === 'active' && (
          <div className="absolute bottom-3 end-3">
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
              <Timer className="w-3 h-3 me-1" />
              {t('smd.expiresSoon')}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        <div className="space-y-3">
          {/* Property Info */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 line-clamp-1">
              {listing.property_listing.title}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4 me-1" />
              {listing.property_listing.city}
            </div>
          </div>

          {/* Seller Info */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Users className="w-4 h-4 me-2" />
            {isOwnListing ? t('smd.yourListing') : t('smd.seller', { name: listing.seller.full_name })}
          </div>

          {/* Token Info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.tokensAvailable')}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {listing.tokens_remaining.toLocaleString()} / {listing.tokens_offered.toLocaleString()}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${100 - fillPercentage}%` }}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.pricePerToken')}</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                ${parseFloat(listing.price_per_token).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.totalValue')}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${parseFloat(listing.total_price).toLocaleString()}
              </span>
            </div>
            {listing.minimum_order_size > 1 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.minOrder')}</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {t('smd.nTokens', { value: listing.minimum_order_size })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!isOwnListing && isOpen && listing.listing_type === 'sell' && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(listing);
                }}
                className="flex-1"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 me-2" />
                {t('smd.buyTokens')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(listing);
              }}
              size="sm"
            >
              <Eye className="w-4 h-4 me-2" />
              {t('smd.details')}
            </Button>
            {isOwnListing && isOpen && (
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(listing);
                }}
                disabled={cancelling}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20"
                size="sm"
              >
                <XCircle className="w-4 h-4 me-2" />
                {cancelling ? t('smd.cancelling') : t('smd.cancelListing')}
              </Button>
            )}
          </div>

          {/* Expiry info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="w-3 h-3 me-1" />
            {t('smd.expires', { date: expiresAt.toLocaleDateString(dateLocale) })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};