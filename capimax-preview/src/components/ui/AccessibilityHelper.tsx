import React, { useState, useEffect, useRef, ReactNode, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Skip to content link component
export const SkipToContent: React.FC<{ targetId?: string }> = ({ 
  targetId = 'main-content' 
}) => {
  const handleSkip = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleSkip}
      className="
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
        bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg
        z-[9999] font-medium text-sm
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
      "
    >
      Skip to main content
    </button>
  );
};

// Screen reader only text component
export const ScreenReaderOnly: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <span className="sr-only">{children}</span>;
};

// Focus trap component for modals
export const FocusTrap: React.FC<{
  children: ReactNode;
  isActive: boolean;
  restoreFocus?: boolean;
}> = ({ children, isActive, restoreFocus = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
    };

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap becomes active
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleKeyDown = (e: any) => handleTabKey(e);

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus when trap is deactivated
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, restoreFocus]);

  return (
    <div ref={containerRef} className={isActive ? '' : 'contents'}>
      {children}
    </div>
  );
};

// Announcement component for screen readers
export const Announcement: React.FC<{
  message: string;
  priority: 'polite' | 'assertive';
  isVisible?: boolean;
}> = ({ message, priority, isVisible = false }) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={isVisible ? '' : 'sr-only'}
    >
      {message}
    </div>
  );
};

// High contrast mode toggle
export const HighContrastToggle: React.FC = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Check if user prefers high contrast
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    setIsHighContrast(prefersHighContrast);
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  return (
    <button
      onClick={toggleHighContrast}
      aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
      className="
        p-2 rounded-lg border border-gray-300 dark:border-gray-600
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-emerald-500
        transition-colors duration-200
      "
    >
      <span className="sr-only">
        {isHighContrast ? 'Disable' : 'Enable'} high contrast mode
      </span>
      <svg
        className="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    </button>
  );
};

// Keyboard navigation indicator
export const KeyboardIndicator: React.FC = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    document.addEventListener('keydown', handleKeyDown as any);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return null; // This component only manages CSS classes
};

// Accessible form field wrapper
export const AccessibleField: React.FC<{
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
  id: string;
}> = ({ label, error, help, required = false, children, id }) => {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <div
        {...(error && { 'aria-describedby': errorId })}
        {...(help && { 'aria-describedby': `${helpId} ${errorId || ''}`.trim() })}
      >
        {children}
      </div>
      
      {help && (
        <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
          {help}
        </p>
      )}
      
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Progress indicator with accessible labels
export const AccessibleProgress: React.FC<{
  value: number;
  max: number;
  label: string;
  showValue?: boolean;
}> = ({ value, max, label, showValue = true }) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {showValue && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {value} of {max}
          </span>
        )}
      </div>
      
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}% complete`}
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-emerald-600 h-2 rounded-full"
        />
      </div>
      
      <ScreenReaderOnly>
        {percentage}% complete
      </ScreenReaderOnly>
    </div>
  );
};

// Accessible tabs component
export const AccessibleTabs: React.FC<{
  tabs: Array<{ id: string; label: string; content: ReactNode; disabled?: boolean }>;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}> = ({ tabs, defaultTab, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const tabIds = tabs.filter(tab => !tab.disabled).map(tab => tab.id);
    const currentIndex = tabIds.indexOf(tabId);

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
        const prevTabId = tabIds[prevIndex];
        handleTabClick(prevTabId);
        tabRefs.current[prevTabId]?.focus();
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
        const nextTabId = tabIds[nextIndex];
        handleTabClick(nextTabId);
        tabRefs.current[nextTabId]?.focus();
        break;
        
      case 'Home':
        e.preventDefault();
        const firstTabId = tabIds[0];
        handleTabClick(firstTabId);
        tabRefs.current[firstTabId]?.focus();
        break;
        
      case 'End':
        e.preventDefault();
        const lastTabId = tabIds[tabIds.length - 1];
        handleTabClick(lastTabId);
        tabRefs.current[lastTabId]?.focus();
        break;
    }
  };

  return (
    <div className="w-full">
      {/* Tab list */}
      <div
        role="tablist"
        className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[tab.id] = el)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={`
              px-4 py-2 text-sm font-medium whitespace-nowrap
              border-b-2 transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
              ${activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={tab.id}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="py-4 focus:outline-none"
        >
          <AnimatePresence mode="wait">
            {activeTab === tab.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {tab.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// Font size controller
export const FontSizeController: React.FC = () => {
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12));
  };

  const resetFontSize = () => {
    setFontSize(16);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-300">Font Size:</span>
      <button
        onClick={decreaseFontSize}
        aria-label="Decrease font size"
        disabled={fontSize <= 12}
        className="
          w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-emerald-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        A-
      </button>
      <button
        onClick={resetFontSize}
        aria-label="Reset font size"
        className="
          px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-emerald-500
        "
      >
        Reset
      </button>
      <button
        onClick={increaseFontSize}
        aria-label="Increase font size"
        disabled={fontSize >= 24}
        className="
          w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-emerald-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        A+
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {fontSize}px
      </span>
    </div>
  );
};

