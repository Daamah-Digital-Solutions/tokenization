import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { displayUrl } from '../../data/partners';

export interface PartnerCardProps {
  name: string;
  logo?: string;
  role?: string;
  description: string;
  market?: string;
  website?: string;
}

/**
 * One partner of the register (src/data/partners.ts): its logo, what it does for the
 * platform, where it operates and a link to its own site.
 */
export const PartnerCard: React.FC<PartnerCardProps> = ({ name, logo, role, description, market, website }) => {
  const { t } = useTranslation('brokerui');

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative flex h-full flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
    >
      {/* The logos are drawn for a white ground: the tile stays white in the dark theme too */}
      <div className="flex h-32 items-center justify-center border-b border-slate-100 dark:border-slate-700 bg-white p-6">
        {logo ? (
          <img src={logo} alt={t('partnerCard.logoAlt', { name })} loading="lazy" className="max-h-20 max-w-[220px] object-contain" />
        ) : (
          <span className="text-xl font-semibold text-slate-700">{name}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 dir="ltr" style={{ textAlign: 'start' }}
            className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {name}
        </h3>
        {role && <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">{role}</p>}
        <p className="mt-3 flex-1 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>

        {(market || website) && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            {market && (
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
                {market}
              </span>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" dir="ltr"
                 className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <span className="sr-only">{t('partnerCard.visitWebsite')}: </span>
                {displayUrl(website)}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
};

export default PartnerCard;
