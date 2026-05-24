import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Shield,
  FileText,
  PieChart,
  Globe,
  ArrowRight,
  TrendingUp,
  Building2
} from 'lucide-react';
import { Button } from '../ui/Button';

export const InvestorCTA: React.FC = () => {
  const benefits = [
    {
      icon: Wallet,
      title: 'Fractional Ownership',
      description: 'Start with lower capital and diversify across multiple properties',
    },
    {
      icon: Shield,
      title: 'SPV Protection',
      description: 'Your ownership is protected through independent legal structures',
    },
    {
      icon: FileText,
      title: 'Full Transparency',
      description: 'Access to all property documents, valuations, and reports',
    },
    {
      icon: PieChart,
      title: 'Income Distribution',
      description: 'Receive proportional share of rental income and capital gains',
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Own properties worldwide from anywhere',
    },
    {
      icon: TrendingUp,
      title: 'Secondary Market',
      description: 'Option to trade your ownership units with other owners',
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800 mb-6">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
              For Owners
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Own{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
              Premium Real Estate
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Access institutional-grade real estate ownership with lower capital requirements
            and full transparency through our tokenized platform.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow duration-300">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              className="group"
              onClick={() => window.location.href = '/properties'}
            >
              Browse Properties
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = '/register'}
            >
              Create Free Account
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
