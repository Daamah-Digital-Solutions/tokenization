import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, List, Map, Search, MapPin, Star, TrendingUp, Users, Building, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { PropertyCard } from '../design-system/cards/PropertyCard';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { PropertyFilterOptions } from '../../services/api/types';
import type { Property } from '../../services/api/types';
import { PropertyService } from '../../services/property/PropertyService';

export type ViewMode = 'grid' | 'list' | 'map';

// Using the Property interface from API types
export type PropertyGridItem = Property & {
  funding_percentage?: number;
  investor_count?: number;
  featured?: boolean;
  rating?: number;
};

interface PropertyGridProps {
  properties?: PropertyGridItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  loading?: boolean;
  onPropertyClick?: (property: PropertyGridItem) => void;
  className?: string;
  filters?: PropertyFilterOptions;
  onFiltersChange?: (filters: PropertyFilterOptions) => void;
  autoLoad?: boolean;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties: initialProperties,
  viewMode,
  onViewModeChange,
  loading: externalLoading = false,
  onPropertyClick,
  className,
  filters,
  onFiltersChange,
  autoLoad = true
}) => {
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyGridItem[]>(initialProperties || []);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  const loading = externalLoading || internalLoading;

  // Load properties from API
  useEffect(() => {
    if (autoLoad && !initialProperties) {
      loadProperties();
    }
  }, [filters, autoLoad]);

  const loadProperties = async (page: number = 1) => {
    try {
      setInternalLoading(true);
      setError(null);

      const filterOptions = {
        ...filters,
        page,
        limit: pagination.limit
      };

      const result = await PropertyService.getProperties(filterOptions);
      
      // Transform API properties to include additional UI properties
      const transformedProperties: PropertyGridItem[] = result.properties.map(property => ({
        ...property,
        funding_percentage: property.tokens_sold > 0 ? (property.tokens_sold / property.total_tokens) * 100 : 0,
        investor_count: 0, // This would come from a separate API call or be included in the property data
        featured: property.status === 'active' && property.tokens_sold < property.total_tokens * 0.5,
        rating: 4.5 // Mock rating - would come from API
      }));

      setProperties(page === 1 ? transformedProperties : [...properties, ...transformedProperties]);
      setPagination(result.pagination);
    } catch (error: any) {
      console.error('Failed to load properties:', error);
      setError(error.message || 'Failed to load properties');
    } finally {
      setInternalLoading(false);
    }
  };

  const loadMoreProperties = () => {
    if (pagination.page < pagination.pages && !loading) {
      loadProperties(pagination.page + 1);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const handlePropertyClick = (property: Property) => {
    if (onPropertyClick) {
      onPropertyClick(property);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="h-56 bg-gray-300 dark:bg-gray-700" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded-xl" />
                    <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded-xl" />
                  </div>
                  <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex gap-6">
                <div className="w-32 h-32 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
                  <div className="grid grid-cols-4 gap-4">
                    <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16"
    >
      <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Properties Found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Try adjusting your filters or search terms to find more properties
      </p>
      <Button variant="primary" size="md">
        Browse All Properties
      </Button>
    </motion.div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (properties.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* View Mode Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {properties.length} Properties Found
          </h2>
          <div className="hidden md:flex text-gray-600 dark:text-gray-400 text-sm">
            Showing premium investment opportunities
          </div>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "p-2 rounded-md transition-all duration-200 flex items-center gap-2",
              viewMode === 'grid'
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Grid</span>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              "p-2 rounded-md transition-all duration-200 flex items-center gap-2",
              viewMode === 'list'
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">List</span>
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={cn(
              "p-2 rounded-md transition-all duration-200 flex items-center gap-2",
              viewMode === 'map'
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Map</span>
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' && (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                variants={itemVariants}
                layout
                whileHover={{ y: -8 }}
                onHoverStart={() => setHoveredProperty(property.id)}
                onHoverEnd={() => setHoveredProperty(null)}
                onClick={() => handlePropertyClick(property)}
                className="cursor-pointer"
              >
                <PropertyCard
                  {...property}
                  onInvestClick={() => handlePropertyClick(property)}
                  onQuickView={() => handlePropertyClick(property)}
                  className="h-full"
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {viewMode === 'list' && (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-4"
          >
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                variants={itemVariants}
                layout
                whileHover={{ x: 4 }}
                onHoverStart={() => setHoveredProperty(property.id)}
                onHoverEnd={() => setHoveredProperty(null)}
                onClick={() => handlePropertyClick(property)}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg"
              >
                <div className="flex gap-6">
                  <div className="relative flex-shrink-0">
                    <img
                      src={property.images && property.images.length > 0 ? property.images[0] : '/images/placeholder-property.jpg'}
                      alt={property.title}
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/placeholder-property.jpg';
                      }}
                    />
                    {property.featured && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full">
                        FEATURED
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold text-gray-800 dark:text-white">
                          {property.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{property.city}{property.address ? ', ' + property.address : ''}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {property.property_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {property.year_built ? `Built ${property.year_built}` : 'Year N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Total Value</span>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(property.total_value)}
                        </div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-gray-500">Token Price</span>
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(property.token_price)}
                        </div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-gray-500">Returns</span>
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {property.expected_return ? `${property.expected_return.toFixed(1)}%` : 'TBD'}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Investors</span>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white">{property.investor_count}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">
                            {Math.round((property.tokens_sold / property.total_tokens) * 100)}% funded
                          </span>
                        </div>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-32">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(property.tokens_sold / property.total_tokens) * 100}%` }}
                          />
                        </div>
                      </div>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex items-center gap-2 group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePropertyClick(property);
                        }}
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {viewMode === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-200 dark:border-gray-800 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Map className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Interactive Map Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Explore properties on an interactive map with location-based filtering and detailed property markers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onViewModeChange('grid')}
                >
                  View Grid Instead
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => onViewModeChange('list')}
                >
                  View List Instead
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};