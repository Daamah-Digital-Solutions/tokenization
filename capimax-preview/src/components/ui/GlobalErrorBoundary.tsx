import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Fallback screen as a function component so it can use translations
// (the boundary itself has to stay a class component).
const ErrorFallbackView: React.FC<{
  error?: Error;
  errorInfo?: ErrorInfo;
  onRetry: () => void;
  onGoHome: () => void;
  onReload: () => void;
}> = ({ error, errorInfo, onRetry, onGoHome, onReload }) => {
  const { t } = useTranslation('shared');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </motion.div>

          {/* Error Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          >
            {t('errorBoundary.title')}
          </motion.h1>

          {/* Error Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-600 dark:text-slate-300 mb-8"
          >
            {t('errorBoundary.description')}
          </motion.p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-start"
            >
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                {t('errorBoundary.detailsTitle')}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 font-mono break-words">
                {error.message}
              </p>
              {errorInfo?.componentStack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
                    {t('errorBoundary.componentStack')}
                  </summary>
                  <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={onRetry}
              variant="primary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('errorBoundary.tryAgain')}
            </Button>
            
            <Button
              onClick={onGoHome}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              {t('errorBoundary.goHome')}
            </Button>
            
            <Button
              onClick={onReload}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('errorBoundary.reload')}
            </Button>
          </motion.div>

          {/* Support Contact */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <Trans
                t={t}
                i18nKey="errorBoundary.persists"
                components={{
                  link: (
                    <a
                      href="mailto:support@capimax.com"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    />
                  ),
                }}
              />
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and error reporting service
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // window.errorReporting?.captureException(error, { extra: errorInfo });
    }
  }

  private handleReload = () => {
    // Clear error state and reload the page
    window.location.reload();
  };

  private handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  private handleRetry = () => {
    // Clear error state and retry
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackView
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <GlobalErrorBoundary fallback={fallback}>
      <Component {...props} />
    </GlobalErrorBoundary>
  );
};

// Hook for manual error reporting
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: any) => {
    console.error('Manual error report:', error, errorInfo);
    
    // Report to error service in production
    if (process.env.NODE_ENV === 'production') {
      // window.errorReporting?.captureException(error, { extra: errorInfo });
    }
  };

  return { handleError };
};