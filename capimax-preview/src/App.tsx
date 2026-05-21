import React, { Suspense, ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PaymentProvider } from './contexts/PaymentContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RouterProvider, useRouter } from './utils/router';
import { GlobalErrorBoundary } from './components/ui/GlobalErrorBoundary';
import { NetworkProvider } from './components/ui/OfflineIndicator';
import { SkipToContent, KeyboardIndicator } from './components/ui/AccessibilityHelper';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { UpdatePrompt } from './components/system/UpdatePrompt';
import { MobileBottomNav } from './components/mobile/MobileBottomNav';
import './App.css'

// Lazy import with chunk-reload fallback.
//
// When a deploy ships, every JS chunk gets a new content-hash filename.
// A user whose tab was open across the deploy still has the OLD index.html
// (or service-worker cache) referencing the OLD chunk URLs — so the next
// time they navigate to a route that hasn't been loaded yet, the dynamic
// import 404s. The symptom is the "Failed to Load Page" fallback.
//
// We detect ChunkLoadError (or the equivalent "Failed to fetch dynamically
// imported module") and hard-reload the page once so the browser pulls
// the fresh index.html with the new chunk references. sessionStorage
// guards against an infinite reload loop on a genuinely missing chunk.
const isChunkLoadError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(err.message) ||
    /Failed to fetch dynamically imported module/i.test(err.message) ||
    /Importing a module script failed/i.test(err.message)
  );
};

