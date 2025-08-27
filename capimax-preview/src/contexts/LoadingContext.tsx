import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Loading state interface
interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  operation?: string;
}

// Context interface
interface LoadingContextType {
  loading: LoadingState;
  setLoading: (loading: Partial<LoadingState>) => void;
  startLoading: (message?: string, operation?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  withLoading: <T extends any[], R>(
    operation: string,
    fn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R>;
}

// Create context
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Hook to use loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Props for LoadingProvider
interface LoadingProviderProps {
  children: ReactNode;
}

// Loading overlay component
const LoadingOverlay: React.FC<{ loading: LoadingState }> = ({ loading }) => {
  if (!loading.isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
        >
          {/* Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              </div>
            </div>
          </div>

          {/* Loading Message */}
          {loading.loadingMessage && (
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold text-slate-900 dark:text-white mb-2"
            >
              {loading.loadingMessage}
            </motion.h3>
          )}

          {/* Operation */}
          {loading.operation && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-600 dark:text-slate-300 mb-4"
            >
              {loading.operation}
            </motion.p>
          )}

          {/* Progress Bar */}
          {typeof loading.progress === 'number' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Progress
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {Math.round(loading.progress)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${loading.progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Loading dots animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center space-x-1 mt-6"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 bg-emerald-500 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Loading provider component
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false
  });

  const setLoading = useCallback((newLoading: Partial<LoadingState>) => {
    setLoadingState(prev => ({ ...prev, ...newLoading }));
  }, []);

  const startLoading = useCallback((message?: string, operation?: string) => {
    setLoadingState({
      isLoading: true,
      loadingMessage: message,
      operation,
      progress: undefined
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      loadingMessage: undefined,
      operation: undefined,
      progress: undefined
    });
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }));
  }, []);

  // Higher-order function to wrap async operations with loading
  const withLoading = useCallback(<T extends any[], R,>(
    operation: string,
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        startLoading('Processing...', operation);
        const result = await fn(...args);
        stopLoading();
        return result;
      } catch (error) {
        stopLoading();
        throw error;
      }
    };
  }, [startLoading, stopLoading]);

  const value: LoadingContextType = {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    setProgress,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingOverlay loading={loading} />
    </LoadingContext.Provider>
  );
};

// Utility hook for component-level loading states
export const useComponentLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);

  const withLoading = useCallback(async <T,>(
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await asyncOperation();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    setIsLoading,
    withLoading
  };
};

// Loading button component for individual actions
export const LoadingButton: React.FC<{
  loading?: boolean;
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}> = ({ 
  loading = false, 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  variant = 'primary'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    if (!onClick || loading || isLoading || disabled) return;
    
    if (onClick.constructor.name === 'AsyncFunction') {
      setIsLoading(true);
      try {
        await onClick();
      } finally {
        setIsLoading(false);
      }
    } else {
      onClick();
    }
  };

  const isCurrentlyLoading = loading || isLoading;
  
  const baseClasses = "relative inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200";
  const variantClasses = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-300",
    secondary: "bg-slate-600 hover:bg-slate-500 text-white disabled:bg-slate-300",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 disabled:border-emerald-300 disabled:text-emerald-300",
    ghost: "text-emerald-600 hover:bg-emerald-50 disabled:text-emerald-300"
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isCurrentlyLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <AnimatePresence mode="wait">
        {isCurrentlyLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};