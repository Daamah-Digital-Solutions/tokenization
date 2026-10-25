import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { WifiOff, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

// Network status interface
interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

// Context interface
interface NetworkContextType extends NetworkStatus {
  isSlowConnection: boolean;
  retryConnection: () => void;
}

// Create context
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Hook to use network context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

// Custom hook for network status
const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      
      // Get connection info if available (Chrome/Edge only)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setStatus({
        isOnline,
        connectionType: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      });
    };

    const handleOnline = () => {
      updateOnlineStatus();
      // Optionally trigger a test request to verify actual connectivity
      testConnectivity();
    };

    const handleOffline = () => {
      updateOnlineStatus();
    };

    const handleConnectionChange = () => {
      updateOnlineStatus();
    };

    // Test actual connectivity with a small request
    const testConnectivity = async () => {
      try {
        const response = await fetch('/favicon.svg', {
          method: 'HEAD',
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error('Network test failed');
        }
      } catch {
        // If test fails but navigator.onLine is true, we might have limited connectivity
        setStatus(prev => ({
          ...prev,
          isOnline: false
        }));
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change listener (Chrome/Edge only)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial status update
    updateOnlineStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
};

// Main offline indicator component
export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation('common');
  const { isOnline, isSlowConnection, retryConnection } = useNetwork();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show reconnection message briefly
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineMessage(false);
    }
  }, [isOnline, wasOffline]);

  // Dismissing the slow-connection notice lasts for the session; dismissing
  // the offline / restored notice only hides the current occurrence.
  const [slowDismissed, setSlowDismissed] = useState(() => {
    try { return sessionStorage.getItem('slow-connection-dismissed') === 'true'; } catch { return false; }
  });

  const showSlow = isOnline && !wasOffline && isSlowConnection && !slowDismissed;

  const handleDismiss = () => {
    if (showSlow) {
      setSlowDismissed(true);
      try { sessionStorage.setItem('slow-connection-dismissed', 'true'); } catch {}
    }
    setShowOfflineMessage(false);
  };

  if (!showOfflineMessage && !showSlow) {
    return null;
  }

  return (
    <AnimatePresence>
      {(showOfflineMessage || showSlow) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4"
        >
          <div className={`
            ${isOnline 
              ? wasOffline 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            } 
            border rounded-xl shadow-lg backdrop-blur-sm p-4
          `}>
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              <div className={`flex-shrink-0 ${
                isOnline 
                  ? wasOffline 
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {isOnline ? (
                  wasOffline ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )
                ) : (
                  <WifiOff className="w-5 h-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm ${
                  isOnline 
                    ? wasOffline 
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-amber-900 dark:text-amber-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {isOnline
                    ? wasOffline
                      ? t('network.title_restored')
                      : t('network.title_slow')
                    : t('network.title_offline')
                  }
                </h4>
                <p className={`text-sm ${
                  isOnline 
                    ? wasOffline 
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {isOnline
                    ? wasOffline
                      ? t('network.msg_restored')
                      : t('network.msg_slow')
                    : t('network.msg_offline')
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                {!isOnline && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={retryConnection}
                    className={`
                      px-3 py-1 text-sm font-medium rounded-lg
                      text-red-700 dark:text-red-300
                      hover:bg-red-100 dark:hover:bg-red-800/30
                      transition-colors duration-200
                    `}
                  >
                    {t('network.retry')}
                  </motion.button>
                )}
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDismiss}
                  aria-label={t('network.dismiss')}
                  className={`
                    p-1 rounded-lg transition-colors duration-200
                    ${isOnline 
                      ? wasOffline 
                        ? 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/30'
                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                      : 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30'
                    }
                  `}
                >
                  ×
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Connection quality indicator (for status bars)
export const ConnectionQualityIndicator: React.FC<{ 
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ showLabel = false, size = 'md' }) => {
  const { isOnline, effectiveType, downlink } = useNetwork();

  const getQualityInfo = () => {
    if (!isOnline) {
      return { color: 'text-red-500', bars: 0, label: 'Offline' };
    }

    // Determine connection quality based on effective type and downlink
    if (effectiveType === '4g' || (downlink && downlink > 10)) {
      return { color: 'text-emerald-500', bars: 4, label: 'Excellent' };
    } else if (effectiveType === '3g' || (downlink && downlink > 1.5)) {
      return { color: 'text-yellow-500', bars: 3, label: 'Good' };
    } else if (effectiveType === '2g' || (downlink && downlink > 0.5)) {
      return { color: 'text-orange-500', bars: 2, label: 'Fair' };
    } else {
      return { color: 'text-red-500', bars: 1, label: 'Poor' };
    }
  };

  const quality = getQualityInfo();
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-2">
      {/* Signal bars */}
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`
              w-1 ${quality.bars >= bar ? quality.color : 'text-gray-300 dark:text-gray-600'}
              transition-colors duration-200
            `}
            style={{ height: `${bar * 3 + 2}px` }}
          >
            <div className="w-full h-full bg-current rounded-sm" />
          </div>
        ))}
      </div>

      {/* Wi-Fi icon alternative */}
      <div className={`${quality.color} ${sizeClasses[size]}`}>
        {isOnline ? <Wifi className="w-full h-full" /> : <WifiOff className="w-full h-full" />}
      </div>

      {/* Label */}
      {showLabel && (
        <span className={`text-xs font-medium ${quality.color}`}>
          {quality.label}
        </span>
      )}
    </div>
  );
};

// Network provider component
interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const networkStatus = useNetworkStatus();
  const [retryCount, setRetryCount] = useState(0);

  // "Slow" = the browser classifies the link as 2G / slow-2G, and it has
  // stayed that way for a few seconds. The old rule also fired on
  // `downlink < 1.5`, but Chrome reports a coarse, privacy-rounded estimate
  // (often ~1.2–1.45 Mbps right after page load, even on fast Wi-Fi), so
  // almost everyone saw a false "Slow Connection" warning on opening the
  // platform (client round 3, #1).
  const looksSlow = networkStatus.isOnline && (
    networkStatus.effectiveType === '2g' ||
    networkStatus.effectiveType === 'slow-2g'
  );
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  useEffect(() => {
    if (!looksSlow) {
      setIsSlowConnection(false);
      return;
    }
    const timer = window.setTimeout(() => setIsSlowConnection(true), 8000);
    return () => window.clearTimeout(timer);
  }, [looksSlow]);

  const retryConnection = () => {
    setRetryCount(prev => prev + 1);
    // Force a network status check
    window.location.reload();
  };

  const value: NetworkContextType = {
    ...networkStatus,
    isSlowConnection,
    retryConnection
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
      <OfflineIndicator />
    </NetworkContext.Provider>
  );
};

// Hook for handling offline-first functionality
export const useOfflineFirst = () => {
  const { isOnline } = useNetwork();

  const withOfflineHandling = async <T,>(
    onlineOperation: () => Promise<T>,
    offlineOperation?: () => Promise<T> | T,
    options: {
      showOfflineMessage?: boolean;
      fallbackMessage?: string;
    } = {}
  ): Promise<T> => {
    if (isOnline) {
      try {
        return await onlineOperation();
      } catch (error) {
        // If online operation fails and we have an offline fallback
        if (offlineOperation) {
          return await Promise.resolve(offlineOperation());
        }
        throw error;
      }
    } else {
      if (offlineOperation) {
        return await Promise.resolve(offlineOperation());
      } else {
        throw new Error(options.fallbackMessage || 'This action requires an internet connection');
      }
    }
  };

  return {
    isOnline,
    withOfflineHandling
  };
};