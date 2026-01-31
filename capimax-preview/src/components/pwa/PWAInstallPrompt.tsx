import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone } from 'lucide-react';

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
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt if not dismissed recently
      if (!dismissed || dismissedTime < oneDayAgo) {
        // Delay showing the prompt for better UX
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-prompt-dismissed');
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
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't render if already installed or no prompt available
  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">Install Capimax RT</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-slate-300 text-sm mb-4">
                Install our app for a better experience with offline access,
                faster loading, and instant notifications.
              </p>

              {/* Features */}
              <ul className="text-slate-400 text-xs space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Quick access from your home screen
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Works offline with cached data
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Native app-like experience
                </li>
              </ul>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-slate-300
                           border border-slate-600 rounded-lg transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-1 px-4 py-2 text-sm text-white bg-emerald-600
                           hover:bg-emerald-500 rounded-lg transition-colors
                           flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
