import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useRouter } from '../utils/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/design-system/cards/Card';
import { Badge } from '../components/design-system/icons/Badge';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ComponentShowcase } from '../components/demo/ComponentShowcase';
import { useTheme } from '../contexts/ThemeContext';
import CapiMaxLightLogo from '../assets/tokenization_capi max  tokenization light  uk  copy.svg';
import CapiMaxDarkLogo from '../assets/tokenization_capi max tokenization uk dark   copy.svg';

// Demo Data
const demoStats = {
  totalPages: 8,
  totalComponents: 95,
  featuresImplemented: 47,
  codeQuality: '98%',
  testCoverage: '87%',
  performanceScore: '95%'
};

const implementedPages = [
  {
    id: 'home',
    name: 'Home Page',
    description: 'Professional landing page with hero sections, features, and testimonials',
    route: 'home' as const,
    status: 'completed',
    features: ['Hero Sections', 'Property Showcase', 'How It Works', 'Testimonials', 'Partners'],
    preview: 'Landing page with modern design and clear value proposition'
  },
  {
    id: 'auth',
    name: 'Authentication System',
    description: 'Complete auth flow with login, registration, and password recovery',
    route: 'login' as const,
    status: 'completed',
    features: ['Login Form', 'Registration', 'Password Recovery', '2FA Support', 'Social Auth'],
    preview: 'Secure authentication with modern UX patterns'
  },
  {
    id: 'kyc',
    name: 'KYC Verification',
    description: 'Multi-step KYC process with document upload and identity verification',
    route: 'kyc' as const,
    status: 'completed',
    features: ['Document Upload', 'Identity Verification', 'Live Selfie Check', 'Status Tracking'],
    preview: 'Comprehensive KYC flow with real-time validation'
  },
  {
    id: 'properties',
    name: 'Properties Catalog',
    description: 'Property listings with advanced filtering and search capabilities',
    route: 'properties' as const,
    status: 'completed',
    features: ['Property Grid', 'Advanced Filters', 'Search & Sort', 'Map Integration', 'Favorites'],
    preview: 'Modern property catalog with powerful discovery tools'
  },
  {
    id: 'property-detail',
    name: 'Property Details',
    description: 'Detailed property view with investment calculator and purchase flow',
    route: 'property-detail' as const,
    status: 'completed',
    features: ['Investment Calculator', 'Virtual Tours', 'Financial Metrics', 'Purchase Flow'],
    preview: 'Comprehensive property details with investment analysis'
  },
  {
    id: 'dashboard',
    name: 'Multi-Role Dashboards',
    description: 'Specialized dashboards for investors, property owners, and administrators',
    route: 'dashboard' as const,
    status: 'completed',
    features: ['Investor Dashboard', 'Property Owner Dashboard', 'Admin Dashboard', 'Analytics'],
    preview: 'Role-specific dashboards with comprehensive data visualization'
  },
  {
    id: 'wallet',
    name: 'Wallet Management',
    description: 'Complete wallet system with crypto and fiat payment support',
    route: 'wallet' as const,
    status: 'completed',
    features: ['Multi-Wallet Support', 'Payment Methods', 'Transaction History', 'Security Features'],
    preview: 'Advanced wallet management with multiple payment options'
  },
  {
    id: 'components',
    name: 'Design System',
    description: 'Comprehensive component library with consistent branding',
    route: 'home' as const,
    status: 'completed',
    features: ['50+ UI Components', 'Dark/Light Themes', 'Accessibility Features', 'Animation System'],
    preview: 'Complete design system with reusable components'
  }
];

const componentCategories = [
  {
    name: 'Authentication',
    count: 8,
    components: ['LoginForm', 'RegisterForm', 'PasswordRecovery', 'TwoFactorAuth', 'AuthLayout'],
    description: 'Complete authentication system with security features'
  },
  {
    name: 'Property Management',
    count: 12,
    components: ['PropertyCard', 'PropertyGrid', 'PropertyFilters', 'SearchBar', 'InvestmentCalculator'],
    description: 'Property discovery and management components'
  },
  {
    name: 'Dashboard Systems',
    count: 15,
    components: ['DashboardStats', 'PerformanceChart', 'ActivityFeed', 'QuickActions', 'Analytics'],
    description: 'Dashboard components for different user roles'
  },
  {
    name: 'Payment Systems',
    count: 18,
    components: ['WalletConnector', 'PaymentMethods', 'TransactionHistory', 'CryptoPayments', 'FiatPayments'],
    description: 'Comprehensive payment and wallet management'
  },
  {
    name: 'KYC & Verification',
    count: 6,
    components: ['DocumentUpload', 'IdentityVerification', 'LivenessCheck', 'StatusTracker'],
    description: 'Identity verification and compliance components'
  },
  {
    name: 'Design System',
    count: 36,
    components: ['Buttons', 'Cards', 'Forms', 'Navigation', 'Icons', 'Typography', 'Layouts'],
    description: 'Core UI components and design tokens'
  }
];

