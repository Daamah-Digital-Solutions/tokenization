import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, TrendingUp, ArrowRight, ArrowLeft, Clock, Shield, Star, Building, DollarSign, Award, Sparkles, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { PropertyService } from '../../services/property/PropertyService';
import type { Property as BackendProperty } from '../../services/api/types';
import { useRouter } from '../../utils/router';

// Real estate fallback images by property type
const FALLBACK_IMAGES = {
  residential: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80', // Luxury apartments
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80', // Modern villa
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', // Modern house
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // Luxury home
  ],
  commercial: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80', // Skyscrapers
    'https://images.unsplash.com/photo-1464938050520-ef2571ea0620?w=800&q=80', // Commercial building
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', // Office building
    'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800&q=80', // Modern office
  ],
  hospitality: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // Hotel resort
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80', // Luxury hotel
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', // Resort pool
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', // Hotel lobby
  ],
};

// Get random fallback image by property type
const getPropertyFallbackImage = (propertyType: string, index: number): string => {
  const type = propertyType.toLowerCase() as keyof typeof FALLBACK_IMAGES;
  const images = FALLBACK_IMAGES[type] || FALLBACK_IMAGES.residential;
  return images[index % images.length];
};

interface Property {
  id: number;
  uuid: string; // Real backend UUID — used to route into property-detail
  image: string;
  title: string;
  location: string;
  price: string;
  tokenPrice: string;
  totalTokens: number;
  soldTokens: number;
  expectedReturn: string;
  investors: number;
  type: string;
  rating: number;
  yearBuilt: number;
  status: 'funding' | 'funded' | 'upcoming';
  featured?: boolean;
}

