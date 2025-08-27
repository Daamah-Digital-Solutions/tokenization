import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Twitter, Linkedin, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  const footerLinks = {
    platform: [
      { name: 'Properties', href: '#properties' },
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'About', href: '#about' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Compliance', href: '#compliance' }
    ]
  };

  const socialLinks = [
    { icon: Twitter, href: '#', name: 'Twitter' },
    { icon: Linkedin, href: '#', name: 'LinkedIn' },
    { icon: Github, href: '#', name: 'GitHub' }
  ];

  return (
    <footer className="bg-navy-50 dark:bg-navy-900 border-t border-navy-200 dark:border-navy-800">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-navy-900 dark:text-white">Capimax</span>
            </div>
            
            <p className="text-navy-600 dark:text-navy-300 leading-relaxed text-sm">
              Professional real estate tokenization platform for secure, transparent investment opportunities.
            </p>
          </motion.div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (index + 1) * 0.1 }}
            >
              <h3 className="text-sm font-semibold mb-4 text-navy-900 dark:text-white uppercase tracking-wide">
                {category === 'platform' ? 'Platform' : 'Legal'}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="py-8 border-t border-navy-200 dark:border-navy-800 flex flex-col md:flex-row justify-between items-center"
        >
          <div className="text-navy-500 dark:text-navy-400 text-sm mb-4 md:mb-0">
            © 2024 Capimax. All rights reserved.
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-8 h-8 bg-navy-200 dark:bg-navy-800 hover:bg-emerald-100 dark:hover:bg-navy-700 rounded-lg flex items-center justify-center text-navy-600 dark:text-navy-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                  aria-label={social.name}
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};