const lazyWithRetry = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> =>
  React.lazy(async () => {
    try {
      const mod = await loader();
      // Successful load — clear any prior reload flag so a future stale
      // chunk error can trigger another reload if needed.
      sessionStorage.removeItem('chunk-reload-attempted');
      return mod;
    } catch (err) {
      if (isChunkLoadError(err) && !sessionStorage.getItem('chunk-reload-attempted')) {
        sessionStorage.setItem('chunk-reload-attempted', String(Date.now()));
        window.location.reload();
        // Never-resolving promise so React doesn't render the error fallback
        // before the reload happens. The browser tears this down on reload.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });

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
const HomePage = lazyWithRetry(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const EmailVerificationPage = lazyWithRetry(() => import('./pages/EmailVerificationPage').then(m => ({ default: m.EmailVerificationPage })));
const CodeVerificationPage = lazyWithRetry(() => import('./pages/CodeVerificationPage').then(m => ({ default: m.CodeVerificationPage })));
const PasswordResetPage = lazyWithRetry(() => import('./pages/PasswordResetPage').then(m => ({ default: m.PasswordResetPage })));
const NewPasswordPage = lazyWithRetry(() => import('./pages/NewPasswordPage').then(m => ({ default: m.NewPasswordPage })));
const CompleteGoogleProfilePage = lazyWithRetry(() => import('./pages/CompleteGoogleProfilePage').then(m => ({ default: m.CompleteGoogleProfilePage })));
const SubmitPropertyPage = lazyWithRetry(() => import('./pages/SubmitPropertyPage').then(m => ({ default: m.SubmitPropertyPage })));
const KYCPage = lazyWithRetry(() => import('./pages/KYCPage').then(m => ({ default: m.KYCPage })));
const PropertiesPage = lazyWithRetry(() => import('./pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const PropertyDetailPage = lazyWithRetry(() => import('./pages/PropertyDetailPage').then(m => ({ default: m.PropertyDetailPage })));
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DemoPage = lazyWithRetry(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
const IntegrationTestPage = lazyWithRetry(() => import('./pages/IntegrationTestPage').then(m => ({ default: m.IntegrationTestPage })));
const WalletManagementPage = lazyWithRetry(() => import('./components/payments').then(m => ({ default: m.WalletManagementPage })));
const RoleManagementPage = lazyWithRetry(() => import('./pages/RoleManagementPage').then(m => ({ default: m.RoleManagementPage })));
const MarketplacePage = lazyWithRetry(() => import('./pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const BrokerProgramPage = lazyWithRetry(() => import('./pages/BrokerProgramPage').then(m => ({ default: m.BrokerProgramPage })));
const BrokerApplicationPage = lazyWithRetry(() => import('./pages/BrokerApplicationPage').then(m => ({ default: m.BrokerApplicationPage })));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PartnersPage = lazyWithRetry(() => import('./pages/PartnersPage').then(m => ({ default: m.PartnersPage })));
const LiquidityProviderPage = lazyWithRetry(() => import('./pages/LiquidityProviderPage').then(m => ({ default: m.LiquidityProviderPage })));

// Legal Pages
const DisclaimerPage = lazyWithRetry(() => import('./pages/legal/DisclaimerPage').then(m => ({ default: m.DisclaimerPage })));
const RiskDisclosurePage = lazyWithRetry(() => import('./pages/legal/RiskDisclosurePage').then(m => ({ default: m.RiskDisclosurePage })));
const CompliancePage = lazyWithRetry(() => import('./pages/legal/CompliancePage').then(m => ({ default: m.CompliancePage })));
const PrivacyPolicyPage = lazyWithRetry(() => import('./pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazyWithRetry(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiesPolicyPage = lazyWithRetry(() => import('./pages/legal/CookiesPolicyPage').then(m => ({ default: m.CookiesPolicyPage })));
const AMLKYCPage = lazyWithRetry(() => import('./pages/legal/AMLKYCPage').then(m => ({ default: m.AMLKYCPage })));
const ConflictsPage = lazyWithRetry(() => import('./pages/legal/ConflictsPage').then(m => ({ default: m.ConflictsPage })));
const ComplaintsPage = lazyWithRetry(() => import('./pages/legal/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })));
const SecurityPolicyPage = lazyWithRetry(() => import('./pages/legal/SecurityPolicyPage').then(m => ({ default: m.SecurityPolicyPage })));

// Info/Public Pages
const HowItWorksPage = lazyWithRetry(() => import('./pages/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const TokenizationPage = lazyWithRetry(() => import('./pages/TokenizationPage').then(m => ({ default: m.TokenizationPage })));
const SPVPage = lazyWithRetry(() => import('./pages/SPVPage').then(m => ({ default: m.SPVPage })));
const DataRoomPage = lazyWithRetry(() => import('./pages/DataRoomPage').then(m => ({ default: m.DataRoomPage })));
const InvestorGuidePage = lazyWithRetry(() => import('./pages/InvestorGuidePage').then(m => ({ default: m.InvestorGuidePage })));
const SecondaryMarketPage = lazyWithRetry(() => import('./pages/SecondaryMarketPage').then(m => ({ default: m.SecondaryMarketPage })));
const RisksPage = lazyWithRetry(() => import('./pages/RisksPage').then(m => ({ default: m.RisksPage })));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const PropertyOwnerLandingPage = lazyWithRetry(() => import('./pages/PropertyOwnerLandingPage').then(m => ({ default: m.PropertyOwnerLandingPage })));
const WhyCapimaxPage = lazyWithRetry(() => import('./pages/WhyCapimaxPage').then(m => ({ default: m.WhyCapimaxPage })));
const StructurePage = lazyWithRetry(() => import('./pages/StructurePage').then(m => ({ default: m.StructurePage })));
const DocumentCenterPage = lazyWithRetry(() => import('./pages/DocumentCenterPage').then(m => ({ default: m.DocumentCenterPage })));

// Guide Pages
const BrokerGuidePage = lazyWithRetry(() => import('./pages/BrokerGuidePage').then(m => ({ default: m.BrokerGuidePage })));
const CapimaxRTGuidePage = lazyWithRetry(() => import('./pages/CapimaxRTGuidePage').then(m => ({ default: m.CapimaxRTGuidePage })));
const DeveloperGuidePage = lazyWithRetry(() => import('./pages/DeveloperGuidePage').then(m => ({ default: m.DeveloperGuidePage })));
const InvestmentGuidePage = lazyWithRetry(() => import('./pages/InvestmentGuidePage').then(m => ({ default: m.InvestmentGuidePage })));
const InvestmentStrategiesPage = lazyWithRetry(() => import('./pages/InvestmentStrategiesPage').then(m => ({ default: m.InvestmentStrategiesPage })));
const LiquidityProviderGuidePage = lazyWithRetry(() => import('./pages/LiquidityProviderGuidePage').then(m => ({ default: m.LiquidityProviderGuidePage })));
const OwnersGuidePage = lazyWithRetry(() => import('./pages/OwnersGuidePage').then(m => ({ default: m.OwnersGuidePage })));
const TechnologyPage = lazyWithRetry(() => import('./pages/TechnologyPage').then(m => ({ default: m.TechnologyPage })));

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

// 404 Not Found page
const NotFoundPage: React.FC = () => {
  const { navigate } = useRouter();
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl font-bold text-emerald-500 mb-4">404</div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('home')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => window.history.back()}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

// Protected route wrapper - redirects to login if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => {
  const { state: authState } = useAuth();
  const { navigate } = useRouter();

  // Show loading while checking auth
  if (authState.isLoading) {
    return fallback ? <>{fallback}</> : <PageLoader message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!authState.isAuthenticated) {
    // Use useEffect-like behavior via requestAnimationFrame to avoid render-time navigation
    requestAnimationFrame(() => navigate('login'));
    return (
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Redirecting to login...</p>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  const { currentRoute, getQueryParam } = useRouter();

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
      case 'submit-property':
        return (
          <ProtectedRoute fallback={<PageLoader message="Loading property form..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading property form..." />}>
                <SubmitPropertyPage />
              </Suspense>
            </main>
          </ProtectedRoute>
        );
      case 'kyc':
        return (
          <ProtectedRoute fallback={<PageLoader message="Loading KYC verification..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading KYC verification..." />}>
                <KYCPage />
              </Suspense>
            </main>
          </ProtectedRoute>
        );
      case 'dashboard':
        return (
          <ProtectedRoute fallback={<PageLoader message="Loading dashboard..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
                <DashboardPage />
              </Suspense>
            </main>
          </ProtectedRoute>
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
              <PropertyDetailPage
                propertyId={getQueryParam('id') || undefined}
                onBack={() => window.history.back()}
              />
            </Suspense>
          </main>
        );
      case 'wallet':
        return (
          <ProtectedRoute fallback={<PageLoader message="Loading wallet..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading wallet..." />}>
                <WalletManagementPage />
              </Suspense>
            </main>
          </ProtectedRoute>
        );
      case 'role-management':
      case 'settings/roles':
        return (
          <ProtectedRoute fallback={<PageLoader message="Loading role management..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading role management..." />}>
                <RoleManagementPage />
              </Suspense>
            </main>
          </ProtectedRoute>
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
      case 'partners':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading partners..." />}>
              <PartnersPage />
            </Suspense>
          </main>
        );
      case 'liquidity-provider':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading liquidity provider..." />}>
              <LiquidityProviderPage />
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
          <ProtectedRoute fallback={<PageLoader message="Loading broker application..." />}>
            <main {...mainProps}>
              <Suspense fallback={<PageLoader message="Loading broker application..." />}>
                <BrokerApplicationPage />
              </Suspense>
            </main>
          </ProtectedRoute>
        );
      // Legal Pages
      case 'legal-index':
        // Redirect /legal to /legal/privacy
        requestAnimationFrame(() => {
          window.history.replaceState({}, '', '/legal/privacy');
        });
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading privacy policy..." />}>
              <PrivacyPolicyPage />
            </Suspense>
          </main>
        );
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
      // Info/Public Pages
      case 'how-it-works':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading how it works..." />}>
              <HowItWorksPage />
            </Suspense>
          </main>
        );
      case 'tokenization':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading tokenization info..." />}>
              <TokenizationPage />
            </Suspense>
          </main>
        );
      case 'spv':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading SPV info..." />}>
              <SPVPage />
            </Suspense>
          </main>
        );
      case 'data-room':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading data room..." />}>
              <DataRoomPage />
            </Suspense>
          </main>
        );
      case 'investor-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading investor guide..." />}>
              <InvestorGuidePage />
            </Suspense>
          </main>
        );
      case 'secondary-market':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading secondary market info..." />}>
              <SecondaryMarketPage />
            </Suspense>
          </main>
        );
      case 'risks':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading risk disclosures..." />}>
              <RisksPage />
            </Suspense>
          </main>
        );
      case 'faq':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading FAQ..." />}>
              <FAQPage />
            </Suspense>
          </main>
        );
      case 'property-owner':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading property owner page..." />}>
              <PropertyOwnerLandingPage />
            </Suspense>
          </main>
        );
      case 'why-capimax':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading why Capimax..." />}>
              <WhyCapimaxPage />
            </Suspense>
          </main>
        );
      case 'structure':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading structure guide..." />}>
              <StructurePage />
            </Suspense>
          </main>
        );
      case 'document-center':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading document center..." />}>
              <DocumentCenterPage />
            </Suspense>
          </main>
        );
      // Guide Pages
      case 'broker-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading broker guide..." />}>
              <BrokerGuidePage />
            </Suspense>
          </main>
        );
      case 'capimax-rt-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading Capimax RT guide..." />}>
              <CapimaxRTGuidePage />
            </Suspense>
          </main>
        );
      case 'developer-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading developer guide..." />}>
              <DeveloperGuidePage />
            </Suspense>
          </main>
        );
      case 'investment-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading investment guide..." />}>
              <InvestmentGuidePage />
            </Suspense>
          </main>
        );
      case 'investment-strategies':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading investment strategies..." />}>
              <InvestmentStrategiesPage />
            </Suspense>
          </main>
        );
      case 'lp-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading liquidity provider guide..." />}>
              <LiquidityProviderGuidePage />
            </Suspense>
          </main>
        );
      case 'owners-guide':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading owner's guide..." />}>
              <OwnersGuidePage />
            </Suspense>
          </main>
        );
      case 'technology':
        return (
          <main {...mainProps}>
            <Suspense fallback={<PageLoader message="Loading technology..." />}>
              <TechnologyPage />
            </Suspense>
          </main>
        );
      case 'not-found':
        // Explicit 404 route for invalid URLs
        return <NotFoundPage />;
      default:
        // Fallback for any unhandled route (should not happen with proper routing)
        return <NotFoundPage />;
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
                      <MobileBottomNav />
                      <PWAInstallPrompt />
                      <UpdatePrompt />
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
