import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Map, Grid3X3, List, SlidersHorizontal, MapPin, TrendingUp, Users, Star, Loader } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Button } from '../components/ui/Button';
import { Input } from '../components/design-system/forms/Input';
import { PropertyCard } from '../components/design-system/cards/PropertyCard';
import { SearchBar } from '../components/properties/SearchBar';
import { cn } from '../utils/cn';
import { useRouter } from '../utils/router';
import { PropertyService } from '../services/property/PropertyService';
import type { Property } from '../services/api/types';
import { InvestmentFlow, type InvestmentProperty, type InvestmentData } from '../components/investment';


type ViewMode = 'grid' | 'list' | 'map';
type SortOption = 'featured' | 'price-low' | 'price-high' | 'return-high' | 'return-low' | 'newest' | 'oldest';

export const PropertiesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [showFilters, setShowFilters] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestmentFlow, setShowInvestmentFlow] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const propertyTypes = ['all', 'Residential', 'Commercial', 'Hospitality'];
  const statusOptions = ['all', 'funding', 'funded', 'upcoming', 'approved'];

  // Load properties from API
  useEffect(() => {
    loadProperties();
  }, [selectedStatus]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Map frontend status to backend status
      const statusMap: Record<string, string> = {
        'funding': 'funding',
        'funded': 'funded',
        'upcoming': 'draft',
        'approved': 'approved'
      };

      const filters: any = {
        limit: 100, // Get more properties
        sort: 'created_at',
        order: 'desc'
      };

      // Add status filter if not 'all'
      if (selectedStatus !== 'all' && statusMap[selectedStatus]) {
        filters.status = statusMap[selectedStatus];
      }

      const result = await PropertyService.getProperties(filters);

      if (result && result.properties) {
        setProperties(result.properties);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      console.error('Failed to load properties:', err);
      setError(err.message || 'Failed to load properties');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Map Property to display format with additional search fields
  const mapPropertyForSearch = (property: Property): Property & { searchableLocation: string; searchableType: string; displayStatus: string } => {
    return {
      ...property,
      searchableLocation: `${property.city}, ${property.country}`,
      searchableType: property.property_type || 'Residential',
      displayStatus: property.status === 'approved' ? 'funding' : property.status
    };
  };

  // Investment flow handlers
  const handleInvestClick = (property: Property) => {
    setSelectedProperty(property);
    setShowInvestmentFlow(true);
  };

  const handleInvestmentComplete = (investment: InvestmentData) => {
    console.log('Investment completed:', investment);
    // In a real app, you would update the portfolio, send to backend, etc.
    setShowInvestmentFlow(false);
    setSelectedProperty(null);
    // Optionally refresh the properties to show updated token counts
    loadProperties();
  };

  const handleInvestmentClose = () => {
    setShowInvestmentFlow(false);
    setSelectedProperty(null);
  };

  // Convert Property to InvestmentProperty format
  const convertToInvestmentProperty = (property: Property): InvestmentProperty => {
    return {
      id: parseInt(property.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to number
      title: property.title,
      tokenPrice: property.token_price,
      minInvestment: property.minimum_investment || property.token_price,
      expectedReturn: property.expected_return || 10,
      totalTokens: property.total_tokens,
      soldTokens: property.tokens_sold,
      investment: {
        minInvestment: property.minimum_investment || property.token_price,
        avgAnnualReturn: property.expected_return || 10,
        dividendFrequency: "Quarterly",
        managementFee: 2.5,
        appreciationForecast: 8,
        rentalYield: property.rental_yield || 6,
        totalROI: (property.expected_return || 10) + (property.rental_yield || 6)
      }
    };
  };

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    // Map properties with search helper fields
    const searchableProperties = properties.map(mapPropertyForSearch);

    let filtered = searchableProperties.filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           property.searchableLocation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || property.searchableType === selectedType;
      const matchesStatus = selectedStatus === 'all' || property.displayStatus === selectedStatus ||
                          (selectedStatus === 'approved' && property.displayStatus === 'funding');

      // Price range filtering
      const matchesPrice = property.total_value >= priceRange[0] && property.total_value <= priceRange[1];

      return matchesSearch && matchesType && matchesStatus && matchesPrice;
    });

    // Sort properties
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'featured':
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
        case 'price-low':
          return a.total_value - b.total_value;
        case 'price-high':
          return b.total_value - a.total_value;
        case 'return-high':
          return b.expected_return - a.expected_return;
        case 'return-low':
          return a.expected_return - b.expected_return;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [properties, searchQuery, selectedType, selectedStatus, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-16 pt-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
          />
        </div>

        <Container className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Property Marketplace
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Discover premium real estate investment opportunities with verified returns and transparent tokenization
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-sm text-gray-300">Properties</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">$2.8B+</div>
                <div className="text-sm text-gray-300">Total Value</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">25K+</div>
                <div className="text-sm text-gray-300">Investors</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">16.8%</div>
                <div className="text-sm text-gray-300">Avg. Returns</div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Search and Filters Section */}
      <section className="py-8 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <Container>
          <div className="space-y-6">
            {/* Enhanced Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={(query) => setSearchQuery(query)}
              placeholder="Search properties by name, location, or type..."
            />

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex flex-wrap items-center gap-4">
                {/* Property Type Filter */}
                <div className="flex gap-2">
                  {propertyTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                        selectedType === type
                          ? "bg-emerald-500 text-white shadow-lg"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  {statusOptions.map(status => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all duration-200 capitalize",
                        selectedStatus === status
                          ? "bg-blue-500 text-white shadow-lg"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Advanced Filters Toggle */}
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="featured">Featured First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="return-high">Returns: High to Low</option>
                  <option value="return-low">Returns: Low to High</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === 'grid'
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === 'list'
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === 'map'
                        ? "bg-white dark:bg-gray-700 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price Range
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100000000"
                        step="1000000"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="w-full accent-emerald-500"
                      />
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>$0</span>
                        <span>${(priceRange[1] / 1000000).toFixed(0)}M</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Return
                    </label>
                    <select className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      <option>Any</option>
                      <option>5%+</option>
                      <option>10%+</option>
                      <option>15%+</option>
                      <option>20%+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year Built
                    </label>
                    <select className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                      <option>Any</option>
                      <option>2020+</option>
                      <option>2015+</option>
                      <option>2010+</option>
                      <option>2000+</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Container>
      </section>

      {/* Results Section */}
      <section className="py-8">
        <Container>
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading properties...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Failed to Load Properties
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <Button variant="primary" onClick={loadProperties}>
                Try Again
              </Button>
            </div>
          )}

          {/* Results */}
          {!loading && !error && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredAndSortedProperties.length} Properties Found
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Showing results for "{searchQuery || 'all properties'}"
                  </p>
                </div>
              </div>

              {viewMode === 'grid' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredAndSortedProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <PropertyCard
                    {...property}
                    onCardClick={() => navigate('property-detail', { id: property.id })}
                    onInvestClick={() => handleInvestClick(property)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

              {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredAndSortedProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300"
                >
                  <div className="flex gap-6">
                    <img
                      src={property.images && property.images.length > 0
                        ? property.images[0]
                        : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                      alt={property.title}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {property.average_rating || 4.5}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{property.city}, {property.country}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Total Value</div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            ${(property.total_value / 1000000).toFixed(2)}M
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Token Price</div>
                          <div className="font-bold text-emerald-600">${property.token_price.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Expected Return</div>
                          <div className="font-bold text-emerald-600">{property.expected_return}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Investors</div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {property.investor_count || Math.floor(property.tokens_sold / 10)}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.round((property.tokens_sold / property.total_tokens) * 100)}% funded
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('property-detail', { id: property.id })}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleInvestClick(property)}
                          >
                            Invest
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

              {viewMode === 'map' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800">
              <div className="text-center">
                <Map className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Map View Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Interactive map functionality will be available in the next update
                </p>
              </div>
            </div>
          )}

              {/* Empty State */}
              {filteredAndSortedProperties.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Properties Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Try adjusting your filters or search terms to find more properties
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
            </>
          )}
        </Container>
      </section>

      <Footer />

      {/* Investment Flow Modal */}
      {selectedProperty && (
        <InvestmentFlow
          property={convertToInvestmentProperty(selectedProperty)}
          isOpen={showInvestmentFlow}
          onClose={handleInvestmentClose}
          onComplete={handleInvestmentComplete}
        />
      )}
    </div>
  );
};