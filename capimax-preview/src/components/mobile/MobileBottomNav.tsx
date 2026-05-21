/**
 * Mobile bottom navigation bar.
 *
 * Native-app-style tab bar shown only on `< md` (mobile) viewports. Five
 * primary destinations: Home, Properties, Marketplace, Wallet, Account.
 *
 * Hidden on auth/onboarding routes (login, register, email-verification...)
 * because a bottom tab bar competing with the auth form's CTA is the kind
 * of subtle annoyance that costs conversions.
 *
 * Sits fixed to the bottom, respects `safe-area-inset-bottom` so home-bar
 * gesture areas on iPhone don't overlap the icons. Pairs with `MobileBottomNavSpacer`
 * (exported below) — any page that wants its content to not hide behind the
 * bar should render that spacer at the end of its scrollable region.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Building2, ArrowLeftRight, Wallet, User } from 'lucide-react';
import { useRouter } from '../../utils/router';
import { useAuth } from '../../contexts/AuthContext';

// Routes where the tab bar would be disruptive (auth flows, KYC capture,
// 404 pages). Everything else gets the bar on mobile.
const HIDDEN_ROUTES = new Set([
  'login',
  'register',
  'email-verification',
  'code-verification',
  'password-reset',
  'new-password',
  'complete-google-profile',
  'kyc',
  'not-found',
]);

type TabKey = 'home' | 'properties' | 'marketplace' | 'wallet' | 'account';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  // Active when the current route is one of these (covers detail pages that
  // belong to the same section, e.g. /property-detail belongs under Properties).
  matchRoutes: string[];
  navigate: (
    navigate: ReturnType<typeof useRouter>['navigate'],
    isAuthenticated: boolean,
  ) => void;
}

const TABS: TabConfig[] = [
  {
    key: 'home',
    label: 'Home',
    icon: Home,
    matchRoutes: ['home'],
    navigate: (navigate) => navigate('home'),
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: Building2,
    matchRoutes: ['properties', 'property-detail'],
    navigate: (navigate) => navigate('properties'),
  },
  {
    key: 'marketplace',
    label: 'Market',
    icon: ArrowLeftRight,
    matchRoutes: ['marketplace'],
    navigate: (navigate) => navigate('marketplace'),
  },
  {
    key: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    matchRoutes: ['wallet'],
    navigate: (navigate, isAuthenticated) =>
      navigate(isAuthenticated ? 'wallet' : 'login'),
  },
  {
    key: 'account',
    label: 'Account',
    icon: User,
    matchRoutes: ['dashboard', 'role-management'],
    navigate: (navigate, isAuthenticated) =>
      navigate(isAuthenticated ? 'dashboard' : 'login'),
  },
];

export const MobileBottomNav: React.FC = () => {
  const { currentRoute, navigate } = useRouter();
  const { state: authState } = useAuth();

  if (HIDDEN_ROUTES.has(currentRoute)) return null;

  return (
    <>
      <nav
        role="navigation"
        aria-label="Primary mobile navigation"
        className="
          md:hidden fixed bottom-0 inset-x-0 z-40
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg
          border-t border-slate-200 dark:border-slate-800
          safe-bottom
        "
      >
        <ul className="grid grid-cols-5 max-w-screen-sm mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.matchRoutes.includes(currentRoute);
            return (
              <li key={tab.key} className="flex">
                <button
                  type="button"
                  onClick={() => tab.navigate(navigate, authState.isAuthenticated)}
                  className={`
                    relative flex flex-col items-center justify-center
                    flex-1 py-2.5 px-1 touch-target
                    transition-colors duration-200
                    ${active
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }
                  `}
                  aria-current={active ? 'page' : undefined}
                  aria-label={tab.label}
                >
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-active-pill"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-emerald-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <motion.span
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <Icon
                      className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-2'}`}
                    />
                    <span className="text-[10px] font-medium leading-tight">
                      {tab.label}
                    </span>
                  </motion.span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Spacer to prevent content from being hidden behind the nav.
          Only renders on mobile where the nav is visible. */}
      <div className="md:hidden h-[64px] safe-bottom" aria-hidden="true" />
    </>
  );
};

export default MobileBottomNav;
