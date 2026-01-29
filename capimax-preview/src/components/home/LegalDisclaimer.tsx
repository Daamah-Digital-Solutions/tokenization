import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

export const LegalDisclaimer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

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
                  About Capimax RT
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    Important
                  </span>
                </h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  Capimax RT - Capimax Real Estate Tokenization is a global technology platform
                  designed to provide a digital infrastructure for structuring, presenting, and
                  administering fractional, tokenized real estate investment opportunities through
                  independent legal entities such as Special Purpose Vehicles (SPVs).
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
                    Platform Role
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    The platform operates strictly as a technology and operational infrastructure
                    provider. It is not a bank, financial institution, brokerage firm, asset manager,
                    investment adviser, fiduciary, or financial intermediary, and it does not provide
                    investment, financial, legal, or tax advice of any kind.
                  </p>
                </div>
              </div>

              {/* Information Disclaimer */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                  All opportunities, information, documentation, reports, projections, and
                  distributions displayed on the platform:
                </h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>
                      Are provided by relevant third parties, including property owners, developers,
                      SPVs, asset managers, valuation firms, and insurance providers;
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>
                      Are presented for informational and organizational purposes only, without any
                      representation, warranty, or assurance by Capimax RT as to their accuracy,
                      completeness, or future performance.
                    </span>
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
                    Capimax RT does not guarantee:
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      Any returns, income, or profits;
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      Any level of liquidity or exit availability;
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      The preservation of invested capital.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Risk Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Investment Risk Warning
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                  Investing through the platform involves material risks, including the potential
                  loss of some or all invested capital. Users are solely responsible for:
                </p>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    Conducting their own independent due diligence;
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    Assessing investment suitability and risks;
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    Seeking advice from appropriately licensed professional advisers before making
                    any investment decision.
                  </li>
                </ul>
              </div>

              {/* Agreement */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  By accessing or using this platform, you acknowledge and agree to be bound by
                  the platform's{' '}
                  <a href="/legal/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Terms & Conditions
                  </a>
                  ,{' '}
                  <a href="/legal/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Privacy Policy
                  </a>
                  ,{' '}
                  <a href="/legal/risk-disclosure" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Risk Disclosures
                  </a>
                  , and all applicable regulatory and compliance frameworks adopted by Capimax RT.
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
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Read Full Disclaimer
              </>
            )}
          </button>
        </motion.div>
      </div>
    </section>
  );
};
