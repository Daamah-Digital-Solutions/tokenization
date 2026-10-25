import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  FileCheck,
  ArrowRightLeft,
  TrendingDown,
  Check,
  X,
  ArrowRight,
  LayoutGrid,
  Home,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

export const TokenizationExplainer: React.FC = () => {
  const { t } = useTranslation('ui');
  const enablesItems = [
    { icon: LayoutGrid, text: t('tokenExplainer.enables1') },
    { icon: Home, text: t('tokenExplainer.enables2') },
    { icon: Users, text: t('tokenExplainer.enables3') },
    { icon: FileCheck, text: t('tokenExplainer.enables4') },
    { icon: Building2, text: t('tokenExplainer.enables5') },
  ];

  const doesNotMeanItems = [
    t('tokenExplainer.not1'),
    t('tokenExplainer.not2'),
    t('tokenExplainer.not3'),
    t('tokenExplainer.not4'),
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-200 dark:border-emerald-800 mb-6">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {t('tokenExplainer.badge')}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            {t('tokenExplainer.titlePrefix')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              {t('tokenExplainer.titleHighlight')}
            </span>
            {t('tokenExplainer.titleSuffix')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {t('tokenExplainer.intro')}
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* What Tokenization Enables */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 border border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('tokenExplainer.enablesTitle')}
              </h3>
            </div>
            <div className="space-y-4">
              {enablesItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 rounded-xl shadow-sm"
                >
                  <div className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <item.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* What Tokenization Does NOT Mean */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-slate-500 dark:bg-slate-600 rounded-xl">
                <X className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('tokenExplainer.notTitle')}
              </h3>
            </div>
            <div className="space-y-4">
              {doesNotMeanItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
                >
                  <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <X className="w-5 h-5 text-red-500 dark:text-red-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Button
            variant="outline"
            size="lg"
            className="group"
            onClick={() => window.location.href = '/tokenization'}
          >
            {t('tokenExplainer.learnMore')}
            <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
