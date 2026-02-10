import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Wallet, Settings, ChevronDown, LayoutDashboard, Building2, TrendingUp, Users } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useRouter } from '../../utils/router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { navigate, currentRoute } = useRouter();
  const { state: authState, logout } = useAuth();
  const { theme } = useTheme();
  const { error: showError } = useNotifications();
  const { isAuthenticated, user } = authState;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Public navigation items (not logged in)
  const publicNavItems = [
    { name: 'About', route: 'about' as const },
    { name: 'Why Capimax RT', route: 'why-capimax' as const },
    { name: 'Properties', route: 'properties' as const },
    { name: 'Secondary Market', route: 'marketplace' as const },
    { name: 'Structure', route: 'structure' as const },
    { name: 'Document Center', route: 'document-center' as const },
    { name: 'Support', route: 'contact' as const }
  ];

  // Authenticated navigation items — role-aware
  const getAuthNavItems = () => {
    const items: Array<{ name: string; route: string; params?: Record<string, string> }> = [
      { name: 'Home', route: 'home' },
      { name: 'Properties', route: 'properties' },
    ];

    // Add "My Portfolio" for investors as a direct link
    if (user?.role === 'investor') {
      items.push({ name: 'My Portfolio', route: 'dashboard', params: { view: 'portfolio' } });
    }

    items.push(
      { name: 'Secondary Market', route: 'marketplace' },
      { name: 'Document Center', route: 'document-center' },
      { name: 'Dashboard', route: 'dashboard' }
    );
    return items;
  };

  const authNavItems = getAuthNavItems();

  const navItems = isAuthenticated ? authNavItems : publicNavItems;

  const handleNavClick = (route: string, params?: Record<string, string>) => {
    navigate(route as any, params);
    setIsOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('home');
    } catch (error: any) {
      showError('Logout Failed', error.message || 'Unable to log out. Please try again.');
    }
    setProfileDropdownOpen(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get role-specific dropdown items
  const getProfileDropdownItems = () => {
    const baseItems: Array<{ name: string; route: string; icon: any; params?: Record<string, string> }> = [
      { name: 'Dashboard', route: 'dashboard', icon: LayoutDashboard },
      { name: 'Wallet', route: 'wallet', icon: Wallet }
    ];

    // Add role-specific dashboard label with appropriate params
    if (user?.role === 'investor') {
      baseItems[0] = { name: 'My Portfolio', route: 'dashboard', icon: TrendingUp, params: { view: 'portfolio' } };
    } else if (user?.role === 'property_owner') {
      baseItems[0] = { name: 'My Properties', route: 'dashboard', icon: Building2 };
    } else if (user?.role === 'broker') {
      baseItems[0] = { name: 'My Referrals', route: 'dashboard', icon: Users };
    }

    return baseItems;
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
          {/* Logo - click to go home */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-3 cursor-pointer"
            aria-label="Go to home page"
          >
            <img
              src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
              alt="CapiMax"
              className="h-8 w-auto"
            />
          </motion.button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <motion.button
                key={item.name}
                onClick={() => handleNavClick(item.route, 'params' in item ? (item as any).params : undefined)}
                whileHover={{ y: -1 }}
                className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm ${
                  currentRoute === item.route && !('params' in item) ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                {item.name}
              </motion.button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {isAuthenticated ? (
              /* Authenticated User - Profile Dropdown */
              <div className="relative" ref={profileDropdownRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors duration-200"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-semibold">
                    {getUserInitials()}
                  </div>
                  <span className="text-sm font-medium text-navy-700 dark:text-navy-200 hidden lg:block">
                    {user?.firstName || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-navy-500 dark:text-navy-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-navy-200 dark:border-navy-700 overflow-hidden z-50"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-navy-200 dark:border-navy-700">
                        <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-navy-500 dark:text-navy-400 truncate">
                          {user?.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {getProfileDropdownItems().map((item) => (
                          <button
                            key={item.name}
                            onClick={() => handleNavClick(item.route, item.params)}
                            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors duration-150"
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-navy-200 dark:border-navy-700 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Public User - Sign In / Get Started */
              <>
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 md:hidden">
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
                {/* Navigation Items */}
                {navItems.map((item) => (
                  <motion.button
                    key={item.name}
                    onClick={() => handleNavClick(item.route, 'params' in item ? (item as any).params : undefined)}
                    whileTap={{ scale: 0.98 }}
                    className={`block w-full text-left px-4 py-2 text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200 text-sm font-medium ${
                      currentRoute === item.route && !('params' in item) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    {item.name}
                  </motion.button>
                ))}

                {/* Actions Section */}
                <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                  {isAuthenticated ? (
                    /* Authenticated Mobile Menu */
                    <>
                      {/* User Info */}
                      <div className="flex items-center space-x-3 py-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-semibold">
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-navy-500 dark:text-navy-400">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Profile Menu Items */}
                      {getProfileDropdownItems().map((item) => (
                        <button
                          key={item.name}
                          onClick={() => handleNavClick(item.route, item.params)}
                          className="flex items-center space-x-3 p-2 text-sm text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </button>
                      ))}

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 mt-2 border-t border-navy-200 dark:border-navy-700 pt-4"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    /* Public Mobile Menu */
                    <>
                      <button
                        onClick={() => handleNavClick('login')}
                        className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-left transition-colors duration-200 ${
                          currentRoute === 'login' ? 'text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => handleNavClick('register')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                      >
                        Get Started
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};