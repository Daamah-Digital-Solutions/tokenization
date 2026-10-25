import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  MapPin,
  Home,
  DollarSign,
  Coins,
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import type { MarketplaceFilters as FilterType } from '../../services/marketplace/MarketplaceService';
import { useTranslation } from 'react-i18next';

interface MarketplaceFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  className?: string;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  filters,
  onFiltersChange,
  className
}) => {
  const { t } = useTranslation('market');
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  const propertyTypes = [
    { value: 'residential', label: t('propertyTypes.residential'), icon: Home },
    { value: 'commercial', label: t('propertyTypes.commercial'), icon: Home },
    { value: 'industrial', label: t('propertyTypes.industrial'), icon: Home },
    { value: 'mixed_use', label: t('propertyTypes.mixed_use'), icon: Home },
    { value: 'land', label: t('propertyTypes.land'), icon: Home }
  ];

  const popularLocations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA'
  ];

  const handleLocalFilterChange = (key: keyof FilterType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { sort_by: filters.sort_by };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    const filterKeys = Object.keys(localFilters).filter(key =>
      key !== 'sort_by' && localFilters[key as keyof FilterType] !== undefined
    );
    return filterKeys.length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('smd.filters')}</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          {t('filters.clearAll')}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('smd.propertyType')}
          </label>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  const isSelected = localFilters.property_type === value;
                  handleLocalFilterChange('property_type', isSelected ? undefined : value);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  localFilters.property_type === value
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('filters.location')}
          </label>
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('filters.locationPlaceholder')}
                value={localFilters.location || ''}
                onChange={(e) => handleLocalFilterChange('location', e.target.value || undefined)}
                className="ps-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {popularLocations.slice(0, 5).map((location) => (
                <button
                  key={location}
                  onClick={() => {
                    const isSelected = localFilters.location === location;
                    handleLocalFilterChange('location', isSelected ? undefined : location);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    localFilters.location === location
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <DollarSign className="inline w-4 h-4 me-1" />
            {t('filters.priceRange')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder={t('filters.minPrice')}
                value={localFilters.min_price || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleLocalFilterChange('min_price', value);
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder={t('filters.maxPrice')}
                value={localFilters.max_price || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleLocalFilterChange('max_price', value);
                }}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Token Quantity Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Coins className="inline w-4 h-4 me-1" />
            {t('filters.tokenRange')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder={t('filters.minTokens')}
                value={localFilters.min_tokens || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleLocalFilterChange('min_tokens', value);
                }}
                min="1"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder={t('filters.maxTokens')}
                value={localFilters.max_tokens || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleLocalFilterChange('max_tokens', value);
                }}
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Listing Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('filters.listingStatus')}
          </label>
          <div className="space-y-2">
            {[
              { value: 'ACTIVE', label: t('status.active'), color: 'green' },
              { value: 'SOLD', label: t('status.sold'), color: 'gray' },
              { value: 'EXPIRED', label: t('status.expired'), color: 'orange' },
              { value: 'CANCELLED', label: t('status.cancelled'), color: 'red' }
            ].map(({ value, label, color }) => (
              <label key={value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.status === value}
                  onChange={(e) => {
                    handleLocalFilterChange('status', e.target.checked ? value : undefined);
                  }}
                  className="me-2 rounded"
                />
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    color === 'green' && "bg-green-100 text-green-700",
                    color === 'gray' && "bg-gray-100 text-gray-700",
                    color === 'orange' && "bg-orange-100 text-orange-700",
                    color === 'red' && "bg-red-100 text-red-700"
                  )}
                >
                  {label}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('filters.quickFilters')}
          </label>
          <div className="space-y-2">
            <button
              onClick={() => {
                handleLocalFilterChange('listing_type',
                  localFilters.listing_type === 'AUCTION' ? undefined : 'AUCTION'
                );
              }}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all",
                localFilters.listing_type === 'AUCTION'
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <span>{t('filters.auctionsOnly')}</span>
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleLocalFilterChange('listing_type',
                  localFilters.listing_type === 'IMMEDIATE' ? undefined : 'IMMEDIATE'
                );
              }}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all",
                localFilters.listing_type === 'IMMEDIATE'
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <span>{t('filters.buyNowOnly')}</span>
              <DollarSign className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Apply Filters Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Button
          onClick={applyFilters}
          className="w-full"
          disabled={JSON.stringify(filters) === JSON.stringify(localFilters)}
        >
          {t('filters.apply')} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>
    </motion.div>
  );
};