import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Star, MapPin, Globe, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';

export const HeroSectionV2: React.FC = () => {

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800"
    >
      {/* Enhanced Dark Mode Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs for dark mode */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-emerald-400/10 to-green-400/10 dark:from-emerald-500/20 dark:to-green-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 dark:from-emerald-500/15 dark:to-cyan-500/15 rounded-full blur-3xl"
        />
        
        {/* Enhanced Floating Particles with glow effect in dark mode */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -100, -20],
              x: [0, Math.sin(i) * 50, 0],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 8 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              left: `${10 + (i * 4) % 80}%`,
              top: `${20 + (i * 3) % 60}%`
            }}
          >
            <Sparkles className="w-2 h-2 text-blue-400/40 dark:text-cyan-400/60 dark:drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          
          {/* Center-Aligned Content */}
          <div className="text-center space-y-12">
            
            {/* Enhanced Trust Badge for dark mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 dark:backdrop-blur-2xl backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl dark:shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
            >
              <div className="relative">
                <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400/60 dark:text-yellow-300/80" />
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Tokenized Real Estate Investment | SPV-Backed | Global Access</span>
            </motion.div>

            {/* Enhanced Headlines with better dark mode gradients */}
            <div className="space-y-8 max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-slate-800 dark:text-white"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 relative">
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
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 rounded-full dark:shadow-[0_2px_10px_rgba(16,185,129,0.5)]"
                  />
                </span>
                <br />
                <span className="text-slate-800 dark:text-white">
                  Invest in Real Estate, Not Just Dreams
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
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
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Ready Properties</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Under Construction</span>
                </div>
              </motion.div>
            </div>

            {/* Enhanced CTA Buttons with dark mode glow effects */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Button
                variant="primary"
                size="lg"
                className="group relative px-10 py-5 text-lg font-semibold shadow-2xl hover:shadow-emerald-500/25 dark:shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition-all duration-500 border-0 rounded-2xl overflow-hidden"
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
                className="group px-10 py-5 text-lg font-semibold transition-all duration-500 rounded-2xl"
                onClick={() => window.location.href = '/properties'}
              >
                <Zap className="mr-3 w-5 h-5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300" />
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
                      className="inline-flex p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-400/20 group-hover:shadow-lg dark:group-hover:shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-shadow duration-300"
                    >
                      <stat.icon className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                    </motion.div>
                    <div className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-transparent dark:bg-gradient-to-r dark:from-emerald-400 dark:to-green-400 dark:bg-clip-text">
                      {stat.number}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400 font-medium">
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
          <span className="text-xs text-slate-500 dark:text-gray-500 font-medium">Discover More</span>
          <div className="w-6 h-10 border-2 border-slate-300 dark:border-emerald-500/40 rounded-full flex justify-center relative overflow-hidden dark:shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-green-500 dark:from-emerald-400 dark:to-green-400 rounded-full mt-2"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};