import React, { useState } from 'react';
import { useRouter } from '../utils/router';
import { useAuth } from '../contexts/AuthContext';
import { DynamicUserDashboard } from '../components/dashboard/DynamicUserDashboard';
import { InvestorControlPanel } from '../components/dashboard/investor/InvestorControlPanel';
import { PropertyOwnerDashboard } from '../components/dashboard/property-owner/PropertyOwnerDashboard';
import { AdminDashboard } from '../components/dashboard/admin/AdminDashboard';
import { BrokerDashboard } from '../components/dashboard/broker/BrokerDashboard';

// Dashboard Types
export type UserRole = 'investor' | 'property_owner' | 'admin' | 'broker';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isKYCVerified: boolean;
  joinedDate: string;
}

// Dashboard Layout Component
interface DashboardLayoutProps {
  children: React.ReactNode;
  user: DashboardUser;
  currentView: string;
  onViewChange: (view: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  currentView,
  onViewChange
}) => {
  const { navigate } = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navigation items based on user role
  const getNavigationItems = (role: UserRole) => {
    const baseItems = [
      { id: 'overview', label: 'Overview', icon: '📊' },
    ];

    switch (role) {
      case 'investor':
        return [
          ...baseItems,
          { id: 'portfolio', label: 'Portfolio', icon: '💼' },
          { id: 'investments', label: 'Investments', icon: '📈' },
          { id: 'transactions', label: 'Transactions', icon: '💳' },
          { id: 'income', label: 'Income', icon: '💰' },
          { id: 'analytics', label: 'Analytics', icon: '📊' },
        ];
      case 'property_owner':
        return [
          ...baseItems,
          { id: 'properties', label: 'My Properties', icon: '🏢' },
          { id: 'tokenization', label: 'Tokenization', icon: '🪙' },
          { id: 'revenue', label: 'Revenue', icon: '💸' },
          { id: 'investors', label: 'Investors', icon: '👥' },
          { id: 'documents', label: 'Documents', icon: '📄' },
        ];
      case 'admin':
        return [
          ...baseItems,
          { id: 'users', label: 'User Management', icon: '👤' },
          { id: 'properties-admin', label: 'Properties', icon: '🏠' },
          { id: 'transactions-admin', label: 'Transactions', icon: '💎' },
          { id: 'platform', label: 'Platform Metrics', icon: '📈' },
          { id: 'system', label: 'System Health', icon: '⚙️' },
        ];
      case 'broker':
        return [
          ...baseItems,
          { id: 'referrals', label: 'Referrals', icon: '🤝' },
          { id: 'commissions', label: 'Commissions', icon: '💰' },
          { id: 'performance', label: 'Performance', icon: '📊' },
          { id: 'marketing-materials', label: 'Marketing Materials', icon: '📄' },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems(user.role);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-slate-800 border-r border-neutral-200 dark:border-slate-700 transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-neutral-900 dark:text-slate-100">
                  CapiMax
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-lg">{sidebarOpen ? '⟨' : '⟩'}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-neutral-600 hover:bg-neutral-50 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.name.charAt(0)}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-slate-100 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-slate-400 capitalize">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-slate-100 capitalize">
                {currentView.replace('-', ' ')} Dashboard
              </h1>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-xl">🔔</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Settings */}
              <button 
                onClick={() => navigate('home')}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              >
                Exit Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Main Dashboard Page Component
export const DashboardPage: React.FC = () => {
  const [currentView, setCurrentView] = useState('overview');
  const { state } = useAuth();
  const { navigate } = useRouter();
  const authUser = state.user;

  // Redirect to login if not authenticated
  React.useEffect(() => {
    console.log('🔍 Dashboard auth check:', { isLoading: state.isLoading, isAuthenticated: state.isAuthenticated, user: !!state.user });
    if (!state.isLoading && !state.isAuthenticated) {
      console.log('⚠️ Redirecting from dashboard to login - not authenticated');
      navigate('login');
    }
  }, [state.isLoading, state.isAuthenticated, navigate]);

  // Show loading while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!state.isAuthenticated || !authUser) {
    return null;
  }
  
  // Map auth user to dashboard user format
  const user: DashboardUser = authUser ? {
    id: authUser.id,
    name: `${authUser.first_name} ${authUser.last_name}`.trim() || 'User',
    email: authUser.email,
    role: authUser.role as UserRole,
    avatar: undefined,
    isKYCVerified: authUser.kyc_status === 'approved',
    joinedDate: authUser.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  } : {
    id: '1',
    name: 'Guest User',
    email: 'guest@example.com',
    role: 'investor' as UserRole,
    avatar: undefined,
    isKYCVerified: false,
    joinedDate: new Date().toISOString().split('T')[0]
  };

  const renderDashboardContent = () => {
    // For overview, use the new DynamicUserDashboard
    if (currentView === 'overview') {
      return <DynamicUserDashboard userRole={user.role} />;
    }

    // For investor role, use the new InvestorControlPanel for all investor-specific views
    if (user.role === 'investor') {
      return <InvestorControlPanel currentView={currentView} />;
    }

    // Render role-specific dashboard components for other roles
    const role = user.role;
    
    switch (role) {
      case 'property_owner':
        return <PropertyOwnerDashboard currentView={currentView} />;
      case 'admin':
        return <AdminDashboard currentView={currentView} />;
      case 'broker':
        return <BrokerDashboard currentView={currentView} />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="text-4xl mb-4 block">❓</span>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
                Unknown User Role
              </h3>
              <p className="text-neutral-500 dark:text-slate-400">
                Please contact support if this error persists
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout 
      user={user} 
      currentView={currentView} 
      onViewChange={setCurrentView}
    >
      {renderDashboardContent()}
    </DashboardLayout>
  );
};