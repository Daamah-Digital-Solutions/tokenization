import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RouterProvider, useRouter } from './utils/router';
import { GlobalErrorBoundary } from './components/ui/GlobalErrorBoundary';
import { NetworkProvider } from './components/ui/OfflineIndicator';
import { SkipToContent, KeyboardIndicator } from './components/ui/AccessibilityHelper';
import './App.css'

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Lazy load pages for code splitting
const HomePage = React.lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const KYCPage = React.lazy(() => import('./pages/KYCPage').then(m => ({ default: m.KYCPage })));
const PropertiesPage = React.lazy(() => import('./pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = React.lazy(() => import('./pages/PropertyDetailPage').then(m => ({ default: m.PropertyDetailPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DemoPage = React.lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
const IntegrationTestPage = React.lazy(() => import('./pages/IntegrationTestPage').then(m => ({ default: m.IntegrationTestPage })));
const WalletManagementPage = React.lazy(() => import('./components/payments').then(m => ({ default: m.WalletManagementPage })));

// Loading fallback component
const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading page...' }) => (
  <main id="main-content" tabIndex={-1} className="focus:outline-none">
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-300 font-medium">{message}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please wait a moment...</p>
      </div>
    </div>
  </main>
);

// Error fallback for lazy loading failures
const LazyLoadError: React.FC<{ error?: Error; retry?: () => void }> = ({ error, retry }) => (
  <main id="main-content" tabIndex={-1} className="focus:outline-none">
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Failed to Load Page
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          There was an error loading this page. Please check your connection and try again.
        </p>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
              Error Details (Development)
            </summary>
            <p className="text-xs font-mono text-red-600 dark:text-red-400 mt-2">
              {error.message}
            </p>
          </details>
        )}
        {retry && (
          <button
            onClick={retry}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  </main>
);

const AppRouter: React.FC = () => {
  const { currentRoute } = useRouter();

  const renderCurrentPage = () => {
    const mainProps = {
      id: "main-content" as const,
      tabIndex: -1 as const,
      className: "focus:outline-none"
    };

    switch (currentRoute) {
      case 'home':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading home page..." />}>
              <HomePage />
            </Suspense>
          </main>
        );
      case 'login':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading sign in..." />}>
              <LoginPage />
            </Suspense>
          </main>
        );
      case 'register':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading registration..." />}>
              <RegisterPage />
            </Suspense>
          </main>
        );
      case 'kyc':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading KYC verification..." />}>
              <KYCPage />
            </Suspense>
          </main>
        );
      case 'dashboard':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
              <DashboardPage />
            </Suspense>
          </main>
        );
      case 'properties':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading properties..." />}>
              <PropertiesPage />
            </Suspense>
          </main>
        );
      case 'property-detail':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading property details..." />}>
              <PropertyDetailPage onBack={() => window.history.back()} />
            </Suspense>
          </main>
        );
      case 'wallet':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading wallet..." />}>
              <WalletManagementPage />
            </Suspense>
          </main>
        );
      case 'demo':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading demo..." />}>
              <DemoPage />
            </Suspense>
          </main>
        );
      case 'integration-test':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading integration test..." />}>
              <IntegrationTestPage />
            </Suspense>
          </main>
        );
      case 'about':
        return (
          <main {...mainProps}>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center p-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  About Capimax
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Learn more about our real estate tokenization platform.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Coming Soon!
                </p>
              </div>
            </div>
          </main>
        );
      case 'contact':
        return (
          <main {...mainProps}>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center p-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Contact Us
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Get in touch with our team.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Coming Soon!
                </p>
              </div>
            </div>
          </main>
        );
      default:
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading home page..." />}>
              <HomePage />
            </Suspense>
          </main>
        );
    }
  };

  return (
    <>
      <SkipToContent />
      <KeyboardIndicator />
      <GlobalErrorBoundary fallback={<LazyLoadError />}>
        {renderCurrentPage()}
      </GlobalErrorBoundary>
    </>
  );
};

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NetworkProvider>
              <LoadingProvider>
                <NotificationProvider>
                  <PaymentProvider>
                    <RouterProvider>
                      <AppRouter />
                    </RouterProvider>
                  </PaymentProvider>
                </NotificationProvider>
              </LoadingProvider>
            </NetworkProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App
