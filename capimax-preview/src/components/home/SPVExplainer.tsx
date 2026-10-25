import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Building2,
  ArrowRight,
  Lock,
  FileText,
  Repeat,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';

export const SPVExplainer: React.FC = () => {
  const { t } = useTranslation('ui');
  const spvBenefits = [
    { icon: Shield, title: t('spvExplainer.b1.title'), description: t('spvExplainer.b1.desc') },
    { icon: Layers, title: t('spvExplainer.b2.title'), description: t('spvExplainer.b2.desc') },
    { icon: Lock, title: t('spvExplainer.b3.title'), description: t('spvExplainer.b3.desc') },
    { icon: FileText, title: t('spvExplainer.b4.title'), description: t('spvExplainer.b4.desc') },
    { icon: Repeat, title: t('spvExplainer.b5.title'), description: t('spvExplainer.b5.desc') },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800 mb-6">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {t('spvExplainer.badge')}
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              {t('spvExplainer.titlePrefix')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
                {t('spvExplainer.titleHighlight')}
              </span>
              {t('spvExplainer.titleSuffix')}
            </h2>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              {t('spvExplainer.intro')}
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 mb-8">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {t('spvExplainer.ownTitle')}
              </h3>
              <p className="text-blue-800 dark:text-blue-400 text-sm leading-relaxed">
                {t('spvExplainer.ownBody')}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="group"
              onClick={() => window.location.href = '/spv'}
            >
              {t('spvExplainer.learnMore')}
              <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Right - Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-emerald-500" />
                {t('spvExplainer.whyTitle')}
              </h3>

              <div className="space-y-4">
                {spvBenefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0 p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg shadow-emerald-500/20">
                      <benefit.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {benefit.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
