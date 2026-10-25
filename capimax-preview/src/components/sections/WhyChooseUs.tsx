import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, Globe, Users, Home, TrendingUp, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const WhyChooseUs: React.FC = () => {
  const { t } = useTranslation('ui');
  const features = [
    { icon: Shield, title: t('whyChooseUs.f1.title'), description: t('whyChooseUs.f1.desc') },
    { icon: Building2, title: t('whyChooseUs.f2.title'), description: t('whyChooseUs.f2.desc') },
    { icon: TrendingUp, title: t('whyChooseUs.f3.title'), description: t('whyChooseUs.f3.desc') },
    { icon: Globe, title: t('whyChooseUs.f4.title'), description: t('whyChooseUs.f4.desc') },
    { icon: Users, title: t('whyChooseUs.f5.title'), description: t('whyChooseUs.f5.desc') },
    { icon: Home, title: t('whyChooseUs.f6.title'), description: t('whyChooseUs.f6.desc') }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="about" className="relative py-24 bg-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 bg-gradient-to-b overflow-hidden">
      {/* Subtle Real Estate Background Pattern */}
      <div className="absolute inset-0 bg-subtle-pattern opacity-50"></div>

      {/* Floating building icons for real estate feel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5 dark:opacity-10">
        <Building2 className="absolute top-20 start-10 w-32 h-32 text-slate-400 dark:text-slate-600" />
        <Home className="absolute bottom-20 end-20 w-24 h-24 text-slate-400 dark:text-slate-600" />
        <Building2 className="absolute top-1/2 end-10 w-20 h-20 text-slate-400 dark:text-slate-600" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold text-navy-900 dark:text-white mb-4 leading-tight"
          >
            {t('whyChooseUs.title')}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-navy-600 dark:text-navy-200 max-w-2xl mx-auto text-balance"
          >
            {t('whyChooseUs.subtitle')}
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="group"
              >
                {/* Clean Card */}
                <div className="bg-white dark:bg-navy-800/50 border border-navy-200 dark:border-navy-700 rounded-2xl p-6 h-full group-hover:border-emerald-300 dark:group-hover:border-emerald-600 transition-all duration-300 shadow-subtle">
                  
                  {/* Icon */}
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-navy-900 dark:text-white">
                      {feature.title}
                    </h3>
                    
                    <p className="text-navy-600 dark:text-navy-300 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
};