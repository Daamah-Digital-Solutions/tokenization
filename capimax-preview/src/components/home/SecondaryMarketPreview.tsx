import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  ShoppingCart,
  Tag,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/Button';

export const SecondaryMarketPreview: React.FC = () => {
  const features = [
    {
      icon: Tag,
      title: 'List Your Units',
      description: 'Put your ownership units up for sale at your desired price',
    },
    {
      icon: ShoppingCart,
      title: 'Purchase Units',
      description: 'Buy units from other owners on the marketplace',
    },
    {
      icon: TrendingUp,
      title: 'Market-Driven Pricing',
      description: 'Prices determined by supply and demand dynamics',
    },
    {
      icon: ShieldCheck,
      title: 'Compliance-Verified',
      description: 'All transactions meet regulatory requirements',
    },
  ];

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full border border-purple-200 dark:border-purple-800 mb-6">
              <ArrowLeftRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Trading Platform
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Secondary{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                Market
              </span>
            </h2>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Trade your ownership units with other verified owners through our organized
              secondary marketplace.
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                >
                  <div className="flex-shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <feature.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => window.location.href = '/marketplace'}
            >
              Explore Marketplace
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Right - Warning Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              {/* Market Visual */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Example Listing
                  </span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    Active
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Property</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Dubai Marina Tower</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Units Available</span>
                    <span className="font-semibold text-slate-900 dark:text-white">50 units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Price per Unit</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">$105.00</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">
                      Important Notice
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      Liquidity is not guaranteed. Prices may fluctuate based on supply
                      and demand. Past performance does not indicate future results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
