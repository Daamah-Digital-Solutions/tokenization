import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, Globe, Users, Home, TrendingUp, Building } from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: "Secure & Regulated",
      description: "Bank-grade security with full regulatory compliance and investor protection."
    },
    {
      icon: Building2,
      title: "Premium Properties",
      description: "Carefully vetted institutional-grade real estate opportunities."
    },
    {
      icon: TrendingUp,
      title: "Proven Returns",
      description: "Consistent performance with transparent reporting and analytics."
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Invest in premium properties across major markets worldwide."
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Backed by experienced real estate and blockchain professionals."
    },
    {
      icon: Home,
      title: "Low Minimums",
      description: "Start investing with lower capital requirements than traditional real estate."
    }
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
        <Building2 className="absolute top-20 left-10 w-32 h-32 text-slate-400 dark:text-slate-600" />
        <Home className="absolute bottom-20 right-20 w-24 h-24 text-slate-400 dark:text-slate-600" />
        <Building2 className="absolute top-1/2 right-10 w-20 h-20 text-slate-400 dark:text-slate-600" />
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
            Why Choose Our Platform
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-navy-600 dark:text-navy-200 max-w-2xl mx-auto text-balance"
          >
            Built for investors who demand security, transparency, and professional expertise
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