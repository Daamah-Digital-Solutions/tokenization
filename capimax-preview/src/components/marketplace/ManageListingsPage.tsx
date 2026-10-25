import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Eye,
  Edit,
  X,
  RefreshCw,
  MapPin,
  DollarSign,
  Clock,
  Timer,
  Activity,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { Badge } from '../design-system/icons/Badge';
import { Container } from '../design-system/layout/Container';
import { Card } from '../design-system/cards/Card';
import { Heading } from '../design-system/typography/Heading';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { marketplaceService, type SecondaryMarketListing } from '../../services/marketplace/MarketplaceService';
import { useAuth } from '../../contexts/AuthContext';
import { PROPERTY_PLACEHOLDER, handleImageFallback } from '../../utils/imageFallback';
import { useTranslation } from 'react-i18next';

interface ManageListingsPageProps {
  className?: string;
}

export const ManageListingsPage: React.FC<ManageListingsPageProps> = ({
  className
}) => {
  const { user } = useAuth();
  const { t } = useTranslation('market');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch user's listings
  const {
    data: listingsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-listings', selectedStatus, currentPage],
    queryFn: () => marketplaceService.getUserListings(
      selectedStatus === 'all' ? undefined : selectedStatus,
      currentPage,
      20
    ),
    staleTime: 10000, // 10 seconds
  });

  // Cancel listing mutation
  const cancelListingMutation = useMutation({
    mutationFn: (listingId: string) => marketplaceService.cancelListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    }
  });

  const listings = listingsData?.results || [];
  const totalCount = listingsData?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  // Filter listings by search query
  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;

    return listings.filter(listing =>
      listing.property_listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.property_listing.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listings, searchQuery]);

  const handleCancelListing = async (listingId: string) => {
    if (confirm(t('manage.confirmCancel'))) {
      try {
        await cancelListingMutation.mutateAsync(listingId);
      } catch (error) {
        console.error('Failed to cancel listing:', error);
      }
    }
  };

  const handleExtendListing = (listingId: string) => {
    // TODO: Implement extend listing functionality
    console.log('Extend listing:', listingId);
  };

  const statusFilters = [
    { id: 'all', label: t('smd.tabAll'), count: totalCount },
    { id: 'active', label: t('status.active'), count: listings.filter(l => l.status === 'active').length },
    { id: 'partially_filled', label: t('status.partially_filled'), count: listings.filter(l => l.status === 'partially_filled').length },
    { id: 'completed', label: t('status.completed'), count: listings.filter(l => l.status === 'completed').length },
    { id: 'cancelled', label: t('status.cancelled'), count: listings.filter(l => l.status === 'cancelled').length },
    { id: 'expired', label: t('status.expired'), count: listings.filter(l => l.status === 'expired').length }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      partially_filled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Container className={cn("py-8", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('manage.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('manage.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t('manage.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setSelectedStatus(filter.id);
                setCurrentPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                selectedStatus === filter.id
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <span>{filter.label}</span>
              <Badge variant="secondary" className="text-xs">
                {filter.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-32"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-600 dark:text-red-400 mb-4">
            {t('manage.loadError')}
          </div>
          <Button onClick={() => refetch()}>{t('smd.tryAgain')}</Button>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && filteredListings.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {totalCount === 0 ? t('manage.noListingsYet') : t('smd.noResults')}
          </div>
          {totalCount === 0 && (
            <Button onClick={() => window.location.href = '/marketplace'}>
              {t('manage.createFirst')}
            </Button>
          )}
        </div>
      )}

      {/* Listings List */}
      {!isLoading && !error && filteredListings.length > 0 && (
        <>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onCancel={handleCancelListing}
                  onExtend={handleExtendListing}
                  isLoading={cancelListingMutation.isPending}
                />
              ))}
            </AnimatePresence>
          </div>

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
    </Container>
  );
};

// Listing Row Component
interface ListingRowProps {
  listing: SecondaryMarketListing;
  onCancel: (id: string) => void;
  onExtend: (id: string) => void;
  isLoading: boolean;
}

const ListingRow: React.FC<ListingRowProps> = ({
  listing,
  onCancel,
  onExtend,
  isLoading
}) => {
  const { t, i18n } = useTranslation('market');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : undefined;
  const fillPercentage = ((listing.tokens_offered - listing.tokens_remaining) / listing.tokens_offered) * 100;
  const expiresAt = new Date(listing.expires_at);
  const isExpiringSoon = (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // 24 hours
  const canCancel = ['active', 'partially_filled'].includes(listing.status);
  const canExtend = ['active', 'partially_filled', 'expired'].includes(listing.status);

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      partially_filled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Property Image and Info */}
        <div className="flex gap-4 flex-1">
          <img
            src={listing.property_listing.images?.[0]?.image || listing.property_listing.image_url || PROPERTY_PLACEHOLDER}
            alt={listing.property_listing.title}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            onError={handleImageFallback}
          />
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {listing.property_listing.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <MapPin className="w-4 h-4 me-1" />
                  {listing.property_listing.city}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={cn("text-xs font-medium px-2 py-1", getStatusColor(listing.status))}>
                  {t(`status.${listing.status}`, { defaultValue: listing.status.replace('_', ' ') })}
                </Badge>
                {isExpiringSoon && listing.status === 'active' && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                    {t('smd.expiresSoon')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{t('manage.progress')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {t('manage.soldOfTotal', { sold: (listing.tokens_offered - listing.tokens_remaining).toLocaleString(), total: listing.tokens_offered.toLocaleString() })}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('manage.filledPct', { value: fillPercentage.toFixed(1) })}
              </div>
            </div>
          </div>
        </div>

        {/* Listing Details */}
        <div className="flex flex-col lg:flex-row gap-6 lg:w-2/3">
          {/* Pricing Info */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('manage.pricePerToken')}</span>
              <div className="font-bold text-lg text-gray-900 dark:text-white">
                ${parseFloat(listing.price_per_token).toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.totalValue')}</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                ${parseFloat(listing.total_price).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('smd.minOrder')}</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {t('smd.nTokens', { value: listing.minimum_order_size })}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('manage.expires')}</span>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                {expiresAt.toLocaleDateString(dateLocale)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              {t('manage.view')}
            </Button>
            {canExtend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtend(listing.id)}
                className="flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                {t('manage.extend')}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(listing.id)}
                disabled={isLoading}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <X className="w-4 h-4" />
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Clock className="w-4 h-4 me-1" />
              {t('manage.created', { date: new Date(listing.created_at).toLocaleDateString(dateLocale) })}
            </div>
            {listing.accepts_partial_fills && (
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 me-1 text-green-500" />
                {t('manage.partialAllowed')}
              </div>
            )}
          </div>
          {listing.notes && (
            <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {t('manage.note')} {listing.notes.substring(0, 50)}{listing.notes.length > 50 ? '...' : ''}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};