import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache'
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
  const { isOnline, isSlowConnection, effectiveType, retryConnection } = useNetwork();
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

  // Track if user dismissed the banner in this session
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('offline-banner-dismissed') === 'true'; } catch { return false; }
  });

  const handleDismiss = () => {
    setShowOfflineMessage(false);
    setDismissed(true);
    try { sessionStorage.setItem('offline-banner-dismissed', 'true'); } catch {}
  };

  if (dismissed || (!showOfflineMessage && isOnline && !isSlowConnection)) {
    return null;
  }

  return (
    <AnimatePresence>
      {(showOfflineMessage || isSlowConnection) && (
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
                      ? 'Connection Restored'
                      : 'Slow Connection'
                    : 'No Internet Connection'
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
                      ? 'You\'re back online! All features are now available.'
                      : `You're on a ${effectiveType || 'slow'} connection. Some features may be limited.`
                    : 'Please check your network connection and try again.'
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
                    Retry
                  </motion.button>
                )}
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDismiss}
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

  // Determine if connection is slow
  const isSlowConnection = networkStatus.isOnline && (
    networkStatus.effectiveType === '2g' || 
    networkStatus.effectiveType === 'slow-2g' ||
    (networkStatus.downlink !== undefined && networkStatus.downlink < 1.5)
  );

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