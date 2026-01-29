import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Building2, Landmark, Shield, Home } from 'lucide-react';

export type PartnerCategory = 'developer' | 'financial' | 'insurance' | 'management';

export interface PartnerCardProps {
  name: string;
  logo?: string;
  category: PartnerCategory;
  description: string;
  role: string;
  website?: string;
}

const categoryConfig: Record<PartnerCategory, { icon: typeof Building2; color: string; bgColor: string; label: string }> = {
  developer: {
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Developer'
  },
  financial: {
    icon: Landmark,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Financial'
  },
  insurance: {
    icon: Shield,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    label: 'Insurance'
  },
  management: {
    icon: Home,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'Management'
  }
};

export const PartnerCard: React.FC<PartnerCardProps> = ({
  name,
  logo,
  category,
  description,
  role,
  website
}) => {
  const config = categoryConfig[category];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
    >
      {/* Category Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
          <IconComponent className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="p-6">
        {/* Logo / Icon Area */}
        <div className="mb-6">
          {logo ? (
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
              <img src={logo} alt={`${name} logo`} className="w-full h-full object-contain p-2" />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-xl ${config.bgColor} flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${config.color}`} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {name}
          </h3>

          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {role}
          </p>

          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Website Link */}
        {website && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Visit Website
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
};

export default PartnerCard;