// Connection quality indicator component
export const ConnectionQualityIndicator: React.FC<{
  size?: 'sm' | 'md' | 'lg';
}> = ({ size = 'md' }) => {
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor' | 'offline'>('good');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        setIsVisible(true);
        return;
      }

      // Check connection quality using connection API if available
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case '4g':
            setConnectionQuality('good');
            setIsVisible(false);
            break;
          case '3g':
            setConnectionQuality('fair');
            setIsVisible(true);
            break;
          case '2g':
          case 'slow-2g':
            setConnectionQuality('poor');
            setIsVisible(true);
            break;
          default:
            setConnectionQuality('good');
            setIsVisible(false);
        }
      } else {
        // Fallback to online/offline detection
        setConnectionQuality(navigator.onLine ? 'good' : 'offline');
        setIsVisible(!navigator.onLine);
      }
    };

    checkConnection();

    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      setConnectionQuality('offline');
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection periodically
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  const getStatusColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionQuality) {
      case 'good': return 'Good connection';
      case 'fair': return 'Fair connection';
      case 'poor': return 'Poor connection';
      case 'offline': return 'No connection';
      default: return 'Unknown connection status';
    }
  };

  const getSignalBars = () => {
    const bars = [];
    const barCount = connectionQuality === 'offline' ? 0 : 
                    connectionQuality === 'poor' ? 1 :
                    connectionQuality === 'fair' ? 2 : 3;

    for (let i = 0; i < 3; i++) {
      bars.push(
        <div
          key={i}
          className={`w-1 bg-current transition-opacity duration-200 ${
            i < barCount ? 'opacity-100' : 'opacity-30'
          } ${i === 0 ? 'h-2' : i === 1 ? 'h-3' : 'h-4'}`}
        />
      );
    }
    return bars;
  };

  if (!isVisible && connectionQuality === 'good') {
    return null;
  }

  return (
    <div 
      className="flex items-center"
      title={getStatusText()}
      aria-label={getStatusText()}
    >
      {connectionQuality === 'offline' ? (
        <svg
          className={`${getIconSize()} ${getStatusColor()}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M8.111 16.889A5.002 5.002 0 0112 15c1.933 0 3.683 1.092 4.555 2.808M2.458 12C3.732 9.943 5.522 8.334 7.678 7.5m8.644 0C17.478 8.334 19.268 9.943 20.542 12m-2.084 2.308A5.002 5.002 0 0012 13c-1.933 0-3.683 1.092-4.555 2.808"
          />
        </svg>
      ) : (
        <div 
          className={`${getStatusColor()} flex items-end gap-px ${getIconSize()}`}
          aria-hidden="true"
        >
          {getSignalBars()}
        </div>
      )}
      
      <ScreenReaderOnly>
        {getStatusText()}
      </ScreenReaderOnly>
    </div>
  );
};

// Accessibility menu component
export const AccessibilityMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Accessibility options"
        className="
          p-2 rounded-lg border border-gray-300 dark:border-gray-600
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-emerald-500
        "
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <FocusTrap isActive={isOpen}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="
                absolute right-0 top-full mt-2 w-80
                bg-white dark:bg-gray-800 rounded-xl shadow-lg
                border border-gray-200 dark:border-gray-700
                p-4 space-y-4 z-50
              "
            >
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Accessibility Options
              </h3>
              
              <div className="space-y-3">
                <FontSizeController />
                <HighContrastToggle />
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="
                  w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg
                  hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500
                "
              >
                Close
              </button>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </div>
  );
};