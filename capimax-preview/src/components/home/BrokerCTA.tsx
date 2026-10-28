import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, Link2, LayoutDashboard, Wallet, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../../utils/router';

/** Home-page entry for brokers (client round 4, #12): apply, or read how the program works. */
export const BrokerCTA: React.FC = () => {
  const { t } = useTranslation('ui');
  const { navigate } = useRouter();
  const steps = [
    { icon: Handshake, title: t('brokerCta.s1.title'), text: t('brokerCta.s1.text') },
    { icon: Link2, title: t('brokerCta.s2.title'), text: t('brokerCta.s2.text') },
    { icon: LayoutDashboard, title: t('brokerCta.s3.title'), text: t('brokerCta.s3.text') },
    { icon: Wallet, title: t('brokerCta.s4.title'), text: t('brokerCta.s4.text') },
  ];

  return (
    <section id="brokers" className="py-20 bg-slate-50 dark:bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/10 rounded-full mb-6">
              <Handshake className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('brokerCta.badge')}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              {t('brokerCta.title')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              {t('brokerCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="primary" size="lg" onClick={() => navigate('broker-application')}>
                {t('brokerCta.apply')}
                <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('broker-program')}>
                <BookOpen className="me-2 w-4 h-4" />
                {t('brokerCta.learnMore')}
              </Button>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="p-6 rounded-2xl bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <step.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrokerCTA;