export const FeaturedProperties: React.FC = () => {
  const { navigate } = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Slider — horizontal scroll-snap container. Native swipe on mobile,
  // arrow buttons on desktop. Keeping it as a flex row (rather than a
  // 3-col grid) prevents the "one card stacked under another" look the
  // grid produces when there are only 3-6 listings to show.
  const sliderRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (direction: 1 | -1) => {
    const el = sliderRef.current;
    if (!el) return;
    // Scroll by ~85% of the viewport — one card-width on mobile, roughly
    // one card on desktop too because the cards are sized as a fraction
    // of the scroller width.
    const cardWidth = el.clientWidth * 0.85;
    el.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  };

  // Load featured properties from backend
  useEffect(() => {
    loadFeaturedProperties();
  }, []);

  const loadFeaturedProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch live properties (no status filter — backend already
      // restricts the public listings endpoint to properties that have
      // been approved AND tokenized, which is the "buyable" state).
      // Filtering by `status: 'approved'` here was wrong: properties
      // move from approved → tokenized once the SPV mints the tokens,
      // and `approved` is a transient state we never want to show on
      // the homepage. Result was an empty grid in production.
      const result = await PropertyService.getProperties({
        limit: 6,
        sort: 'created_at',
        order: 'desc',
      });

      const backendProperties: BackendProperty[] = result.properties || [];

      // Ensure we have an array before mapping
      if (!Array.isArray(backendProperties)) {
        console.error('Backend properties is not an array:', backendProperties);
        throw new Error('Invalid properties data received from backend');
      }

      // Convert backend properties to frontend format.
      // Every numeric field is defensively coerced because the backend
      // returns `null` for fields that haven't been populated yet
      // (expected_return, investor_count, average_rating, year_built),
      // and `${null}%` / arithmetic on null both produce "NaN%" / NaN
      // in the rendered card.
      const frontendProperties: Property[] = backendProperties.map((prop, index) => {
        const totalValue = Number(prop.total_value) || 0;
        const tokenPrice = Number(prop.token_price) || 0;
        const totalTokens = Number(prop.total_tokens) || 0;
        const soldTokens = Number(prop.tokens_sold) || 0;
        const fundingPercentage = totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0;
        const propertyType = (prop.property_type || 'residential') as string;
        const expectedReturn = prop.expected_return;
        const investorCount = (prop as any).investor_count;
        const averageRating = (prop as any).average_rating;
        const yearBuilt = (prop as any).year_built;

        return {
          id: parseInt(prop.id.replace(/-/g, '').substring(0, 8), 16), // Stable number for keys
          uuid: prop.id, // Real UUID — used by the "Own Now" CTA to deep-link into property-detail
          image: prop.images?.[0] || getPropertyFallbackImage(propertyType, index),
          title: prop.title,
          location: `${prop.city}${prop.state ? ', ' + prop.state : ''}, ${prop.country}`,
          price: `$${(totalValue / 1000000).toFixed(2)}M`,
          tokenPrice: `$${tokenPrice.toLocaleString()}`,
          totalTokens,
          soldTokens,
          // Show "—" placeholder when expected_return hasn't been set on
          // backend yet, instead of leaking "null%" / "NaN%" into the UI.
          expectedReturn: expectedReturn != null && !isNaN(Number(expectedReturn))
            ? `${Number(expectedReturn).toFixed(1)}%`
            : '—',
          investors: Number(investorCount) || 0,
          type: propertyType === 'residential' ? 'Residential' :
                propertyType === 'commercial' ? 'Commercial' : 'Hospitality',
          rating: Number(averageRating) || 4.5,
          yearBuilt: Number(yearBuilt) || new Date().getFullYear(),
          status: fundingPercentage >= 100 ? 'funded' : 'funding' as const,
          featured: (prop as any).featured || false,
        };
      });

      setProperties(frontendProperties);
    } catch (err: any) {
      console.error('Failed to load featured properties:', err);
      setError(err.message || 'Failed to load featured properties');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['all', 'Residential', 'Commercial', 'Hospitality'];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const filteredProperties = selectedCategory === 'all'
    ? properties
    : properties.filter(p => p.type === selectedCategory);

  // Loading state
  if (isLoading) {
    return (
      <section id="properties" className="relative py-24 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Premium Ownership Opportunities</span>
            </motion.div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Featured Properties
            </h2>
          </div>

          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
              <p className="text-slate-600 dark:text-gray-400">Loading featured properties...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section id="properties" className="relative py-24 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Featured Properties
            </h2>
            <div className="text-center py-16">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={loadFeaturedProperties} variant="primary">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="properties" className="relative py-24 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            opacity: [0.03, 0.06, 0.03],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-green-400/20 dark:from-emerald-500/15 dark:to-green-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            opacity: [0.03, 0.06, 0.03],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl"
        />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Enhanced Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Premium Ownership Opportunities</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight"
          >
            Featured Properties
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto text-balance"
          >
            Carefully vetted premium real estate opportunities with verified returns,
            transparent purchase terms, and institutional-grade due diligence
          </motion.p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center gap-2 mb-12"
        >
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20'
                  : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Empty state — keeps the section from collapsing into nothing
            when the backend hasn't tokenized any properties yet, or when
            the category filter excludes everything. */}
        {filteredProperties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center py-16 mb-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40"
          >
            <Building className="w-12 h-12 mx-auto text-emerald-500/70 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {selectedCategory === 'all'
                ? 'New properties coming soon'
                : `No ${selectedCategory.toLowerCase()} properties yet`}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {selectedCategory === 'all'
                ? 'Our team is finalising the next batch of tokenized properties. Check back shortly or browse the full catalogue.'
                : 'Try a different category, or browse the full catalogue for all live listings.'}
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = '/properties')}
            >
              Browse all properties
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
        <div className="relative mb-16">
          {/* Prev / Next arrows — hidden on touch viewports where native
              swipe is the primary gesture. Only shown when there's more
              than one card to scroll through. */}
          {filteredProperties.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Previous properties"
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Next properties"
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

        <motion.div
          ref={sliderRef}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="
            flex overflow-x-auto snap-x snap-mandatory
            gap-6 pb-6 -mx-6 px-6
            scroll-smooth
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <AnimatePresence mode="wait">
            {filteredProperties.map((property, index) => (
              <motion.div
                key={property.id}
                variants={cardVariants}
                className="
                  relative snap-start flex-shrink-0
                  w-[85%] sm:w-[60%] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]
                "
              >
                {/* Featured Badge */}
                {property.featured && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-3 left-6 z-10 px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
                  >
                    <Award className="w-3 h-3" />
                    FEATURED
                  </motion.div>
                )}

                {/* Property Card — static. Hover lift / image zoom / border
                    & shadow transitions were removed because they were
                    triggering a perceived lag on touch + low-end devices. */}
                <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xl dark:shadow-[0_4px_20px_rgba(16,185,129,0.1)]">

                  {/* Image Section */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-800/20 to-transparent" />
                    
                    {/* Overlay Content */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <div className="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{property.type}</span>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/20">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{property.rating}</span>
                      </div>
                    </div>

                    {/* Bottom Overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {property.title}
                      </h3>
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <MapPin className="w-3 h-3" />
                        <span>{property.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Content Section */}
                  <div className="p-6">
                    {/* Price Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 p-3 rounded-xl">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {property.price}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-500 mt-1">Total Value</div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 rounded-xl">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {property.tokenPrice}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-500 mt-1">Per Token</div>
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 dark:text-gray-400">Funding Progress</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {Math.round((property.soldTokens / property.totalTokens) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(property.soldTokens / property.totalTokens) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full relative"
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </motion.div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-gray-500 mt-2">
                        <span>{property.soldTokens.toLocaleString()} sold</span>
                        <span>{property.totalTokens.toLocaleString()} total</span>
                      </div>
                    </div>

                    {/* Enhanced Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-2 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <Users className="w-4 h-4 mx-auto mb-1 text-slate-600 dark:text-gray-400" />
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{property.investors}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-500">Owners</div>
                      </div>
                      <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{property.expectedReturn}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-500">Returns</div>
                      </div>
                      <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <Building className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{property.yearBuilt}</div>
                        <div className="text-xs text-slate-500 dark:text-gray-500">Built</div>
                      </div>
                    </div>

                    {/* Enhanced CTA Button — opens this specific property's
                        detail page so the user can review and start the
                        purchase flow. Was incorrectly hard-coded to
                        `/properties` (listing page), which dumped users
                        on the catalogue and made it look like nothing
                        happened. */}
                    <button
                      type="button"
                      onClick={() => navigate('property-detail', { id: property.uuid })}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-500 active:from-emerald-600 active:to-green-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20"
                    >
                      <span>Own Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Static trust line — was an expandable hover footer
                        ("Verified & Insured" / "Quarterly Dividends") that
                        animated open every time the card was hovered. Made
                        the card feel laggy on slower devices. Now always
                        visible, no animation. */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span>Verified &amp; Insured Property</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>Quarterly Dividend Payments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        </div>
        )}

        {/* Enhanced CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 border border-slate-200 dark:border-gray-700 rounded-3xl p-12 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,0.03) 35px, rgba(0,0,0,0.03) 70px)`
              }} />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 mb-6">
                <Building className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Discover More Ownership Opportunities
              </h3>
              <p className="text-slate-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Access our complete portfolio of 500+ premium properties across 
                residential, commercial, and hospitality sectors
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 transition-all"
                  onClick={() => window.location.href = '/properties'}
                >
                  <span>Browse All Properties</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="px-8 py-3 rounded-xl font-semibold transition-all"
                  onClick={() => window.location.href = '/properties'}
                >
                  <DollarSign className="mr-2 w-5 h-5" />
                  <span>Purchase Calculator</span>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};