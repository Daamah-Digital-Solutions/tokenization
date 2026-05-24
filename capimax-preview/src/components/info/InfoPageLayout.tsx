import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Layers,
  Shield,
  FolderOpen,
  Users,
  RefreshCcw,
  AlertTriangle,
  HelpCircle,
  Building2,
  ArrowUp,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';

interface InfoPageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface InfoNavItem {
  id: string;
  title: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const infoNavItems: InfoNavItem[] = [
  { id: 'how-it-works', title: 'How It Works', path: '/how-it-works', icon: BookOpen },
  { id: 'tokenization', title: 'What is Tokenization', path: '/tokenization', icon: Layers },
  { id: 'spv', title: 'What is SPV', path: '/spv', icon: Shield },
  { id: 'data-room', title: 'Data Room', path: '/data-room', icon: FolderOpen },
  { id: 'investor-guide', title: 'Co-Owner Guide', path: '/investor-guide', icon: Users },
  { id: 'secondary-market', title: 'Secondary Market', path: '/secondary-market', icon: RefreshCcw },
  { id: 'risks', title: 'Risks & Disclosures', path: '/risks', icon: AlertTriangle },
  { id: 'faq', title: 'FAQ', path: '/faq', icon: HelpCircle },
  { id: 'property-owner', title: 'For Property Owners', path: '/property-owner', icon: Building2 },
];

export const InfoPageLayout: React.FC<InfoPageLayoutProps> = ({
  title,
  subtitle,
  children
}) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = window.location.pathname;

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-500">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">

          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="font-medium">Learn More</span>
            </button>
          </div>

          {/* Sidebar Navigation */}
          <AnimatePresence>
            {(sidebarOpen || window.innerWidth >= 1024) && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`lg:col-span-3 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
              >
                <div className="sticky top-24 space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 pb-3 mb-2 border-b border-slate-200 dark:border-slate-700">
                    Learn About Capimax RT
                  </h3>
                  <nav className="space-y-1">
                    {infoNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPath === item.path;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigateToPage(item.path);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                            isActive
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          }`} />
                          <span className="text-sm truncate">{item.title}</span>
                          {isActive && (
                            <ChevronRight className="w-4 h-4 ml-auto text-emerald-500 dark:text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <main className="lg:col-span-9">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 sm:px-8 py-8 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="info-content px-6 sm:px-8 py-8">
                {children}
              </div>
            </motion.div>
          </main>
        </div>
      </div>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg transition-colors z-50"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <Footer />

      {/* Info Page Styles */}
      <style>{`
        .info-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.7;
          color: #1e293b;
        }

        .dark .info-content {
          color: #e2e8f0;
        }

        .info-content .info-section {
          margin-bottom: 2.5rem;
        }

        .info-content .info-intro {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border-left: 4px solid #10b981;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .dark .info-content .info-intro {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
        }

        .info-content .info-highlight {
          padding: 1rem 1.25rem;
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 0 0.5rem 0.5rem 0;
          margin: 1.5rem 0;
        }

        .dark .info-content .info-highlight {
          background: rgba(59, 130, 246, 0.1);
        }

        .info-content .info-warning {
          font-weight: 500;
          padding: 1rem 1.25rem;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 0 0.5rem 0.5rem 0;
          margin: 1.5rem 0;
        }

        .dark .info-content .info-warning {
          background: rgba(245, 158, 11, 0.1);
        }

        .info-content h2 {
          font-size: 1.375rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .dark .info-content h2 {
          color: #f8fafc;
          border-bottom-color: #334155;
        }

        .info-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .dark .info-content h3 {
          color: #e2e8f0;
        }

        .info-content p {
          margin-bottom: 1rem;
        }

        .info-content ul {
          margin: 1rem 0 1.5rem 0;
          padding-left: 0;
          list-style: none;
        }

        .info-content ul li {
          position: relative;
          padding-left: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }

        .info-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.55rem;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        .info-content ol {
          margin: 1rem 0 1.5rem 0;
          padding-left: 0;
          list-style: none;
          counter-reset: step-counter;
        }

        .info-content ol li {
          position: relative;
          padding-left: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.6;
          counter-increment: step-counter;
        }

        .info-content ol li::before {
          content: counter(step-counter);
          position: absolute;
          left: 0;
          top: 0;
          width: 1.75rem;
          height: 1.75rem;
          background: #10b981;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-content .step-title {
          font-weight: 600;
          color: #0f172a;
          display: block;
          margin-bottom: 0.25rem;
        }

        .dark .info-content .step-title {
          color: #f8fafc;
        }

        .info-content .check-list li::before {
          content: '✓';
          background: #10b981;
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-content .cross-list li::before {
          content: '✗';
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-content .link-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #10b981;
          color: white;
          font-weight: 500;
          border-radius: 0.5rem;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
          margin-top: 1rem;
          margin-right: 0.5rem;
        }

        .info-content .link-button:hover {
          background: #059669;
        }

        .info-content .link-button-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: #10b981;
          font-weight: 500;
          border-radius: 0.5rem;
          border: 2px solid #10b981;
          transition: all 0.2s;
          cursor: pointer;
          margin-top: 1rem;
          margin-right: 0.5rem;
        }

        .info-content .link-button-outline:hover {
          background: #10b981;
          color: white;
        }
      `}</style>
    </div>
  );
};
