import React, { createContext, useContext, useState, useEffect } from 'react';

type Route = 'home' | 'login' | 'register' | 'email-verification' | 'code-verification' | 'password-reset' | 'new-password' | 'complete-google-profile' | 'kyc' | 'dashboard' | 'properties' | 'property-detail' | 'marketplace' | 'broker-program' | 'broker-application' | 'wallet' | 'role-management' | 'submit-property' | 'demo' | 'integration-test' | 'about' | 'contact' | 'partners' | 'liquidity-provider' | 'legal-index' | 'legal-disclaimer' | 'legal-risk-disclosure' | 'legal-compliance' | 'legal-privacy' | 'legal-terms' | 'legal-cookies' | 'legal-aml-kyc' | 'legal-conflicts' | 'legal-complaints' | 'legal-security' | 'how-it-works' | 'tokenization' | 'spv' | 'data-room' | 'investor-guide' | 'secondary-market' | 'risks' | 'faq' | 'property-owner' | 'why-capimax' | 'structure' | 'document-center' | 'verification-center' | 'broker-guide' | 'capimax-rt-guide' | 'developer-guide' | 'investment-guide' | 'investment-strategies' | 'lp-guide' | 'owners-guide' | 'technology' | 'not-found';

interface RouterContextType {
  currentRoute: Route;
  navigate: (route: Route, params?: Record<string, string>) => void;
  goBack: () => void;
  getQueryParam: (key: string) => string | null;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

interface RouterProviderProps {
  children: React.ReactNode;
  initialRoute?: Route;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({
  children,
  initialRoute = 'home'
}) => {
  // Get initial route from current URL path (ignoring query params)
  const getInitialRouteFromPath = (): Route => {
    const path = window.location.pathname;
    const routeMap: Record<string, Route> = {
      '/': 'home',
      '/login': 'login',
      '/register': 'register',
      '/email-verification': 'email-verification',
      '/code-verification': 'code-verification',
      '/password-reset': 'password-reset',
      '/new-password': 'new-password',
      '/complete-google-profile': 'complete-google-profile',
      '/submit-property': 'submit-property',
      '/kyc': 'kyc',
      '/dashboard': 'dashboard',
      '/properties': 'properties',
      '/property-detail': 'property-detail',
      '/marketplace': 'marketplace',
      '/broker-program': 'broker-program',
      '/broker-application': 'broker-application',
      '/wallet': 'wallet',
      '/role-management': 'role-management',
      '/settings/roles': 'role-management',
      '/demo': 'demo',
      '/integration-test': 'integration-test',
      '/about': 'about',
      '/contact': 'contact',
      '/partners': 'partners',
      '/liquidity-provider': 'liquidity-provider',
      '/legal': 'legal-index',
      '/legal/': 'legal-index',
      '/legal/disclaimer': 'legal-disclaimer',
      '/legal/risk-disclosure': 'legal-risk-disclosure',
      '/legal/compliance': 'legal-compliance',
      '/legal/privacy': 'legal-privacy',
      '/legal/terms': 'legal-terms',
      '/legal/cookies': 'legal-cookies',
      '/legal/aml-kyc': 'legal-aml-kyc',
      '/legal/conflicts': 'legal-conflicts',
      '/legal/complaints': 'legal-complaints',
      '/legal/security': 'legal-security',
      '/how-it-works': 'how-it-works',
      '/tokenization': 'tokenization',
      '/spv': 'spv',
      '/data-room': 'data-room',
      '/investor-guide': 'investor-guide',
      '/secondary-market': 'secondary-market',
      '/risks': 'risks',
      '/faq': 'faq',
      '/property-owner': 'property-owner',
      '/why-capimax': 'why-capimax',
      '/structure': 'structure',
      '/document-center': 'document-center',
      '/verification-center': 'verification-center',
      '/verification': 'verification-center',
      '/broker-guide': 'broker-guide',
      '/capimax-rt-guide': 'capimax-rt-guide',
      '/developer-guide': 'developer-guide',
      '/investment-guide': 'investment-guide',
      '/investment-strategies': 'investment-strategies',
      '/lp-guide': 'lp-guide',
      '/owners-guide': 'owners-guide',
      '/technology': 'technology'
    };
    // Return 'not-found' for unknown paths instead of falling back to home
    // This ensures invalid routes show 404 page, not silent redirect to home
    return routeMap[path] || 'not-found';
  };

  const [currentRoute, setCurrentRoute] = useState<Route>(getInitialRouteFromPath());
  const [history, setHistory] = useState<Route[]>([getInitialRouteFromPath()]);

  // Handle browser back/forward buttons (simplified)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const routeMap: Record<string, Route> = {
        '/': 'home',
        '/login': 'login',
        '/register': 'register',
        '/email-verification': 'email-verification',
        '/code-verification': 'code-verification',
        '/password-reset': 'password-reset',
        '/new-password': 'new-password',
        '/complete-google-profile': 'complete-google-profile',
        '/submit-property': 'submit-property',
        '/kyc': 'kyc',
        '/dashboard': 'dashboard',
        '/properties': 'properties',
        '/property-detail': 'property-detail',
        '/marketplace': 'marketplace',
        '/broker-program': 'broker-program',
        '/broker-application': 'broker-application',
        '/wallet': 'wallet',
        '/role-management': 'role-management',
        '/settings/roles': 'role-management',
        '/demo': 'demo',
        '/integration-test': 'integration-test',
        '/about': 'about',
        '/contact': 'contact',
        '/partners': 'partners',
        '/liquidity-provider': 'liquidity-provider',
        '/legal': 'legal-index',
        '/legal/': 'legal-index',
        '/legal/disclaimer': 'legal-disclaimer',
        '/legal/risk-disclosure': 'legal-risk-disclosure',
        '/legal/compliance': 'legal-compliance',
        '/legal/privacy': 'legal-privacy',
        '/legal/terms': 'legal-terms',
        '/legal/cookies': 'legal-cookies',
        '/legal/aml-kyc': 'legal-aml-kyc',
        '/legal/conflicts': 'legal-conflicts',
        '/legal/complaints': 'legal-complaints',
        '/legal/security': 'legal-security',
        '/how-it-works': 'how-it-works',
        '/tokenization': 'tokenization',
        '/spv': 'spv',
        '/data-room': 'data-room',
        '/investor-guide': 'investor-guide',
        '/secondary-market': 'secondary-market',
        '/risks': 'risks',
        '/faq': 'faq',
        '/property-owner': 'property-owner',
        '/why-capimax': 'why-capimax',
        '/structure': 'structure',
        '/document-center': 'document-center',
        '/verification-center': 'verification-center',
        '/verification': 'verification-center',
        '/broker-guide': 'broker-guide',
        '/capimax-rt-guide': 'capimax-rt-guide',
        '/developer-guide': 'developer-guide',
        '/investment-guide': 'investment-guide',
        '/investment-strategies': 'investment-strategies',
        '/lp-guide': 'lp-guide',
        '/owners-guide': 'owners-guide',
        '/technology': 'technology'
      };

