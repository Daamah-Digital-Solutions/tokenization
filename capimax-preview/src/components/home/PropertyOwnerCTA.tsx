import React from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  FileText,
  Settings,
  TrendingUp,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';

export const PropertyOwnerCTA: React.FC = () => {
  const benefits = [
    {
      icon: Users,
      text: 'Open new funding sources through multiple investors',
    },
    {
      icon: FileText,
      text: 'Broader marketing with trust built through documentation',
    },
    {
      icon: Settings,
      text: 'Improved asset lifecycle management',
    },
    {
      icon: CheckCircle2,
      text: 'Control over listing terms: minimum investment, lock-up period, distribution policy',
    },
    {
      icon: TrendingUp,
      text: 'Enhanced liquidity through secondary market',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 dark:from-emerald-900 dark:via-emerald-950 dark:to-teal-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mb-6">
              <Building className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                For Property Owners
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              For Property Owners{' '}
              <span className="text-emerald-200">&</span>{' '}
              Developers
            </h2>

            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              Transform your real estate assets into investment opportunities without selling
              full ownership.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50 border-0"
                onClick={() => window.location.href = '/property-owner'}
              >
                List Your Property
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/50 text-white hover:bg-white/10"
                onClick={() => window.location.href = '/property-owner'}
              >
                Learn More
              </Button>
            </div>
          </motion.div>

          {/* Right - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
          >
            <h3 className="text-xl font-bold text-white mb-6">
              Benefits for Property Owners
            </h3>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                    <benefit.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-emerald-50 leading-relaxed">
                    {benefit.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
