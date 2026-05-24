import React from 'react';
import { motion } from 'framer-motion';
import { Search, Wallet, Building2, TrendingUp, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Search,
      title: "Browse Properties",
      description: "Explore Ready Properties generating immediate income or Under Construction projects with higher returns.",
      step: "01"
    },
    {
      icon: Wallet,
      title: "Buy Securely",
      description: "Connect your wallet and purchase through our regulated, secure platform infrastructure.",
      step: "02"
    },
    {
      icon: Building2,
      title: "Own Digital Shares",
      description: "Receive blockchain tokens representing your fractional ownership in premium properties.",
      step: "03"
    },
    {
      icon: TrendingUp,
      title: "Earn Returns",
      description: "Get quarterly dividends from Ready Properties or construction milestone returns from new developments.",
      step: "04"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="how-it-works" className="relative py-24 bg-white dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 bg-gradient-to-b overflow-hidden">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-subtle-pattern opacity-50"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold text-navy-900 dark:text-white mb-4 leading-tight"
          >
            How It Works
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-navy-600 dark:text-navy-200 max-w-2xl mx-auto text-balance"
          >
            Four simple steps to start owning premium real estate through our secure platform
          </motion.p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="relative group"
              >
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                    className="hidden lg:block absolute top-16 left-full w-full h-px bg-emerald-200 dark:bg-emerald-800 transform origin-left z-0"
                    style={{ width: 'calc(100% - 2rem)' }}
                  />
                )}

                {/* Card */}
                <div className="relative bg-white dark:bg-navy-800/50 border border-navy-200 dark:border-navy-700 rounded-2xl p-6 h-full group-hover:border-emerald-300 dark:group-hover:border-emerald-600 transition-all duration-300 shadow-subtle">
                  {/* Step Number */}
                  <div className="w-8 h-8 bg-emerald-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center mb-4">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-navy-900 dark:text-white">
                      {step.title}
                    </h3>
                    
                    <p className="text-navy-600 dark:text-navy-300 leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Simple CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="bg-navy-50 dark:bg-navy-800/30 border border-navy-200 dark:border-navy-700 rounded-2xl p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-4"
            >
              <h3 className="text-2xl font-semibold text-navy-900 dark:text-white">
                Ready to Get Started?
              </h3>
              <p className="text-navy-600 dark:text-navy-200 max-w-lg mx-auto">
                Join thousands of owners building wealth through tokenized real estate.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200 text-white font-medium px-6 py-3 rounded-xl"
              >
                Start Owning
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};