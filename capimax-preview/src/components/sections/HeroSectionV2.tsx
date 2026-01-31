import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Star, MapPin, Globe, TrendingUp, Building2, Home, Building } from 'lucide-react';
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
            alt="Real Estate Investment"
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

      {/* Subtle animated elements on top of background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.08, 0.05]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 rounded-full blur-3xl"
        />

        {/* Subtle floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -100, -20],
              x: [0, Math.sin(i) * 30, 0],
              opacity: [0, 0.4, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 10 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              left: `${10 + (i * 7) % 80}%`,
              top: `${20 + (i * 5) % 60}%`
            }}
          >
            <Building2 className="w-3 h-3 text-emerald-400/30" />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          
          {/* Center-Aligned Content */}
          <div className="text-center space-y-12">
            
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
            >
              <div className="relative">
                <Star className="w-5 h-5 text-amber-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <Sparkles className="w-5 h-5 text-amber-300/60" />
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-white/90">Tokenized Real Estate Investment | SPV-Backed | Global Access</span>
            </motion.div>

            {/* Headlines */}
            <div className="space-y-8 max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-white"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 relative">
                  Capimax Tokenization
                  <motion.div
                    animate={{
                      scaleX: [0, 1, 0],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: 1
                    }}
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-full shadow-[0_2px_10px_rgba(16,185,129,0.5)]"
                  />
                </span>
                <br />
                <span className="text-white">
                  Invest in Real Estate, Not Just Dreams
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl lg:text-2xl leading-relaxed text-gray-200 max-w-3xl mx-auto font-light"
              >
                A global technology platform for tokenizing assets and offering fractional
                investment opportunities through the SPV model, with document transparency,
                operational governance, and liquidity options via secondary market.
              </motion.p>

              {/* Property Types Highlight */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-emerald-300">Ready Properties</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-amber-300">Under Construction</span>
                </div>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Button
                variant="primary"
                size="lg"
                className="group relative px-10 py-5 text-lg font-semibold shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all duration-500 border-0 rounded-2xl overflow-hidden"
                onClick={() => window.location.href = '/register'}
              >
                <motion.div
                  animate={{ x: [-100, 300] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <span className="relative z-10 flex items-center">
                  Start Your Journey
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-3 w-5 h-5" />
                  </motion.div>
                </span>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="group px-10 py-5 text-lg font-semibold transition-all duration-500 rounded-2xl text-white border-white/20 hover:bg-white/10 hover:border-white/30"
                onClick={() => window.location.href = '/properties'}
              >
                <Zap className="mr-3 w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                Explore Properties
              </Button>
            </motion.div>

            {/* Bottom Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-20 pt-12"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { number: "$4.2B+", label: "Global Assets", icon: Globe },
                  { number: "50K+", label: "Happy Investors", icon: Star },
                  { number: "1,200+", label: "Properties", icon: MapPin },
                  { number: "22.4%", label: "Avg. Returns", icon: TrendingUp }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="space-y-4 group cursor-pointer"
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="inline-flex p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-shadow duration-300"
                    >
                      <stat.icon className="w-6 h-6 text-emerald-400" />
                    </motion.div>
                    <div className="text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-white to-gray-200 bg-clip-text">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-300 font-medium">
                      {stat.label}
                    </div>
                  </motion.div>
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