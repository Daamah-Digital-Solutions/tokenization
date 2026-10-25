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
import { useTranslation } from 'react-i18next';

export const InvestorCTA: React.FC = () => {
  const { t } = useTranslation('ui');
  const benefits = [
    { icon: Wallet, title: t('investorCta.b1.title'), description: t('investorCta.b1.desc') },
    { icon: Shield, title: t('investorCta.b2.title'), description: t('investorCta.b2.desc') },
    { icon: FileText, title: t('investorCta.b3.title'), description: t('investorCta.b3.desc') },
    { icon: PieChart, title: t('investorCta.b4.title'), description: t('investorCta.b4.desc') },
    { icon: Globe, title: t('investorCta.b5.title'), description: t('investorCta.b5.desc') },
    { icon: TrendingUp, title: t('investorCta.b6.title'), description: t('investorCta.b6.desc') },
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
              {t('investorCta.badge')}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            {t('investorCta.titlePrefix')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
              {t('investorCta.titleHighlight')}
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {t('investorCta.subtitle')}
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
              {t('investorCta.browse')}
              <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = '/register'}
            >
              {t('investorCta.createAccount')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
