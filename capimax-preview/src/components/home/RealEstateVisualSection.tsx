import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Globe, Building2, Home, MapPin, TrendingUp, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

// Real estate images for visual sections
const REAL_ESTATE_IMAGES = {
  global: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80', // City skyline
  institutional: 'https://images.unsplash.com/photo-1464938050520-ef2571ea0620?w=1920&q=80', // Commercial buildings
};

interface VisualSectionProps {
  variant: 'global' | 'institutional';
}

export const RealEstateVisualSection: React.FC<VisualSectionProps> = ({ variant }) => {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Parallax effect for background
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const content = {
    global: {
      title: 'Invest in Global Real Estate',
      subtitle: 'Access Premium Properties Worldwide',
      description: 'Diversify your portfolio across international markets with institutional-grade real estate investments.',
      icon: Globe,
      image: REAL_ESTATE_IMAGES.global,
      stats: [
        { value: '25+', label: 'Countries', icon: MapPin },
        { value: '500+', label: 'Properties', icon: Building2 },
        { value: '15%', label: 'Avg. Returns', icon: TrendingUp },
      ],
      cta: { text: 'View Properties', href: '/properties' },
    },
    institutional: {
      title: 'Institutional-Grade Property Assets',
      subtitle: 'Premium Real Estate Investment',
      description: 'Access the same quality investments traditionally reserved for institutional investors.',
      icon: Building2,
      image: REAL_ESTATE_IMAGES.institutional,
      stats: [
        { value: '$1M+', label: 'Min. Asset Value', icon: Shield },
        { value: '100%', label: 'Vetted', icon: Shield },
        { value: 'SPV', label: 'Protected', icon: Home },
      ],
      cta: { text: 'Learn More', href: '/how-it-works' },
    },
  };

  const { title, subtitle, description, icon: Icon, image, stats, cta } = content[variant];

  return (
    <section ref={ref} className="relative py-32 overflow-hidden">
      {/* Parallax Background Image */}
      <motion.div className="absolute inset-0" style={{ y }}>
        <img
          src={image}
          alt={title}
          className="w-full h-[120%] object-cover -translate-y-[10%]"
        />
      </motion.div>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-900/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/60" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.02) 35px, rgba(255,255,255,0.02) 70px)`
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Main Content */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Icon Badge */}
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                <Icon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-white/90">{subtitle}</span>
              </div>

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                {title.split(' ').map((word, i) => (
                  <span key={i}>
                    {i === 2 ? (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{word} </span>
                    ) : (
                      `${word} `
                    )}
                  </span>
                ))}
              </h2>

              {/* Description */}
              <p className="text-xl text-gray-300 leading-relaxed">
                {description}
              </p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  className="group px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/30"
                  onClick={() => window.location.href = cta.href}
                >
                  {cta.text}
                  <TrendingUp className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>

              {/* Decorative line */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-32 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full origin-left"
              />
            </motion.div>
          </div>

          {/* Right - Stats Cards */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid gap-6"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="flex items-center gap-6 p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl"
                >
                  <div className="flex-shrink-0 p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-400/30">
                    <stat.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute bottom-10 right-10 hidden xl:block">
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-emerald-400/40" />
          </div>
        </motion.div>
      </div>

      <div className="absolute top-20 right-1/4 hidden xl:block">
        <motion.div
          animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-16 h-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center">
            <Home className="w-8 h-8 text-emerald-400/30" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
