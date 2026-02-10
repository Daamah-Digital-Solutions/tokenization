import React from 'react';
import { motion } from 'framer-motion';
import { Twitter, Linkedin, Github } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

export const Footer: React.FC = () => {
  const { theme } = useTheme();

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Allow anchor links and external links to work normally
    if (href.startsWith('#') || href.startsWith('http')) {
      return;
    }
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const footerLinks = {
    platform: [
      { name: 'Properties', href: '/properties' },
      { name: 'Secondary Market', href: '/marketplace' },
      { name: 'Liquidity Provider', href: '/liquidity-provider' },
      { name: 'How It Works', href: '/how-it-works' },
      { name: 'Our Partners', href: '/partners' },
      { name: 'Broker Program', href: '/broker-program' },
      { name: 'About', href: '/about' }
    ],
    learn: [
      { name: 'What is Tokenization', href: '/tokenization' },
      { name: 'What is SPV', href: '/spv' },
      { name: 'Investor Guide', href: '/investor-guide' },
      { name: 'Data Room', href: '/data-room' },
      { name: 'Risks & Disclosures', href: '/risks' },
      { name: 'FAQ', href: '/faq' },
      { name: 'For Property Owners', href: '/property-owner' }
    ],
    guides: [
      { name: 'Capimax RT Guide', href: '/capimax-rt-guide' },
      { name: 'Investment Guide', href: '/investment-guide' },
      { name: 'Investment Strategies', href: '/investment-strategies' },
      { name: 'Investor Guide', href: '/investor-guide' },
      { name: 'Owner\'s Guide', href: '/owners-guide' },
      { name: 'Developer Guide', href: '/developer-guide' },
      { name: 'Broker Guide', href: '/broker-guide' },
      { name: 'LP Guide', href: '/lp-guide' },
      { name: 'Technology', href: '/technology' },
      { name: 'Document Center', href: '/document-center' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Terms & Conditions', href: '/legal/terms' },
      { name: 'Risk Disclosure', href: '/legal/risk-disclosure' },
      { name: 'Compliance', href: '/legal/compliance' },
      { name: 'Cookies Policy', href: '/legal/cookies' },
      { name: 'AML/KYC Policy', href: '/legal/aml-kyc' },
      { name: 'Security Policy', href: '/legal/security' }
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
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
                alt="CapiMax"
                className="h-8 w-auto"
              />
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
                {category === 'platform' ? 'Platform' : category === 'learn' ? 'Learn' : category === 'guides' ? 'Guides' : 'Legal'}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={(e) => handleNavigation(e, link.href)}
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
            © 2026 Capimax. All rights reserved.
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