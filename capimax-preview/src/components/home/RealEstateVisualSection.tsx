import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Building2 } from 'lucide-react';

// Real estate images for visual sections
const REAL_ESTATE_IMAGES = {
  global: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80', // City skyline
  institutional: 'https://images.unsplash.com/photo-1464938050520-ef2571ea0620?w=1920&q=80', // Commercial buildings
};

interface VisualSectionProps {
  variant: 'global' | 'institutional';
}

export const RealEstateVisualSection: React.FC<VisualSectionProps> = ({ variant }) => {
  const content = {
    global: {
      title: 'Invest in Global Real Estate',
      subtitle: 'Access Premium Properties Worldwide',
      description: 'Diversify your portfolio across international markets with institutional-grade real estate investments.',
      icon: Globe,
      image: REAL_ESTATE_IMAGES.global,
    },
    institutional: {
      title: 'Institutional-Grade Property Assets',
      subtitle: 'Premium Real Estate Investment',
      description: 'Access the same quality investments traditionally reserved for institutional investors.',
      icon: Building2,
      image: REAL_ESTATE_IMAGES.institutional,
    },
  };

  const { title, subtitle, description, icon: Icon, image } = content[variant];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-900/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-slate-900/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Icon Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Icon className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-white/90">{subtitle}</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {title}
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
              {description}
            </p>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full origin-left"
            />
          </motion.div>
        </div>
      </div>

      {/* Floating property icons */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block">
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="w-32 h-32 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-emerald-400/50" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
