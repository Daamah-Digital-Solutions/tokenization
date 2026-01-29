import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  AlertTriangle,
  Shield,
  Lock,
  FileCheck,
  Cookie,
  Users,
  Scale,
  MessageSquare,
  ShieldCheck,
  Printer,
  ArrowUp,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

interface LegalNavItem {
  id: string;
  title: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const legalNavItems: LegalNavItem[] = [
  { id: 'disclaimer', title: 'Platform Disclaimer', path: '/legal/disclaimer', icon: FileText },
  { id: 'risk-disclosure', title: 'Risk Disclosure', path: '/legal/risk-disclosure', icon: AlertTriangle },
  { id: 'compliance', title: 'Compliance Overview', path: '/legal/compliance', icon: Shield },
  { id: 'privacy', title: 'Privacy Policy', path: '/legal/privacy', icon: Lock },
  { id: 'terms', title: 'Terms & Conditions', path: '/legal/terms', icon: FileCheck },
  { id: 'cookies', title: 'Cookies Policy', path: '/legal/cookies', icon: Cookie },
  { id: 'aml-kyc', title: 'AML/KYC/KYB Policy', path: '/legal/aml-kyc', icon: Users },
  { id: 'conflicts', title: 'Conflicts of Interest', path: '/legal/conflicts', icon: Scale },
  { id: 'complaints', title: 'Complaints Procedure', path: '/legal/complaints', icon: MessageSquare },
  { id: 'security', title: 'Security Policy', path: '/legal/security', icon: ShieldCheck },
];

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
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

  const handlePrint = () => {
    window.print();
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
              <span className="font-medium">Legal Documents</span>
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
                    Legal Documents
                  </h3>
                  <nav className="space-y-1">
                    {legalNavItems.map((item) => {
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
              <div className="px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      {title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Last Updated: {lastUpdated}
                    </p>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-8 py-8">
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-h2:text-xl prose-h2:font-bold prose-h2:text-slate-900 dark:prose-h2:text-white prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-800 dark:prose-h3:text-slate-200 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-strong:text-slate-900 dark:prose-strong:text-white prose-ul:my-4 prose-li:my-1">
                  {children}
                </div>
              </div>

              {/* Footer Notice */}
              <div className="px-6 sm:px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  This document is part of Capimax RT's legal framework.
                  For questions, please contact{' '}
                  <a href="mailto:legal@capimax.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    legal@capimax.com
                  </a>
                </p>
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
            className="fixed bottom-8 right-8 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg transition-colors z-50 print:hidden"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <Footer />

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .prose {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
