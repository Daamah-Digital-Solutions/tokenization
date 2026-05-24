import React from 'react';
import { motion } from 'framer-motion';
import {
  Droplets,
  TrendingUp,
  Shield,
  Clock,
  ArrowRight,
  Percent,
  Users
} from 'lucide-react';
import { Button } from '../ui/Button';

export const LiquidityProviderCTA: React.FC = () => {
  const highlights = [
    {
      icon: Percent,
      label: 'Competitive Returns',
      value: 'Market-based yields',
    },
    {
      icon: Shield,
      label: 'Risk Management',
      value: 'Diversified portfolio',
    },
    {
      icon: Clock,
      label: 'Flexible Terms',
      value: 'Various commitment periods',
    },
    {
      icon: Users,
      label: 'Verified Platform',
      value: 'Regulated operations',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 mb-6">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">
                Liquidity Program
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Become a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Liquidity Provider
              </span>
            </h2>

            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Support the platform ecosystem by providing liquidity to the secondary market.
              Earn competitive returns while helping owners access exit opportunities.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {highlights.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                >
                  <item.icon className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="text-white font-semibold text-sm">{item.label}</div>
                  <div className="text-slate-400 text-xs">{item.value}</div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="primary"
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 border-0"
                onClick={() => window.location.href = '/liquidity-provider'}
              >
                Apply Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => window.location.href = '/liquidity-provider'}
              >
                Learn More
              </Button>
            </div>
          </motion.div>

          {/* Right - Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">LP Program Benefits</h3>
                  <p className="text-sm text-slate-400">For qualified participants</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  'Priority access to ownership opportunities',
                  'Reduced platform fees',
                  'Dedicated account management',
                  'Advanced reporting and analytics',
                  'Early access to new features',
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3 text-slate-200"
                  >
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Liquidity provider program is subject to qualification requirements and terms.
                  Returns are not guaranteed and past performance does not indicate future results.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
