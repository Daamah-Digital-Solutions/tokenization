import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface KYCGateProps {
  action: string; // e.g., "deposit funds", "make investments", etc.
  onProceed?: () => void; // Called when user can proceed (KYC approved)
  children?: React.ReactNode; // Content to show when KYC is approved
}

export const KYCGate: React.FC<KYCGateProps> = ({
  action,
  onProceed,
  children
}) => {
  const { state } = useAuth();
  const { navigate } = useRouter();
  const user = state.user;

  // If not authenticated, redirect to login
  if (!user) {
    navigate('login');
    return null;
  }

  const kycStatus = user.kyc_status || 'not_verified';

  // If user is KYC approved, render children or call onProceed
  if (kycStatus === 'approved') {
    if (children) {
      return <>{children}</>;
    }
    if (onProceed) {
      onProceed();
    }
    return null;
  }

  // Show KYC gate based on status
  const renderKYCGate = () => {
    switch (kycStatus) {
      case 'not_verified':
        return (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Identity Verification Required
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  To {action}, you need to complete identity verification. This helps us keep your account secure and comply with financial regulations.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('kyc')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Start Identity Verification
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('dashboard')}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-left">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">
                  What you'll need:
                </h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Government-issued ID (passport, driver's license)</li>
                  <li>• Proof of address (utility bill, bank statement)</li>
                  <li>• Clear selfie photo</li>
                </ul>
              </div>
            </div>
          </Card>
        );

      case 'pending_review':
        return (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Verification Under Review
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Your verification is still under review. We will notify you by email once it is complete. You cannot {action} until your identity is verified.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('kyc')}
                  variant="outline"
                  className="w-full"
                >
                  Check Verification Status
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('dashboard')}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">
                      Review in Progress
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Our compliance team typically completes reviews within 24-48 hours. You'll receive an email notification once complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'rejected':
        return (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Verification Required
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Your previous verification submission was not approved. Please review the feedback and submit new documents to {action}.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('kyc')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Resubmit Documents
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('dashboard')}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-1 text-sm">
                      Resubmission Required
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Please check your verification status for specific feedback and resubmit the required documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return (
          <Card className="max-w-md mx-auto p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Verification Status Unknown
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  We couldn't determine your verification status. Please try again or contact support.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('kyc')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Check Verification Status
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('dashboard')}
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {renderKYCGate()}
      </motion.div>
    </div>
  );
};

export default KYCGate;