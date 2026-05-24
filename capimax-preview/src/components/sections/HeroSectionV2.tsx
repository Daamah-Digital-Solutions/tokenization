import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, MapPin, Globe, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';

// Real estate background images from Unsplash - Premium property photos
const HERO_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80', // Modern skyscrapers
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=80', // Luxury apartments
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=80', // Modern villa
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80', // Luxury interior
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80', // Modern house
];

export const HeroSectionV2: React.FC = () => {
  const [bgIndex, setBgIndex] = useState(0);

  // Auto-rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative min-h-screen overflow-hidden"
    >
      {/* Real Estate Background Image Carousel */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={bgIndex}
            src={HERO_BACKGROUNDS[bgIndex]}
            alt="Real Estate Ownership"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        {/* Dark overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/70 to-slate-900/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-transparent to-slate-900/70" />
      </div>

      {/* Background image indicators */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
        {HERO_BACKGROUNDS.map((_, index) => (
          <button
            key={index}
            onClick={() => setBgIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === bgIndex
                ? 'bg-emerald-400 w-6'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`View background ${index + 1}`}
          />
        ))}
      </div>

      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-emerald-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-emerald-500/5 to-transparent blur-3xl" />
      </div>

      {/* Main Content - pt-24 accounts for navbar height */}
      <div className="relative z-10 min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          
          {/* Center-Aligned Content */}
          <div className="text-center space-y-12">
            
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-white/90">Tokenized Real Estate Ownership | SPV-Backed | Global Access</span>
            </motion.div>

            {/* Headlines */}
            <div className="space-y-6 max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  Capimax Tokenization
                </span>
                <br />
                <span className="text-white mt-2 block">
                  Your Gateway to Owning Global Tokenized Real Estate
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl lg:text-2xl leading-relaxed text-gray-200 max-w-3xl mx-auto font-light"
              >
                The first global platform on blockchain that brings together
                developers, owners, investors, and brokers — under one
                SPV-backed framework.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                variant="primary"
                size="lg"
                className="px-8 py-4 text-base font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
                onClick={() => window.location.href = '/register'}
              >
                Start Owning
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="px-8 py-4 text-base font-semibold rounded-xl text-white border-white/30 hover:bg-white/10"
                onClick={() => window.location.href = '/properties'}
              >
                Explore Properties
              </Button>
            </motion.div>

            {/* Bottom Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 pt-8 border-t border-white/10"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { number: "$4.2B+", label: "Global Assets", icon: Globe },
                  { number: "50K+", label: "Owners", icon: Star },
                  { number: "1,200+", label: "Properties", icon: MapPin },
                  { number: "22.4%", label: "Avg. Returns", icon: TrendingUp }
                ].map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs text-gray-400 font-medium">Discover More</span>
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center relative overflow-hidden shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-4 bg-gradient-to-b from-emerald-400 to-green-400 rounded-full mt-2"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};