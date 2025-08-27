import React from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, Shield, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

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
    title: 'Premium Properties',
    description: 'Access vetted real estate opportunities with institutional-grade due diligence'
  },
  {
    icon: TrendingUp,
    title: 'Proven Returns',
    description: 'Historical returns of 12-18% annually with transparent performance tracking'
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Bank-level security with full regulatory compliance and insurance protection'
  },
  {
    icon: Users,
    title: 'Expert Support',
    description: 'Dedicated support team with deep real estate and blockchain expertise'
  }
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title = 'Real Estate Tokenization Platform',
  subtitle = 'Democratizing premium real estate investment through blockchain technology',
  showFeatures = true,
  backgroundVariant = 'gradient',
  className
}) => {
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
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">CapiMax</h1>
                <p className="text-emerald-200 text-sm">Real Estate Tokenization</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-bold leading-tight mb-4">
                  {title}
                </h2>
                <p className="text-xl text-emerald-100 leading-relaxed">
                  {subtitle}
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
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-emerald-100 text-sm leading-relaxed">
                            {feature.description}
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
                  <div className="text-emerald-200 text-sm">Assets Tokenized</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">15,000+</div>
                  <div className="text-emerald-200 text-sm">Active Investors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">14.2%</div>
                  <div className="text-emerald-200 text-sm">Avg. Annual Return</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-0 w-24 h-24 bg-emerald-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">CapiMax</h1>
              <p className="text-emerald-600 dark:text-emerald-400 text-sm">Real Estate Tokenization</p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};