import React, { useState } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { useRouter } from '../utils/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DynamicUserDashboard } from '../components/dashboard/DynamicUserDashboard';
import { InvestorControlPanel } from '../components/dashboard/investor/InvestorControlPanel';
import { PropertyOwnerDashboard } from '../components/dashboard/property-owner/PropertyOwnerDashboard';
import { AdminDashboard } from '../components/dashboard/admin/AdminDashboard';
import { BrokerDashboard } from '../components/dashboard/broker/BrokerDashboard';
import { RoleSwitcher } from '../components/dashboard/RoleSwitcher';
import CapiMaxLightLogo from '../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../assets/tokenization_capi max tokenization uk dark   copy.svg';

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
  onRoleSwitch?: (newRole: UserRole) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  currentView,
  onViewChange,
  onRoleSwitch
}) => {
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
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
          { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
          { id: 'transactions', label: 'Transactions', icon: '💳' },
          { id: 'wallet', label: 'Wallet', icon: '💰' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
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

  // Handle navigation item click with auto-close for mobile
  const handleNavigationClick = (itemId: string) => {
    // All navigation items now go through the dashboard view change
    onViewChange(itemId);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth < 768) { // md breakpoint
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-[80%] md:w-64' : 'w-16'} bg-white dark:bg-slate-800 border-r border-neutral-200 dark:border-slate-700 transition-all duration-300 flex flex-col ${sidebarOpen ? 'fixed inset-y-0 left-0 md:relative z-50 md:z-auto' : 'hidden md:flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <img
                  src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
                  alt="CapiMax"
                  className="h-8 w-auto"
                />
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
              onClick={() => handleNavigationClick(item.id)}
              className={`w-full flex items-center ${sidebarOpen ? 'space-x-3 px-3' : 'justify-center px-2'} py-2 rounded-lg transition-colors ${
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
          <div className={`flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'}`}>
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
        <header className="bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 mr-3 text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors md:hidden"
                title="Open menu"
              >
                <span className="text-lg">☰</span>
              </button>

              {/* Mobile: CapiMax logo */}
              <div className="flex items-center md:hidden">
                <img
                  src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
                  alt="CapiMax"
                  className="h-8 w-auto"
                />
              </div>

              {/* Desktop: Page title and welcome message */}
              <div className="min-w-0 flex-1 hidden md:block">
                <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-slate-100 capitalize truncate">
                  {currentView.replace('-', ' ')} Dashboard
                </h1>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Role Switcher */}
              <RoleSwitcher onRoleSwitch={onRoleSwitch} />

              {/* Notifications Icon */}
              <button
                className="p-2 text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>

              {/* Theme Toggle Icon */}
              <button
                onClick={toggleTheme}
                className="p-2 text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Exit Dashboard */}
              <button
                onClick={() => navigate('home')}
                className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors hidden sm:inline-flex"
              >
                Exit Dashboard
              </button>
              {/* Mobile Exit Button */}
              <button
                onClick={() => navigate('home')}
                className="p-2 text-neutral-600 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors sm:hidden"
                title="Exit Dashboard"
              >
                <span className="text-lg">←</span>
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
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const { state, refreshUser } = useAuth();
  const { navigate } = useRouter();
  const authUser = state.user;

  // Initialize active role with user's default role and sync with auth updates
  React.useEffect(() => {
    if (authUser) {
      // Always sync activeRole with authUser.role to handle role switches properly
      setActiveRole(authUser.role as UserRole);
    }
  }, [authUser?.role]); // Depend on authUser.role specifically

  // Handle role switch from RoleSwitcher component
  const handleRoleSwitch = async (newRole: UserRole) => {
    console.log('🔄 Role switch initiated:', { from: activeRole, to: newRole });
    setActiveRole(newRole);
    setCurrentView('overview'); // Reset to overview when switching roles

    // Refresh the user data from AuthContext to sync the backend state
    // This ensures the dashboard stays in sync without page reload
    try {
      if (refreshUser) {
        console.log('🔄 Refreshing user data after role switch...');
        await refreshUser();
        console.log('✅ User data refreshed successfully');
      }
    } catch (error) {
      console.warn('❌ Could not refresh user data after role switch:', error);
    }
  };

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
  
  // Map auth user to dashboard user format, using active role for multi-role support
  const user: DashboardUser = authUser ? {
    id: authUser.id,
    name: `${authUser.first_name} ${authUser.last_name}`.trim() || 'User',
    email: authUser.email,
    role: activeRole || (authUser.role as UserRole), // Use active role if available, fallback to user's default role
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

  const renderDashboardContent = React.useCallback(() => {
    // Use activeRole for immediate updates, fallback to user.role for consistency
    const effectiveRole = activeRole || user.role;
    console.log('📊 Rendering dashboard content:', {
      activeRole,
      userRole: user.role,
      effectiveRole,
      currentView
    });

    // For overview, use the new DynamicUserDashboard
    if (currentView === 'overview') {
      return <DynamicUserDashboard userRole={effectiveRole} />;
    }

    // For investor role, use the new InvestorControlPanel for all investor-specific views
    if (effectiveRole === 'investor') {
      return <InvestorControlPanel currentView={currentView} />;
    }

    // Render role-specific dashboard components for other roles
    switch (effectiveRole) {
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
  }, [activeRole, user.role, currentView]);

  return (
    <DashboardLayout
      user={user}
      currentView={currentView}
      onViewChange={setCurrentView}
      onRoleSwitch={handleRoleSwitch}
    >
      <div key={`dashboard-${activeRole}-${currentView}`}>
        {renderDashboardContent()}
      </div>
    </DashboardLayout>
  );
};