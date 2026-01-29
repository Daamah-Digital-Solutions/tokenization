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

  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Print-only header */}
      <div className="print-header hidden print:block">
        <h1 className="text-2xl font-bold text-center mb-2">Capimax RT</h1>
        <p className="text-center text-sm text-gray-600 mb-8">Capimax Real Estate Tokenization Platform</p>
      </div>

      <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-500 print:bg-white">
        {/* Hide navbar in print */}
        <div className="print:hidden">
          <Navbar />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 print:pt-0 print:pb-0 print:px-0 print:max-w-none">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 print:block">

            {/* Mobile Sidebar Toggle - Hidden in print */}
            <div className="lg:hidden mb-6 print:hidden">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="font-medium">Legal Documents</span>
              </button>
            </div>

            {/* Sidebar Navigation - Hidden in print */}
            <AnimatePresence>
              {(sidebarOpen || window.innerWidth >= 1024) && (
                <motion.aside
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`lg:col-span-3 print:hidden ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
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
            <main className="lg:col-span-9 print:col-span-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
              >
                {/* Header */}
                <div className="px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      {title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Last Updated: {lastUpdated}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="legal-content px-6 sm:px-8 py-8 print:px-0 print:py-6">
                  {children}
                </div>

                {/* Footer Notice - Hidden in print */}
                <div className="px-6 sm:px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 print:hidden">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    This document is part of Capimax RT's legal framework.
                    For questions, please contact{' '}
                    <a href="mailto:legal@capimaxrt.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      legal@capimaxrt.com
                    </a>
                  </p>
                </div>
              </motion.div>
            </main>
          </div>
        </div>

        {/* Back to Top Button - Hidden in print */}
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

        {/* Footer - Hidden in print */}
        <div className="print:hidden">
          <Footer />
        </div>
      </div>

      {/* Professional Legal Document Styles */}
      <style>{`
        /* Screen Styles for Legal Content */
        .legal-content {
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.8;
          color: #1e293b;
        }

        .dark .legal-content {
          color: #e2e8f0;
        }

        .legal-content .legal-section {
          margin-bottom: 2rem;
        }

        .legal-content .legal-intro {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border-left: 4px solid #10b981;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .dark .legal-content .legal-intro {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
        }

        .legal-content .legal-emphasis {
          font-weight: 600;
          padding: 1rem 1.25rem;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 0 0.5rem 0.5rem 0;
          margin-top: 1.5rem;
        }

        .dark .legal-content .legal-emphasis {
          background: rgba(245, 158, 11, 0.1);
        }

        .legal-content h2 {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .dark .legal-content h2 {
          color: #f8fafc;
          border-bottom-color: #334155;
        }

        .legal-content h3 {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .dark .legal-content h3 {
          color: #e2e8f0;
        }

        .legal-content p {
          margin-bottom: 1rem;
          text-align: justify;
        }

        .legal-content ul {
          margin: 1rem 0 1.5rem 0;
          padding-left: 0;
          list-style: none;
        }

        .legal-content ul li {
          position: relative;
          padding-left: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.7;
        }

        .legal-content ul li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6rem;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
        }

        /* Print Styles */
        @media print {
          @page {
            size: A4;
            margin: 2cm 2.5cm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-size: 11pt;
            line-height: 1.5;
            color: #000 !important;
            background: #fff !important;
          }

          .print-header {
            display: block !important;
            margin-bottom: 1cm;
            border-bottom: 2pt solid #000;
            padding-bottom: 0.5cm;
          }

          .print\\:hidden {
            display: none !important;
          }

          .legal-content {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
          }

          .legal-content .legal-intro {
            font-size: 11pt;
            font-weight: bold;
            background: none;
            border-left: 3pt solid #000;
            padding: 0.3cm 0.5cm;
            margin-bottom: 0.5cm;
          }

          .legal-content .legal-emphasis {
            font-weight: bold;
            background: none;
            border-left: 3pt solid #000;
            padding: 0.3cm 0.5cm;
            margin-top: 0.5cm;
          }

          .legal-content h2 {
            font-size: 13pt;
            font-weight: bold;
            color: #000;
            margin-top: 0.8cm;
            margin-bottom: 0.4cm;
            padding-bottom: 0.2cm;
            border-bottom: 1pt solid #000;
            page-break-after: avoid;
          }

          .legal-content h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #000;
            margin-top: 0.5cm;
            margin-bottom: 0.3cm;
            page-break-after: avoid;
          }

          .legal-content p {
            margin-bottom: 0.4cm;
            text-align: justify;
            orphans: 3;
            widows: 3;
          }

          .legal-content ul {
            margin: 0.3cm 0 0.5cm 0;
            padding-left: 0;
          }

          .legal-content ul li {
            padding-left: 0.8cm;
            margin-bottom: 0.2cm;
            page-break-inside: avoid;
          }

          .legal-content ul li::before {
            width: 5pt;
            height: 5pt;
            background: #000;
            top: 0.5em;
          }

          .legal-content .legal-section {
            page-break-inside: avoid;
          }

          /* Ensure headings don't get orphaned */
          h2, h3 {
            page-break-after: avoid;
          }

          /* Keep lists together */
          ul, ol {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
};
