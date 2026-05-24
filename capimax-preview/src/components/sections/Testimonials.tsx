import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "Michael Chen",
      title: "Portfolio Manager",
      company: "Blackstone Group",
      rating: 5,
      quote: "The platform's institutional-grade infrastructure and transparent process gave us confidence to deploy significant capital. Returns exceeded expectations."
    },
    {
      id: 2,
      name: "Sarah Williams",
      title: "Investment Director",
      company: "Family Office",
      rating: 5,
      quote: "Sophisticated approach to real estate tokenization with thorough due diligence and regulatory compliance that gives us peace of mind."
    },
    {
      id: 3,
      name: "David Rodriguez",
      title: "Fund Manager",
      company: "Sovereign Wealth",
      rating: 5,
      quote: "Delivers the highest standards of security and compliance while providing access to premium opportunities through traditional channels."
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

  const cardVariants = {
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
    <section className="relative py-24 bg-slate-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 bg-gradient-to-b overflow-hidden">
      {/* Clean Background */}
      <div className="absolute inset-0 bg-subtle-pattern opacity-50"></div>

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
            Trusted by Professionals
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-navy-600 dark:text-navy-200 max-w-2xl mx-auto text-balance"
          >
            See what real estate professionals say about our platform
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="group"
            >
              {/* Clean Testimonial Card */}
              <div className="bg-white dark:bg-navy-800/50 border border-navy-200 dark:border-navy-700 rounded-2xl p-6 h-full group-hover:border-emerald-300 dark:group-hover:border-emerald-600 transition-all duration-300 shadow-subtle">
                
                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < testimonial.rating ? 'text-emerald-500 fill-current' : 'text-navy-300 dark:text-navy-600'}`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-navy-700 dark:text-navy-200 leading-relaxed mb-6 text-sm">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author Info */}
                <div>
                  <div className="font-semibold text-navy-900 dark:text-white text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-navy-600 dark:text-navy-300 text-sm">
                    {testimonial.title}
                  </div>
                  <div className="text-navy-500 dark:text-navy-400 text-xs">
                    {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};