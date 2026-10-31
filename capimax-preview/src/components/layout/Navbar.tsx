import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Settings, ChevronDown, LayoutDashboard, Building2, TrendingUp, Users, ShieldCheck, Briefcase, Landmark, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';
import { useRouter } from '../../utils/router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { clearReturn } from '../../utils/returnTo';
import CapiMaxLightLogo from '../../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../../assets/tokenization_capi max tokenization uk dark   copy.svg';

export const Navbar: React.FC = () => {
  const { t: tKyc } = useTranslation('kyc');
  const { t } = useTranslation('ui');
  const { t: tPartners } = useTranslation('partners');
  const [isOpen, setIsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const partnersRef = useRef<HTMLDivElement>(null);
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
      if (partnersRef.current && !partnersRef.current.contains(event.target as Node)) {
        setPartnersOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Public navigation items (not logged in)
  const publicNavItems = [
    { name: t('navbar.about'), route: 'about' as const },
    { name: t('navbar.whyCapimax'), route: 'why-capimax' as const },
    { name: t('navbar.properties'), route: 'properties' as const },
    { name: t('navbar.secondaryMarket'), route: 'marketplace' as const },
    { name: t('navbar.structure'), route: 'structure' as const },
    { name: t('navbar.documentCenter'), route: 'document-center' as const },
    { name: t('navbar.support'), route: 'support' as const }
  ];

  // Authenticated navigation items — role-aware.
  //
  // Property owners get a primary "Submit Property" entry in the top bar so
  // the tokenization flow is reachable from any page (the Overview Quick
  // Action is the second entry point; this is the always-visible one).
  // Multi-role users see it as soon as one of their assigned roles is owner.
  const getAuthNavItems = () => {
    const items: Array<{ name: string; route: string; params?: Record<string, string> }> = [
      { name: t('navbar.home'), route: 'home' },
      { name: t('navbar.properties'), route: 'properties' },
    ];

    // Add "My Portfolio" for investors as a direct link
    if (user?.role === 'investor') {
      items.push({ name: t('navbar.myPortfolio'), route: 'dashboard', params: { view: 'portfolio' } });
    }

    // Add "Submit Property" for property owners (and admins, for testing).
    const ownerLike =
      user?.role === 'property_owner' ||
      user?.role === 'admin' ||
      (user as any)?.available_roles?.includes?.('property_owner');
    if (ownerLike) {
      items.push({ name: t('navbar.submitProperty'), route: 'submit-property' });
    }

    items.push(
      { name: t('navbar.secondaryMarket'), route: 'marketplace' },
      { name: t('navbar.documentCenter'), route: 'document-center' },
      { name: t('navbar.dashboard'), route: 'dashboard' }
    );
    return items;
  };

  const authNavItems = getAuthNavItems();

  const navItems = isAuthenticated ? authNavItems : publicNavItems;

  const handleNavClick = (route: string, params?: Record<string, string>) => {
    navigate(route as any, params);
    setIsOpen(false);
    setProfileDropdownOpen(false);
    setPartnersOpen(false);
    setMoreOpen(false);
  };

  // On a laptop the whole list does not fit in every language (French is the
  // longest): these links move into a "More" menu until the screen is wide enough.
  const SECONDARY_ROUTES = new Set(['why-capimax', 'structure', 'document-center', 'support']);
  const moreItems = navItems.filter((item) => SECONDARY_ROUTES.has(item.route));

  // "Partners" menu (client round 4 follow-up): the broker and liquidity-provider
  // applications are one click away from every page, and a signed-in user can
  // follow their applications from the dashboard.
  const partnerItems: Array<{ name: string; desc?: string; route: string; icon: any; params?: Record<string, string> }> = [
    { name: tPartners('join.broker'), desc: tPartners('join.brokerDesc'), route: 'broker-application', icon: Briefcase },
    { name: tPartners('join.lp'), desc: tPartners('join.lpDesc'), route: 'liquidity-provider', icon: Landmark, params: { apply: '1' } },
    ...(isAuthenticated && user?.role !== 'admin'
      ? [{ name: tPartners('join.myApplications'), route: 'dashboard', icon: ClipboardList, params: { view: 'become-partner' } }]
      : []),
  ];

  // A plain "Sign in" must not send the user back to an application they left earlier
  const startAuth = (route: 'login' | 'register') => {
    clearReturn();
    handleNavClick(route);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('home');
    } catch (error: any) {
      showError(t('navbar.logoutFailedTitle'), error.message || t('navbar.logoutFailedMsg'));
    }
    setProfileDropdownOpen(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get role-specific dropdown items
  const getProfileDropdownItems = () => {
    // Wallet intentionally NOT here — it's surfaced via the mobile bottom
    // nav and the dashboard's Wallet card, and the duplicate dropdown entry
    // led to confused users + a broken-feeling navigation path.
    const baseItems: Array<{ name: string; route: string; icon: any; params?: Record<string, string> }> = [
      { name: t('navbar.dashboard'), route: 'dashboard', icon: LayoutDashboard },
    ];

    // Add role-specific dashboard label with appropriate params
    if (user?.role === 'investor') {
      baseItems[0] = { name: t('navbar.myPortfolio'), route: 'dashboard', icon: TrendingUp, params: { view: 'portfolio' } };
    } else if (user?.role === 'property_owner') {
      baseItems[0] = { name: t('navbar.myProperties'), route: 'dashboard', icon: Building2 };
    } else if (user?.role === 'broker') {
      baseItems[0] = { name: t('navbar.myReferrals'), route: 'dashboard', icon: Users };
    }

    // Identity verification is always one click away (client round 3, #3).
    if (user?.role !== 'admin') {
      baseItems.push({ name: tKyc('nav.identityVerification'), route: 'kyc', icon: ShieldCheck });
    }

    return baseItems;
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 inset-x-0 z-50 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md border-b border-navy-200 dark:border-navy-700"
    >
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-6">
        <div className="flex justify-between items-center gap-x-6 h-16">
          {/* Logo - click to go home */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer shrink-0"
            aria-label={t('navbar.goHome')}
          >
            <img
              src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
              alt={t('brand')}
              className="h-8 w-auto"
            />
          </motion.button>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-x-5 whitespace-nowrap">
            {navItems.map((item) => (
              <motion.button
                key={item.name}
                onClick={() => handleNavClick(item.route, 'params' in item ? (item as any).params : undefined)}
                whileHover={{ y: -1 }}
                className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm ${
                  currentRoute === item.route && !('params' in item) ? 'text-emerald-600 dark:text-emerald-400' : ''
                } ${SECONDARY_ROUTES.has(item.route) ? 'hidden 2xl:block' : ''}`}
              >
                {item.name}
              </motion.button>
            ))}

            {moreItems.length > 0 && (
              <div className="relative 2xl:hidden" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen(!moreOpen)}
                  aria-expanded={moreOpen}
                  className={`flex items-center gap-1 text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm ${
                    moreItems.some((item) => item.route === currentRoute) ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {t('navbar.more')}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute start-0 mt-3 w-56 whitespace-normal bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-navy-200 dark:border-navy-700 overflow-hidden z-50 py-2"
                    >
                      {moreItems.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleNavClick(item.route, 'params' in item ? (item as any).params : undefined)}
                          className="w-full px-4 py-2 text-start text-sm font-medium text-navy-700 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors duration-150"
                        >
                          {item.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative" ref={partnersRef}>
              <button
                type="button"
                onClick={() => setPartnersOpen(!partnersOpen)}
                aria-expanded={partnersOpen}
                className={`flex items-center gap-1 text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors duration-200 text-sm ${
                  ['broker-application', 'broker-program', 'liquidity-provider'].includes(currentRoute) ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                {tPartners('join.menu')}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${partnersOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {partnersOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute start-0 mt-3 w-72 whitespace-normal bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-navy-200 dark:border-navy-700 overflow-hidden z-50 py-2"
                  >
                    {partnerItems.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleNavClick(item.route, item.params)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 text-start hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors duration-150"
                      >
                        <item.icon className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          <span className="block text-sm font-medium text-navy-800 dark:text-navy-100">{item.name}</span>
                          {item.desc && <span className="block text-xs text-navy-500 dark:text-navy-400">{item.desc}</span>}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden xl:flex items-center gap-4 shrink-0">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <ThemeToggle />

            {isAuthenticated ? (
              /* Authenticated User - Profile Dropdown */
              <div className="relative" ref={profileDropdownRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors duration-200"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-semibold">
                    {getUserInitials()}
                  </div>
                  <span className="text-sm font-medium text-navy-700 dark:text-navy-200 hidden lg:block">
                    {user?.first_name || t('navbar.user')}
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
                      className="absolute end-0 mt-2 w-56 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-navy-200 dark:border-navy-700 overflow-hidden z-50"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-navy-200 dark:border-navy-700">
                        <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                          {user?.first_name} {user?.last_name}
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
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-navy-600 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 transition-colors duration-150"
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
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                        >
                          <LogOut className="w-4 h-4 rtl:rotate-180" />
                          <span>{t('navbar.logout')}</span>
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
                  onClick={() => startAuth('login')}
                  className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm transition-colors duration-200 ${
                    currentRoute === 'login' ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {t('navbar.signIn')}
                </button>
                <button
                  onClick={() => startAuth('register')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                >
                  {t('navbar.getStarted')}
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 xl:hidden">
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors duration-200"
              aria-expanded={isOpen}
              aria-label={t('navbar.toggleMenu')}
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
              className="xl:hidden border-t border-navy-200 dark:border-navy-700"
            >
              <div className="py-4 space-y-1">
                {/* Navigation Items */}
                {navItems.map((item) => (
                  <motion.button
                    key={item.name}
                    onClick={() => handleNavClick(item.route, 'params' in item ? (item as any).params : undefined)}
                    whileTap={{ scale: 0.98 }}
                    className={`block w-full text-start px-4 py-2 text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200 text-sm font-medium ${
                      currentRoute === item.route && !('params' in item) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    {item.name}
                  </motion.button>
                ))}

                {/* Partners */}
                <div className="pt-3 mt-2 border-t border-navy-200 dark:border-navy-700">
                  <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                    {tPartners('join.menu')}
                  </p>
                  {partnerItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleNavClick(item.route, item.params)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200 text-start"
                    >
                      <item.icon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                {/* Actions Section */}
                <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-navy-200 dark:border-navy-700">
                  {/* Language Switcher */}
                  <LanguageSwitcher variant="toggle" className="w-full justify-center" />

                  {isAuthenticated ? (
                    /* Authenticated Mobile Menu */
                    <>
                      {/* User Info */}
                      <div className="flex items-center gap-3 py-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-semibold">
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                            {user?.first_name} {user?.last_name}
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
                          className="flex items-center gap-3 p-2 text-sm text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 rounded-lg transition-colors duration-200"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </button>
                      ))}

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 p-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 mt-2 border-t border-navy-200 dark:border-navy-700 pt-4"
                      >
                        <LogOut className="w-4 h-4 rtl:rotate-180" />
                        <span>{t('navbar.logout')}</span>
                      </button>
                    </>
                  ) : (
                    /* Public Mobile Menu */
                    <>
                      <button
                        onClick={() => startAuth('login')}
                        className={`text-navy-600 dark:text-navy-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-sm p-2 text-start transition-colors duration-200 ${
                          currentRoute === 'login' ? 'text-emerald-600 dark:text-emerald-400' : ''
                        }`}
                      >
                        {t('navbar.signIn')}
                      </button>
                      <button
                        onClick={() => startAuth('register')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                      >
                        {t('navbar.getStarted')}
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