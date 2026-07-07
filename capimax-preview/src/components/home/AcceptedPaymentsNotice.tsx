/**
 * Homepage "we accept Nova Finance / Pronova" notice (client edit #17).
 *
 * DISPLAY ONLY — it advertises the Nova Sukuk and Pronova payment options that
 * already exist in the checkout flow (see PaymentMethodSelector). It does not
 * touch any payment logic; it just surfaces the partnerships on the homepage
 * with links so visitors know these options are supported.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Coins, ArrowUpRight } from 'lucide-react';

const NOVA_URL = 'https://novadf.com/';
const PRONOVA_URL = 'https://pronovacrypto.tech/';

export const AcceptedPaymentsNotice: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-white dark:bg-navy-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-900 dark:text-white">
            {t('acceptedPayments.title')}
          </h2>
          <p className="mt-3 text-navy-600 dark:text-navy-300 max-w-2xl mx-auto">
            {t('acceptedPayments.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nova Finance */}
          <motion.a
            href={NOVA_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -4 }}
            className="group relative block rounded-2xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                    {t('acceptedPayments.nova.title')}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-navy-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="mt-2 text-sm text-navy-600 dark:text-navy-300">
                  {t('acceptedPayments.nova.desc')}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {t('acceptedPayments.nova.cta')}
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </motion.a>

          {/* Pronova */}
          <motion.a
            href={PRONOVA_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -4 }}
            className="group relative block rounded-2xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <span className="absolute top-4 right-4 px-2.5 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {t('acceptedPayments.pronova.discount')}
            </span>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                    {t('acceptedPayments.pronova.title')}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-navy-400 group-hover:text-yellow-500 transition-colors" />
                </div>
                <p className="mt-2 text-sm text-navy-600 dark:text-navy-300">
                  {t('acceptedPayments.pronova.desc')}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  {t('acceptedPayments.pronova.cta')}
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default AcceptedPaymentsNotice;
