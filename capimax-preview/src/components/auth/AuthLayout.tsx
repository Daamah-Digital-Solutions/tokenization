import React from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showFeatures?: boolean;
  backgroundVariant?: 'default' | 'gradient' | 'pattern';
  className?: string;
}

const FEATURES = [
  {
    icon: Building2,
    title: 'authLayout.features.premium.title',
    description: 'authLayout.features.premium.desc'
  },
  {
    icon: TrendingUp,
    title: 'authLayout.features.returns.title',
    description: 'authLayout.features.returns.desc'
  },
  {
    icon: Shield,
    title: 'authLayout.features.secure.title',
    description: 'authLayout.features.secure.desc'
  },
  {
    icon: Users,
    title: 'authLayout.features.support.title',
    description: 'authLayout.features.support.desc'
  }
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showFeatures = true,
  backgroundVariant = 'gradient',
  className
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation('ui');
  const displayTitle = title ?? t('authLayout.title');
  const displaySubtitle = subtitle ?? t('authLayout.subtitle');
  const backgroundClasses = {
    default: 'bg-slate-50 dark:bg-slate-950',
    gradient: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950',
    pattern: 'bg-slate-50 dark:bg-slate-950'
  };

  return (
    <div className={cn(
      'min-h-screen flex',
      backgroundClasses[backgroundVariant],
      className
    )}>
      {/* Left Side - Features & Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800">
          {/* Animated background pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz4KPC9zdmc+')] opacity-20"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <img
                src={CapiMaxLightLogo}
                alt={t('brand')}
                className="h-12 w-auto"
              />
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-bold leading-tight mb-4">
                  {displayTitle}
                </h2>
                <p className="text-xl text-emerald-100 leading-relaxed">
                  {displaySubtitle}
                </p>
              </div>

              {/* Features */}
              {showFeatures && (
                <div className="space-y-6 pt-8">
                  {FEATURES.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                        className="flex items-start gap-4"
                      >
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{t(feature.title)}</h3>
                          <p className="text-emerald-100 text-sm leading-relaxed">
                            {t(feature.description)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Statistics */}
              <div className="flex items-center gap-8 pt-8 border-t border-white/10">
                <div>
                  <div className="text-2xl font-bold">$2.5B+</div>
                  <div className="text-emerald-200 text-sm">{t('authLayout.stats.assets')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">15,000+</div>
                  <div className="text-emerald-200 text-sm">{t('authLayout.stats.owners')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">14.2%</div>
                  <div className="text-emerald-200 text-sm">{t('authLayout.stats.return')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 end-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 start-0 w-24 h-24 bg-emerald-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center mb-8 justify-center">
            <img
              src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
              alt={t('brand')}
              className="h-10 w-auto"
            />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};