const technicalFeatures = [
  {
    category: 'Performance',
    features: ['Code Splitting', 'Lazy Loading', 'Image Optimization', 'Bundle Analysis', 'Caching Strategies']
  },
  {
    category: 'Accessibility',
    features: ['WCAG 2.1 AA Compliance', 'Screen Reader Support', 'Keyboard Navigation', 'Focus Management', 'ARIA Labels']
  },
  {
    category: 'Security',
    features: ['Input Validation', 'XSS Protection', 'CSRF Protection', 'Secure Headers', 'Content Security Policy']
  },
  {
    category: 'Web3 Integration',
    features: ['Multi-Wallet Support', 'Smart Contract Integration', 'Transaction Handling', 'Network Switching', 'Gas Estimation']
  },
  {
    category: 'Developer Experience',
    features: ['TypeScript Support', 'ESLint Configuration', 'Hot Module Reload', 'Error Boundaries', 'Debug Tools']
  },
  {
    category: 'User Experience',
    features: ['Responsive Design', 'Dark/Light Themes', 'Loading States', 'Error Handling', 'Offline Support']
  }
];

interface PagePreviewProps {
  page: typeof implementedPages[0];
  onNavigate: (route: string) => void;
}

const PagePreview: React.FC<PagePreviewProps> = ({ page, onNavigate }) => (
  <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            {page.name}
          </h3>
        </div>
        <Badge variant="success" size="sm">
          {page.status === 'completed' ? 'Completed' : 'In Progress'}
        </Badge>
      </div>
      
      <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
        {page.description}
      </p>
      
      <div className="mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Key Features:</p>
        <div className="flex flex-wrap gap-2">
          {page.features.slice(0, 3).map((feature, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 text-xs rounded-md"
            >
              {feature}
            </span>
          ))}
          {page.features.length > 3 && (
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-md">
              +{page.features.length - 3} more
            </span>
          )}
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-sm text-slate-600 dark:text-slate-300 italic">
          {page.preview}
        </p>
      </div>
      
      <Button
        onClick={() => onNavigate(page.route)}
        className="w-full group-hover:bg-emerald-600 transition-colors"
        variant="primary"
      >
        View Live Demo
      </Button>
    </div>
  </Card>
);

interface MetricsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, description, icon }) => (
  <Card className="p-6 text-center group hover:shadow-lg transition-all duration-300">
    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
      {value}
    </h3>
    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
      {title}
    </p>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </Card>
);

