import React, { createContext, useContext, useState, useEffect } from 'react';

type Route = 'home' | 'login' | 'register' | 'kyc' | 'dashboard' | 'properties' | 'property-detail' | 'wallet' | 'role-management' | 'demo' | 'integration-test' | 'about' | 'contact';

interface RouterContextType {
  currentRoute: Route;
  navigate: (route: Route) => void;
  goBack: () => void;
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
  // Get initial route from current URL path
  const getInitialRouteFromPath = (): Route => {
    const path = window.location.pathname;
    const routeMap: Record<string, Route> = {
      '/': 'home',
      '/login': 'login',
      '/register': 'register',
      '/kyc': 'kyc',
      '/dashboard': 'dashboard',
      '/properties': 'properties',
      '/property-detail': 'property-detail',
      '/wallet': 'wallet',
      '/role-management': 'role-management',
      '/settings/roles': 'role-management',
      '/demo': 'demo',
      '/integration-test': 'integration-test',
      '/about': 'about',
      '/contact': 'contact'
    };
    return routeMap[path] || initialRoute;
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
        '/kyc': 'kyc',
        '/dashboard': 'dashboard',
        '/properties': 'properties',
        '/property-detail': 'property-detail',
        '/wallet': 'wallet',
        '/role-management': 'role-management',
        '/settings/roles': 'role-management',
        '/demo': 'demo',
        '/integration-test': 'integration-test',
        '/about': 'about',
        '/contact': 'contact'
      };
      
      const route = routeMap[path] || 'home';
      setCurrentRoute(route);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: Route) => {
    const pathMap: Record<Route, string> = {
      home: '/',
      login: '/login',
      register: '/register',
      kyc: '/kyc',
      dashboard: '/dashboard',
      properties: '/properties',
      'property-detail': '/property-detail',
      wallet: '/wallet',
      'role-management': '/role-management',
      demo: '/demo',
      'integration-test': '/integration-test',
      about: '/about',
      contact: '/contact'
    };

    setCurrentRoute(route);
    setHistory(prev => [...prev, route]);
    
    // Update browser URL without full page reload
    window.history.pushState({ route }, '', pathMap[route]);
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
    <RouterContext.Provider value={{ currentRoute, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};