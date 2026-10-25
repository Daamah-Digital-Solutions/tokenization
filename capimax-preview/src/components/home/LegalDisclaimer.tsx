import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

export const LegalDisclaimer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation('ui');

  return (
    <section className="relative py-12 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
        >
          {/* Header - Always Visible */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {t('legalDisclaimer.title')}
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    {t('legalDisclaimer.important')}
                  </span>
                </h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('legalDisclaimer.intro')}
                </p>
              </div>
            </div>
          </div>

          {/* Expandable Content */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Platform Role */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {t('legalDisclaimer.roleTitle')}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t('legalDisclaimer.roleBody')}
                  </p>
                </div>
              </div>

              {/* Information Disclaimer */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {t('legalDisclaimer.infoTitle')}
                </h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{t('legalDisclaimer.info1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{t('legalDisclaimer.info2')}</span>
                  </li>
                </ul>
              </div>

              {/* No Guarantees */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    {t('legalDisclaimer.noGuaranteeTitle')}
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      {t('legalDisclaimer.noGuarantee1')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      {t('legalDisclaimer.noGuarantee2')}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      {t('legalDisclaimer.noGuarantee3')}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Risk Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  {t('legalDisclaimer.riskTitle')}
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                  {t('legalDisclaimer.riskBody')}
                </p>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    {t('legalDisclaimer.risk1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    {t('legalDisclaimer.risk2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    {t('legalDisclaimer.risk3')}
                  </li>
                </ul>
              </div>

              {/* Agreement */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('legalDisclaimer.agreePrefix')}{' '}
                  <a href="/legal/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    {t('legalDisclaimer.terms')}
                  </a>
                  {t('legalDisclaimer.comma')}{' '}
                  <a href="/legal/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    {t('legalDisclaimer.privacy')}
                  </a>
                  {t('legalDisclaimer.comma')}{' '}
                  <a href="/legal/risk-disclosure" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    {t('legalDisclaimer.risk')}
                  </a>
                  {t('legalDisclaimer.agreeSuffix')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'w-full px-6 py-4 flex items-center justify-center gap-2',
              'text-sm font-medium transition-colors duration-200',
              'border-t border-slate-200 dark:border-slate-700',
              'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400',
              'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('legalDisclaimer.showLess')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('legalDisclaimer.readFull')}
              </>
            )}
          </button>
        </motion.div>
      </div>
    </section>
  );
};