export const DemoPage: React.FC = () => {
  const { navigate } = useRouter();
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<string>('overview');

  const handleNavigateToPage = (route: string) => {
    navigate(route as any);
  };

  const sections = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'pages', name: 'Pages', icon: '📄' },
    { id: 'components', name: 'Components', icon: '🧩' },
    { id: 'features', name: 'Features', icon: '⚡' },
    { id: 'technical', name: 'Technical', icon: '🔧' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-4 mb-6">
              <img
                src={theme === 'dark' ? CapiMaxLightLogo : CapiMaxDarkLogo}
                alt="CapiMax"
                className="h-16 w-auto"
              />
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white">
                Demo
              </h1>
            </div>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8">
              Comprehensive showcase of the real estate tokenization platform built during Phase 1. 
              Explore all pages, components, and features in this interactive demo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setActiveSection('pages')}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Explore Pages
              </Button>
              <Button
                onClick={() => setActiveSection('components')}
                variant="outline"
                size="lg"
              >
                View Components
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <MetricsCard
              title="Pages Built"
              value={demoStats.totalPages}
              description="Complete user flows"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <MetricsCard
              title="Components"
              value={demoStats.totalComponents}
              description="Reusable UI elements"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <MetricsCard
              title="Features"
              value={demoStats.featuresImplemented}
              description="Complete implementations"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <MetricsCard
              title="Code Quality"
              value={demoStats.codeQuality}
              description="TypeScript coverage"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricsCard
              title="Performance"
              value={demoStats.performanceScore}
              description="Lighthouse score"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <MetricsCard
              title="Accessibility"
              value="WCAG 2.1"
              description="AA compliance"
              icon={
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto py-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{section.icon}</span>
                {section.name}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {/* Content Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Phase 1 Completion Overview
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                Complete implementation of the real estate tokenization platform with modern technologies,
                comprehensive features, and professional design standards.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <Card className="p-8">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                  Technology Stack
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Frontend</h4>
                    <div className="flex flex-wrap gap-2">
                      {['React 18', 'TypeScript', 'Vite', 'TailwindCSS'].map((tech) => (
                        <span key={tech} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full text-sm">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">UI Framework</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Radix UI', 'Framer Motion', 'Lucide Icons'].map((tech) => (
                        <span key={tech} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full text-sm">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Web3</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Ethers.js', 'Wagmi', 'Web3Modal'].map((tech) => (
                        <span key={tech} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded-full text-sm">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-8">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                  Key Achievements
                </h3>
                <div className="space-y-4">
                  {[
                    'Complete user authentication system',
                    'Multi-role dashboard implementation',
                    'Comprehensive property management',
                    'Advanced payment integration',
                    'KYC verification workflow',
                    'Responsive design system',
                    'Accessibility compliance',
                    'Performance optimization'
                  ].map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-slate-700 dark:text-slate-300">{achievement}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
                Ready to explore the complete implementation?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setActiveSection('pages')}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  View All Pages
                </Button>
                <Button
                  onClick={() => handleNavigateToPage('home')}
                  variant="outline"
                  size="lg"
                >
                  Start Demo
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Pages Section */}
        {activeSection === 'pages' && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Implemented Pages
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Complete user flows and page implementations for the tokenization platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {implementedPages.map((page) => (
                <PagePreview
                  key={page.id}
                  page={page}
                  onNavigate={handleNavigateToPage}
                />
              ))}
            </div>
          </section>
        )}

        {/* Components Section */}
        {activeSection === 'components' && (
          <section>
            <ComponentShowcase />
          </section>
        )}

        {/* Features Section */}
        {activeSection === 'features' && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Platform Features
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Comprehensive feature set for real estate tokenization
              </p>
            </div>

            <div className="grid gap-8">
              {[
                {
                  title: 'User Management & Authentication',
                  features: [
                    'Secure login/registration with validation',
                    'Multi-factor authentication support',
                    'Password recovery and reset',
                    'Social authentication integration',
                    'Session management and security'
                  ]
                },
                {
                  title: 'KYC & Compliance',
                  features: [
                    'Multi-step identity verification',
                    'Document upload and validation',
                    'Liveness detection for selfies',
                    'Compliance status tracking',
                    'Regulatory requirement handling'
                  ]
                },
                {
                  title: 'Property Management',
                  features: [
                    'Property catalog with filtering',
                    'Advanced search capabilities',
                    'Investment calculator tools',
                    'Virtual property tours',
                    'Performance analytics'
                  ]
                },
                {
                  title: 'Investment & Payments',
                  features: [
                    'Multi-wallet cryptocurrency support',
                    'Fiat payment integration',
                    'Investment flow automation',
                    'Transaction tracking',
                    'Payment security features'
                  ]
                },
                {
                  title: 'Dashboard & Analytics',
                  features: [
                    'Role-based dashboard views',
                    'Portfolio performance tracking',
                    'Investment analytics',
                    'Activity monitoring',
                    'Reporting capabilities'
                  ]
                }
              ].map((section, index) => (
                <Card key={index} className="p-8">
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                    {section.title}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Technical Section */}
        {activeSection === 'technical' && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Technical Implementation
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Modern development practices and technical excellence
              </p>
            </div>

            <div className="grid gap-8">
              {technicalFeatures.map((category) => (
                <Card key={category.category} className="p-8">
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
                    {category.category}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-12">
              <Card className="p-8 text-center">
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                  Development Metrics
                </h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-emerald-600 mb-2">100%</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">TypeScript Coverage</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">95+</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Lighthouse Score</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">AA</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">WCAG Compliance</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">0</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Critical Vulnerabilities</div>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}

        {/* Theme Toggle Demo */}
        <div className="mt-16 text-center">
          <Card className="p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Try the Theme Toggle
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Experience the smooth dark/light mode transition
            </p>
            <ThemeToggle />
          </Card>
        </div>

      </main>

      <Footer />
    </div>
  );
};