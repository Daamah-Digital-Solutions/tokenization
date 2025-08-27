import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export const TrustedPartners: React.FC = () => {
  const partners = [
    "Goldman Sachs", "JP Morgan", "BlackRock", "Coinbase", 
    "Deloitte", "PwC", "KPMG", "Chainlink"
  ];

  return (
    <section className="relative py-16 bg-white dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 bg-gradient-to-b">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-navy-600 dark:text-navy-300 uppercase tracking-wide">
              Trusted Partners
            </span>
          </div>
        </motion.div>

        {/* Partners Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center"
        >
          {partners.map((partner, index) => (
            <motion.div
              key={partner}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center"
            >
              <div className="text-navy-400 dark:text-navy-500 hover:text-navy-600 dark:hover:text-navy-300 transition-colors duration-200 text-sm font-medium text-center">
                {partner}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};