      // Return 'not-found' for unknown paths - ensures 404 page shows for invalid URLs
      const route = routeMap[path] || 'not-found';
      setCurrentRoute(route);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const getQueryParam = (key: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };

  const navigate = (route: Route, params?: Record<string, string>) => {
    const pathMap: Record<Route, string> = {
      home: '/',
      login: '/login',
      register: '/register',
      'email-verification': '/email-verification',
      'code-verification': '/code-verification',
      'password-reset': '/password-reset',
      'new-password': '/new-password',
      'complete-google-profile': '/complete-google-profile',
      'submit-property': '/submit-property',
      kyc: '/kyc',
      dashboard: '/dashboard',
      properties: '/properties',
      'property-detail': '/property-detail',
      marketplace: '/marketplace',
      'broker-program': '/broker-program',
      'broker-application': '/broker-application',
      wallet: '/wallet',
      'role-management': '/role-management',
      demo: '/demo',
      'integration-test': '/integration-test',
      about: '/about',
      contact: '/contact',
      partners: '/partners',
      'liquidity-provider': '/liquidity-provider',
      'legal-index': '/legal/privacy',
      'legal-disclaimer': '/legal/disclaimer',
      'legal-risk-disclosure': '/legal/risk-disclosure',
      'legal-compliance': '/legal/compliance',
      'legal-privacy': '/legal/privacy',
      'legal-terms': '/legal/terms',
      'legal-cookies': '/legal/cookies',
      'legal-aml-kyc': '/legal/aml-kyc',
      'legal-conflicts': '/legal/conflicts',
      'legal-complaints': '/legal/complaints',
      'legal-security': '/legal/security',
      'how-it-works': '/how-it-works',
      tokenization: '/tokenization',
      spv: '/spv',
      'data-room': '/data-room',
      'investor-guide': '/investor-guide',
      'secondary-market': '/secondary-market',
      risks: '/risks',
      faq: '/faq',
      'property-owner': '/property-owner',
      'why-capimax': '/why-capimax',
      structure: '/structure',
      'document-center': '/document-center',
      'verification-center': '/verification-center',
      'broker-guide': '/broker-guide',
      'capimax-rt-guide': '/capimax-rt-guide',
      'developer-guide': '/developer-guide',
      'investment-guide': '/investment-guide',
      'investment-strategies': '/investment-strategies',
      'lp-guide': '/lp-guide',
      'owners-guide': '/owners-guide',
      technology: '/technology',
      'not-found': '/404'
    };

    setCurrentRoute(route);
    setHistory(prev => [...prev, route]);

    // Build URL with optional query parameters
    let url = pathMap[route];
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += '?' + searchParams.toString();
    }

    // Update browser URL without full page reload
    window.history.pushState({ route }, '', url);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const previousRoute = newHistory[newHistory.length - 1];
      
      setHistory(newHistory);
      setCurrentRoute(previousRoute);
      window.history.back();
    }
  };

  return (
    <RouterContext.Provider value={{ currentRoute, navigate, goBack, getQueryParam }}>
      {children}
    </RouterContext.Provider>
  );
};