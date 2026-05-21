/**
 * Install-to-home-screen prompt.
 *
 * On Chrome/Edge/Android the browser fires `beforeinstallprompt`; we capture
 * that and show our own banner so we control the timing and the look.
 *
 * iOS Safari is the awkward one — Apple has never shipped beforeinstallprompt
 * and never will (their motive: keep the App Store as the install funnel).
 * For iOS we render a one-time instruction card ("Tap Share → Add to Home
 * Screen") instead, which is the only way to install a PWA on iPhone/iPad.
 *
 * Dismissal is sticky for 7 days via localStorage so we don't nag users.
 * After a successful install we wipe the dismissal flag and never show again
 * (display-mode: standalone catches that).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean; // iOS-only
  }
}

// Routes where the install prompt would be intrusive (auth flows etc).
const SUPPRESSED_PATHS = [
  '/login',
  '/register',
  '/email-verification',
  '/code-verification',
  '/password-reset',
  '/new-password',
  '/complete-google-profile',
  '/kyc',
];

const DISMISS_KEY = 'pwa-prompt-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 8 * 1000; // Wait 8s before showing — give the user time to look around

const isIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Macintosh; check touch points to disambiguate.
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Macintosh') && 'ontouchend' in document)
  );
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    navigator.standalone === true
  );
};

const wasDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = parseInt(raw, 10);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

const isSuppressedPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  return SUPPRESSED_PATHS.some((p) => window.location.pathname.startsWith(p));
};

type Mode = 'native' | 'ios';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [mode, setMode] = useState<Mode>('native');

  useEffect(() => {
    if (isStandalone()) return;
    if (wasDismissedRecently()) return;

    // iOS path — show static instructions after the delay (no install event).
    if (isIos()) {
      const timer = setTimeout(() => {
        if (!isSuppressedPath()) {
          setMode('ios');
          setShowPrompt(true);
        }
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }

    // Chrome/Edge/Android — wait for beforeinstallprompt.
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => {
        if (!isSuppressedPath()) {
          setMode('native');
          setShowPrompt(true);
        }
      }, SHOW_DELAY_MS);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* noop */
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (err) {
      console.error('PWA install error:', err);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* noop */
    }
  };

  if (!showPrompt) return null;

  // Position: bottom of viewport, but lifted ABOVE the MobileBottomNav
  // (which is 64px tall + safe-area-inset-bottom). On md+ it sits in the
  // bottom-right corner.
  const containerCls =
    'fixed left-3 right-3 z-50 ' +
    'bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] ' +
    'md:left-auto md:right-4 md:bottom-4 md:w-96';

  return (
    <AnimatePresence>
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={containerCls}
      >
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Install Capimax RT</span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 text-slate-200">
            {mode === 'native' ? (
              <>
                <p className="text-sm mb-3">
                  Add Capimax RT to your home screen for a faster, app-like
                  experience — offline access, instant launch, and push
                  notifications.
                </p>
                <ul className="text-slate-400 text-xs space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Quick access from your home screen
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Full-screen native-app feel
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Works offline with cached data
                  </li>
                </ul>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-200
                               border border-slate-700 rounded-lg transition-colors"
                  >
                    Not Now
                  </button>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600
                               hover:bg-emerald-500 rounded-lg transition-colors
                               flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-4">
                  Install Capimax RT on your iPhone:
                </p>
                <ol className="space-y-3 mb-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                      1
                    </span>
                    <span className="flex items-center gap-1.5">
                      Tap the Share button
                      <Share className="w-4 h-4 text-emerald-400 inline" />
                      below
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                      2
                    </span>
                    <span className="flex items-center gap-1.5">
                      Choose <span className="font-medium">Add to Home Screen</span>
                      <Plus className="w-4 h-4 text-emerald-400 inline" />
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                      3
                    </span>
                    <span>Tap <span className="font-medium">Add</span> in the top-right</span>
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full px-4 py-2 text-sm text-white bg-emerald-600
                             hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
