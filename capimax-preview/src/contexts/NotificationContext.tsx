import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

// Context interface
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string, options?: Partial<Notification>) => string;
  error: (title: string, message?: string, options?: Partial<Notification>) => string;
  warning: (title: string, message?: string, options?: Partial<Notification>) => string;
  info: (title: string, message?: string, options?: Partial<Notification>) => string;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Get icon for notification type
const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5" />;
    case 'error':
      return <XCircle className="w-5 h-5" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'info':
      return <Info className="w-5 h-5" />;
  }
};

// Get colors for notification type
const getColors = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: 'text-emerald-600 dark:text-emerald-400',
        title: 'text-emerald-900 dark:text-emerald-100',
        message: 'text-emerald-700 dark:text-emerald-300'
      };
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        title: 'text-red-900 dark:text-red-100',
        message: 'text-red-700 dark:text-red-300'
      };
    case 'warning':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        title: 'text-amber-900 dark:text-amber-100',
        message: 'text-amber-700 dark:text-amber-300'
      };
    case 'info':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        title: 'text-blue-900 dark:text-blue-100',
        message: 'text-blue-700 dark:text-blue-300'
      };
  }
};

// Individual notification component
const NotificationItem: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const colors = getColors(notification.type);
  const icon = getIcon(notification.type);

  const handleDismiss = () => {
    onDismiss(notification.id);
    notification.onDismiss?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      layout
      className={`
        ${colors.bg} ${colors.border} 
        border rounded-xl shadow-lg backdrop-blur-sm
        p-4 max-w-md w-full relative overflow-hidden
      `}
    >
      {/* Progress bar for non-persistent notifications */}
      {!notification.persistent && notification.duration && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{
            duration: notification.duration / 1000,
            ease: "linear"
          }}
          className={`absolute top-0 left-0 h-1 ${colors.icon.replace('text-', 'bg-')} origin-left`}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${colors.title} text-sm`}>
            {notification.title}
          </h4>
          {notification.message && (
            <p className={`${colors.message} text-sm mt-1`}>
              {notification.message}
            </p>
          )}
          
          {/* Action button */}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className={`
                ${colors.icon} hover:underline 
                text-sm font-medium mt-2 focus:outline-none
              `}
            >
              {notification.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 ${colors.icon} 
            hover:bg-black/10 dark:hover:bg-white/10 
            rounded-lg p-1 transition-colors duration-200
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Notification container component
const NotificationContainer: React.FC<{
  notifications: Notification[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationItem
              notification={notification}
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Props for NotificationProvider
interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

// Notification provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 5,
  defaultDuration = 5000
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notificationData: Omit<Notification, 'id'>) => {
    const id = generateId();
    const duration = notificationData.duration ?? defaultDuration;
    
    const notification: Notification = {
      ...notificationData,
      id,
      duration
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Keep only max notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Auto-dismiss after duration if not persistent
    if (!notification.persistent && duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  }, [maxNotifications, defaultDuration]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Notification> = {}
  ) => {
    return showNotification({ ...options, type: 'success', title, message });
  }, [showNotification]);

  const error = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Notification> = {}
  ) => {
    return showNotification({ ...options, type: 'error', title, message, persistent: options.persistent ?? true });
  }, [showNotification]);

  const warning = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Notification> = {}
  ) => {
    return showNotification({ ...options, type: 'warning', title, message });
  }, [showNotification]);

  const info = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Notification> = {}
  ) => {
    return showNotification({ ...options, type: 'info', title, message });
  }, [showNotification]);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </NotificationContext.Provider>
  );
};

// Hook for form validation notifications
export const useFormNotifications = () => {
  const { success, error, warning } = useNotifications();

  const notifyValidationError = useCallback((field: string, message: string) => {
    error(`${field} Error`, message, { duration: 3000, persistent: false });
  }, [error]);

  const notifyValidationSuccess = useCallback((message: string = 'Form saved successfully!') => {
    success('Success', message, { duration: 3000 });
  }, [success]);

  const notifyFormWarning = useCallback((message: string) => {
    warning('Warning', message, { duration: 4000 });
  }, [warning]);

  return {
    notifyValidationError,
    notifyValidationSuccess,
    notifyFormWarning
  };
};

// Hook for async operation notifications
export const useAsyncNotifications = () => {
  const { success, error, info } = useNotifications();

  const notifyAsync = useCallback(<T,>(
    promise: Promise<T>,
    options: {
      loading?: string;
      success: string;
      error: string;
      successMessage?: string;
      errorMessage?: string;
    }
  ) => {
    let loadingId: string | undefined;

    if (options.loading) {
      loadingId = info(options.loading, 'Please wait...', { persistent: true });
    }

    return promise
      .then((result) => {
        if (loadingId) {
          // Remove loading notification by clearing all and re-adding non-loading ones would be complex
          // For simplicity, we'll just let it auto-dismiss or handle it in the component
        }
        success(options.success, options.successMessage);
        return result;
      })
      .catch((err) => {
        if (loadingId) {
          // Same as above
        }
        error(options.error, options.errorMessage || err.message);
        throw err;
      });
  }, [success, error, info]);

  return { notifyAsync };
};