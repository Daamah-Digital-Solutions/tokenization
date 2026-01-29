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
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage').then(m => ({ default: m.EmailVerificationPage })));
const CodeVerificationPage = React.lazy(() => import('./pages/CodeVerificationPage').then(m => ({ default: m.CodeVerificationPage })));
const PasswordResetPage = React.lazy(() => import('./pages/PasswordResetPage').then(m => ({ default: m.PasswordResetPage })));
const NewPasswordPage = React.lazy(() => import('./pages/NewPasswordPage').then(m => ({ default: m.NewPasswordPage })));
const CompleteGoogleProfilePage = React.lazy(() => import('./pages/CompleteGoogleProfilePage').then(m => ({ default: m.CompleteGoogleProfilePage })));
const KYCPage = React.lazy(() => import('./pages/KYCPage').then(m => ({ default: m.KYCPage })));
const PropertiesPage = React.lazy(() => import('./pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = React.lazy(() => import('./pages/PropertyDetailPage').then(m => ({ default: m.PropertyDetailPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DemoPage = React.lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
const IntegrationTestPage = React.lazy(() => import('./pages/IntegrationTestPage').then(m => ({ default: m.IntegrationTestPage })));
const WalletManagementPage = React.lazy(() => import('./components/payments').then(m => ({ default: m.WalletManagementPage })));
const RoleManagementPage = React.lazy(() => import('./pages/RoleManagementPage').then(m => ({ default: m.RoleManagementPage })));
const MarketplacePage = React.lazy(() => import('./pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const BrokerProgramPage = React.lazy(() => import('./pages/BrokerProgramPage').then(m => ({ default: m.BrokerProgramPage })));
const BrokerApplicationPage = React.lazy(() => import('./pages/BrokerApplicationPage').then(m => ({ default: m.BrokerApplicationPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));

// Legal Pages
const DisclaimerPage = React.lazy(() => import('./pages/legal/DisclaimerPage').then(m => ({ default: m.DisclaimerPage })));
const RiskDisclosurePage = React.lazy(() => import('./pages/legal/RiskDisclosurePage').then(m => ({ default: m.RiskDisclosurePage })));
const CompliancePage = React.lazy(() => import('./pages/legal/CompliancePage').then(m => ({ default: m.CompliancePage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiesPolicyPage = React.lazy(() => import('./pages/legal/CookiesPolicyPage').then(m => ({ default: m.CookiesPolicyPage })));
const AMLKYCPage = React.lazy(() => import('./pages/legal/AMLKYCPage').then(m => ({ default: m.AMLKYCPage })));
const ConflictsPage = React.lazy(() => import('./pages/legal/ConflictsPage').then(m => ({ default: m.ConflictsPage })));
const ComplaintsPage = React.lazy(() => import('./pages/legal/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })));
const SecurityPolicyPage = React.lazy(() => import('./pages/legal/SecurityPolicyPage').then(m => ({ default: m.SecurityPolicyPage })));

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
      case 'email-verification':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading email verification..." />}>
              <EmailVerificationPage />
            </Suspense>
          </main>
        );
      case 'code-verification':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading code verification..." />}>
              <CodeVerificationPage />
            </Suspense>
          </main>
        );
      case 'password-reset':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading password reset..." />}>
              <PasswordResetPage />
            </Suspense>
          </main>
        );
      case 'new-password':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading new password..." />}>
              <NewPasswordPage />
            </Suspense>
          </main>
        );
      case 'complete-google-profile':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading profile completion..." />}>
              <CompleteGoogleProfilePage />
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
      case 'role-management':
      case 'settings/roles':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading role management..." />}>
              <RoleManagementPage />
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
            <Suspense fallback={<PageLoader message="Loading about page..." />}>
              <AboutPage />
            </Suspense>
          </main>
        );
      case 'contact':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading contact page..." />}>
              <ContactPage />
            </Suspense>
          </main>
        );
      case 'marketplace':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading marketplace..." />}>
              <MarketplacePage />
            </Suspense>
          </main>
        );
      case 'broker-program':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading broker program..." />}>
              <BrokerProgramPage />
            </Suspense>
          </main>
        );
      case 'broker-application':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading broker application..." />}>
              <BrokerApplicationPage />
            </Suspense>
          </main>
        );
      // Legal Pages
      case 'legal-disclaimer':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading disclaimer..." />}>
              <DisclaimerPage />
            </Suspense>
          </main>
        );
      case 'legal-risk-disclosure':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading risk disclosure..." />}>
              <RiskDisclosurePage />
            </Suspense>
          </main>
        );
      case 'legal-compliance':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading compliance..." />}>
              <CompliancePage />
            </Suspense>
          </main>
        );
      case 'legal-privacy':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading privacy policy..." />}>
              <PrivacyPolicyPage />
            </Suspense>
          </main>
        );
      case 'legal-terms':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading terms..." />}>
              <TermsPage />
            </Suspense>
          </main>
        );
      case 'legal-cookies':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading cookies policy..." />}>
              <CookiesPolicyPage />
            </Suspense>
          </main>
        );
      case 'legal-aml-kyc':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading AML/KYC policy..." />}>
              <AMLKYCPage />
            </Suspense>
          </main>
        );
      case 'legal-conflicts':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading conflicts policy..." />}>
              <ConflictsPage />
            </Suspense>
          </main>
        );
      case 'legal-complaints':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading complaints procedure..." />}>
              <ComplaintsPage />
            </Suspense>
          </main>
        );
      case 'legal-security':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading security policy..." />}>
              <SecurityPolicyPage />
            </Suspense>
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
