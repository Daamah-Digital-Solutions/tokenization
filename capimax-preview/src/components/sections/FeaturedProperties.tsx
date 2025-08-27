import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, TrendingUp, ArrowRight, Clock, Shield, Star, Building, DollarSign, Award, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface Property {
  id: number;
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
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const properties: Property[] = [
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
      status: 'funding',
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
      status: 'funding'
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
      status: 'funding'
    }
  ];

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
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Premium Investment Opportunities</span>
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
            transparent investment terms, and institutional-grade due diligence
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

        {/* Enhanced Properties Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          <AnimatePresence mode="wait">
            {filteredProperties.map((property, index) => (
              <motion.div
                key={property.id}
                layout
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                onHoverStart={() => setHoveredId(property.id)}
                onHoverEnd={() => setHoveredId(null)}
                className="group relative"
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

                {/* Enhanced Property Card */}
                <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden group-hover:border-emerald-400 dark:group-hover:border-emerald-500 transition-all duration-300 shadow-xl dark:shadow-[0_4px_20px_rgba(16,185,129,0.1)] group-hover:shadow-2xl dark:group-hover:shadow-emerald-500/10">
                  
                  {/* Enhanced Image Section */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
                        <div className="text-xs text-slate-500 dark:text-gray-500">Investors</div>
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

                    {/* Enhanced CTA Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group"
                    >
                      <span>Invest Now</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>

                    {/* Hover Effect Details */}
                    <AnimatePresence>
                      {hoveredId === property.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span>Verified & Insured Property</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 mt-2">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            <span>Quarterly Dividend Payments</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

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
                Discover More Investment Opportunities
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
                >
                  <span>Browse All Properties</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="px-8 py-3 rounded-xl font-semibold transition-all"
                >
                  <DollarSign className="mr-2 w-5 h-5" />
                  <span>Investment Calculator</span>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};