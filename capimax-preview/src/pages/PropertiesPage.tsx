import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Map, Grid3X3, List, SlidersHorizontal, MapPin, TrendingUp, Users, Star } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/design-system/layout/Container';
import { Button } from '../components/ui/Button';
import { Input } from '../components/design-system/forms/Input';
import { PropertyCard } from '../components/design-system/cards/PropertyCard';
import { SearchBar } from '../components/properties/SearchBar';
import { cn } from '../utils/cn';

// Mock property data - this will be replaced with API calls
const mockProperties = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Manhattan Elite Tower",
    location: "New York, NY",
    price: "$12.85M",
    tokenPrice: "$1,000",
    totalTokens: 12850,
    soldTokens: 10280,
    expectedReturn: "14.8%",
    investors: 847,
    type: "Residential",
    rating: 4.8,
    yearBuilt: 2022,
    status: 'funding' as const,
    featured: true
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Silicon Valley Tech Hub",
    location: "Palo Alto, CA",
    price: "$28.5M",
    tokenPrice: "$2,500",
    totalTokens: 11400,
    soldTokens: 6840,
    expectedReturn: "18.2%",
    investors: 1203,
    type: "Commercial",
    rating: 4.9,
    yearBuilt: 2021,
    status: 'funding' as const
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Miami Beach Resort",
    location: "Miami, FL",
    price: "$45.75M",
    tokenPrice: "$5,000",
    totalTokens: 9150,
    soldTokens: 6405,
    expectedReturn: "22.4%",
    investors: 892,
    type: "Hospitality",
    rating: 4.7,
    yearBuilt: 2023,
    status: 'funding' as const
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Downtown Chicago Office",
    location: "Chicago, IL",
    price: "$18.2M",
    tokenPrice: "$1,500",
    totalTokens: 12133,
    soldTokens: 8493,
    expectedReturn: "16.5%",
    investors: 654,
    type: "Commercial",
    rating: 4.6,
    yearBuilt: 2020,
    status: 'funding' as const
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Seattle Modern Loft",
    location: "Seattle, WA",
    price: "$8.5M",
    tokenPrice: "$850",
    totalTokens: 10000,
    soldTokens: 7500,
    expectedReturn: "12.3%",
    investors: 423,
    type: "Residential",
    rating: 4.5,
    yearBuilt: 2021,
    status: 'funding' as const
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Austin Tech Campus",
    location: "Austin, TX",
    price: "$32.1M",
    tokenPrice: "$3,000",
    totalTokens: 10700,
    soldTokens: 5350,
    expectedReturn: "20.1%",
    investors: 892,
    type: "Commercial",
    rating: 4.8,
    yearBuilt: 2022,
    status: 'funding' as const
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Las Vegas Resort & Casino",
    location: "Las Vegas, NV",
    price: "$65.8M",
    tokenPrice: "$6,500",
    totalTokens: 10123,
    soldTokens: 8098,
    expectedReturn: "25.2%",
    investors: 1547,
    type: "Hospitality",
    rating: 4.9,
    yearBuilt: 2023,
    status: 'funding' as const,
    featured: true
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    title: "Boston Historic Brownstone",
    location: "Boston, MA",
    price: "$4.2M",
    tokenPrice: "$420",
    totalTokens: 10000,
    soldTokens: 10000,
    expectedReturn: "11.8%",
    investors: 234,
    type: "Residential",
    rating: 4.4,
    yearBuilt: 1895,
    status: 'funded' as const
  }
];

type ViewMode = 'grid' | 'list' | 'map';
type SortOption = 'featured' | 'price-low' | 'price-high' | 'return-high' | 'return-low' | 'newest' | 'oldest';

export const PropertiesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [showFilters, setShowFilters] = useState(false);

  const propertyTypes = ['all', 'Residential', 'Commercial', 'Hospitality'];
  const statusOptions = ['all', 'funding', 'funded', 'upcoming'];

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = mockProperties.filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           property.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || property.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || property.status === selectedStatus;
      
      // Convert price string to number for comparison
      const priceValue = parseFloat(property.price.replace(/[$M,]/g, '')) * 1000000;
      const matchesPrice = priceValue >= priceRange[0] && priceValue <= priceRange[1];

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
          return parseFloat(a.price.replace(/[$M,]/g, '')) - parseFloat(b.price.replace(/[$M,]/g, ''));
        case 'price-high':
          return parseFloat(b.price.replace(/[$M,]/g, '')) - parseFloat(a.price.replace(/[$M,]/g, ''));
        case 'return-high':
          return parseFloat(b.expectedReturn.replace('%', '')) - parseFloat(a.expectedReturn.replace('%', ''));
        case 'return-low':
          return parseFloat(a.expectedReturn.replace('%', '')) - parseFloat(b.expectedReturn.replace('%', ''));
        case 'newest':
          return b.yearBuilt - a.yearBuilt;
        case 'oldest':
          return a.yearBuilt - b.yearBuilt;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, selectedType, selectedStatus, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
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
                  <PropertyCard {...property} />
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
                      src={property.image}
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
                            {property.rating}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{property.location}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Total Value</div>
                          <div className="font-bold text-gray-900 dark:text-white">{property.price}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Token Price</div>
                          <div className="font-bold text-emerald-600">{property.tokenPrice}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Expected Return</div>
                          <div className="font-bold text-emerald-600">{property.expectedReturn}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Investors</div>
                          <div className="font-bold text-gray-900 dark:text-white">{property.investors}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.round((property.soldTokens / property.totalTokens) * 100)}% funded
                        </div>
                        <Button variant="primary" size="sm">
                          View Details
                        </Button>
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
        </Container>
      </section>

      <Footer />
    </div>
  );
};