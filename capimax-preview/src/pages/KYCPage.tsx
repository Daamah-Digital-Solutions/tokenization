import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KYCWizard, KYCStatusTracker, type KYCData, type DocumentStatus } from '../components/kyc';
import { useRouter } from '../utils/router';

type KYCPageMode = 'wizard' | 'status';

export const KYCPage: React.FC = () => {
  const { navigate } = useRouter();
  const [mode, setMode] = useState<KYCPageMode>('wizard');
  const [kycData, setKYCData] = useState<KYCData | null>(null);

  // Mock existing KYC status for demonstration
  const [existingKYCStatus] = useState<{
    status: 'not_started' | 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
    documents: DocumentStatus[];
    submittedAt?: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
  }>({
    status: 'processing',
    documents: [
      {
        type: 'passport',
        name: 'Passport',
        status: 'approved',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        type: 'utility_bill',
        name: 'Utility Bill',
        status: 'processing',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        type: 'selfie',
        name: 'Live Selfie',
        status: 'approved',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  const handleKYCComplete = (data: KYCData) => {
    setKYCData(data);
    setMode('status');
    console.log('KYC completed:', data);
  };

  const handleRetryKYC = () => {
    setMode('wizard');
    setKYCData(null);
  };

  const handleContactSupport = () => {
    console.log('Opening support chat...');
    // In a real app, this would open a support chat or contact form
  };

  const renderNavigation = () => (
    <div className="mb-8">
      <nav className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <button 
          onClick={() => navigate('dashboard')} 
          className="hover:text-emerald-500 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">
          Identity Verification
        </span>
      </nav>
    </div>
  );

  const renderModeToggle = () => (
    <div className="flex justify-center mb-8">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex">
        <button
          onClick={() => setMode('wizard')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'wizard'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Start Verification
        </button>
        <button
          onClick={() => setMode('status')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mode === 'status'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Check Status
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        {renderNavigation()}

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Identity Verification
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Verify your identity to unlock full access to our real estate tokenization platform
          </p>
        </motion.div>

        {/* Mode Toggle (for demo purposes) */}
        {renderModeToggle()}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {mode === 'wizard' ? (
            <KYCWizard
              onComplete={handleKYCComplete}
              userType="investor"
              className="mx-auto"
            />
          ) : (
            <div className="max-w-2xl mx-auto">
              <KYCStatusTracker
                status={existingKYCStatus.status}
                documents={existingKYCStatus.documents}
                submittedAt={existingKYCStatus.submittedAt}
                reviewedAt={existingKYCStatus.reviewedAt}
                rejectionReason={existingKYCStatus.rejectionReason}
                nextSteps={
                  existingKYCStatus.status === 'processing'
                    ? [
                        'Our compliance team is reviewing your documents',
                        'You will receive an email notification once review is complete',
                        'Typical processing time is 24-48 hours'
                      ]
                    : existingKYCStatus.status === 'rejected'
                    ? [
                        'Please review the rejection feedback above',
                        'Upload new documents addressing the issues',
                        'Resubmit your verification for review'
                      ]
                    : existingKYCStatus.status === 'approved'
                    ? [
                        'Your identity verification is complete',
                        'You now have full access to all platform features',
                        'You can start investing in tokenized real estate'
                      ]
                    : []
                }
                onRetry={handleRetryKYC}
                onContact={handleContactSupport}
              />
            </div>
          )}
        </motion.div>

        {/* Information Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Secure & Compliant
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              All data is encrypted and stored securely following financial industry standards and regulatory requirements.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Fast Processing
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Most verifications are completed within 24-48 hours with real-time status updates.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              24/7 Support
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Our support team is available around the clock to help with any verification questions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};