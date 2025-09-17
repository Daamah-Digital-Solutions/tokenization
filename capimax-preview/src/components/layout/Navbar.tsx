import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AccessibilityMenu, ConnectionQualityIndicator } from '../ui/AccessibilityHelper';
import { useRouter } from '../../utils/router';
import { useNetwork } from '../ui/OfflineIndicator';
import { useTheme } from '../../contexts/ThemeContext';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { navigate, currentRoute } = useRouter();
  const { isOnline } = useNetwork();
  const { theme } = useTheme();

  const navItems = [
    { name: 'Properties', route: 'properties' as const, href: '#properties' },
    { name: 'How It Works', route: null, href: '#how-it-works' },
    { name: 'About', route: 'about' as const, href: '#about' },
    { name: 'Contact', route: 'contact' as const, href: '#contact' }
  ];

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.route) {
      e.preventDefault();
      navigate(item.route);
      setIsOpen(false);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md border-b border-navy-200 dark:border-navy-700"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center space-x-3"
          >
            <img
              src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
              alt="CapiMax"
              className="h-8 w-auto"
            />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              item.route ? (
                <motion.button
                  key={item.name}
                  onClick={(e) => handleNavClick(item, e)}
                  whileHover={{ y: -1 }}
                  className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm ${
                    currentRoute === item.route ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {item.name}
                </motion.button>
              ) : (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(item, e)}
                  whileHover={{ y: -1 }}
                  className="text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm"
                >
                  {item.name}
                </motion.a>
              )
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Connection Indicator */}
            <ConnectionQualityIndicator size="sm" />
            
            {/* Accessibility Menu */}
            <AccessibilityMenu />
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Navigation Buttons */}
            <button 
              onClick={() => navigate('demo')}
              className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors duration-200 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 ${
                currentRoute === 'demo' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-600' : ''
              }`}
            >
              Live Demo
            </button>
            <button 
              onClick={() => navigate('dashboard')}
              className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors duration-200 ${
                currentRoute === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => navigate('wallet')}
              className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors duration-200 ${
                currentRoute === 'wallet' ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              Wallet
            </button>
            <button 
              onClick={() => navigate('login')}
              className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors duration-200 ${
                currentRoute === 'login' ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`}
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('register')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
              disabled={!isOnline}
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 md:hidden">
            <ConnectionQualityIndicator size="sm" />
            <AccessibilityMenu />
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors duration-200"
              aria-expanded={isOpen}
              aria-label="Toggle mobile menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-navy-200 dark:border-navy-700"
            >
              <div className="py-4 space-y-1">
                {navItems.map((item) => (
                  item.route ? (
                    <motion.button
                      key={item.name}
                      onClick={(e) => handleNavClick(item, e)}
                      whileTap={{ scale: 0.98 }}
                      className={`block w-full text-left px-4 py-2 text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200 text-sm font-medium ${
                        currentRoute === item.route ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      {item.name}
                    </motion.button>
                  ) : (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(item, e)}
                      whileTap={{ scale: 0.98 }}
                      className="block px-4 py-2 text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200 text-sm font-medium"
                    >
                      {item.name}
                    </motion.a>
                  )
                ))}
                <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                  <button 
                    onClick={() => {
                      navigate('demo');
                      setIsOpen(false);
                    }}
                    className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 border border-emerald-200 dark:border-emerald-800 rounded-lg ${
                      currentRoute === 'demo' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-600' : ''
                    }`}
                  >
                    Live Demo
                  </button>
                  <button 
                    onClick={() => {
                      navigate('dashboard');
                      setIsOpen(false);
                    }}
                    className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 ${
                      currentRoute === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => {
                      navigate('wallet');
                      setIsOpen(false);
                    }}
                    className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 ${
                      currentRoute === 'wallet' ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    Wallet
                  </button>
                  <button 
                    onClick={() => {
                      navigate('kyc');
                      setIsOpen(false);
                    }}
                    className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 ${
                      currentRoute === 'kyc' ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    KYC Verification
                  </button>
                  <button 
                    onClick={() => {
                      navigate('login');
                      setIsOpen(false);
                    }}
                    className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 ${
                      currentRoute === 'login' ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      navigate('register');
                      setIsOpen(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
                    disabled={!isOnline}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};