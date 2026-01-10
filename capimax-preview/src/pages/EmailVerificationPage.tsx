import React, { useState, useEffect } from 'react';
import { useRouter } from '../utils/router';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/auth/AuthService';

type VerificationState = 'pending' | 'success' | 'error' | 'resending';

export const EmailVerificationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { login } = useAuth();
  const [verificationState, setVerificationState] = useState<VerificationState>('pending');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Get token and email from URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email') || 'your email';

  useEffect(() => {
    if (token) {
      handleEmailVerification(token);
    }
  }, [token]);

  const handleEmailVerification = async (verificationToken: string) => {
    try {
      setVerificationState('pending');
      const response = await AuthService.verifyEmail(verificationToken);
      setMessage(response.message || 'Email verified successfully!');
      setVerificationState('success');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('login');
      }, 3000);
    } catch (error: any) {
      console.error('Email verification failed:', error);
      setMessage(error.message || 'Email verification failed. Please try again.');
      setVerificationState('error');
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      const response = await AuthService.resendEmailVerification();
      setMessage(response.message || 'Verification email sent successfully!');
      setVerificationState('pending');
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      setMessage(error.message || 'Failed to resend verification email. Please try again.');
      setVerificationState('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const renderContent = () => {
    switch (verificationState) {
      case 'pending':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {token ? 'Verifying Your Email...' : 'Check Your Email'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {token
                  ? 'Please wait while we verify your email address.'
                  : `We've sent a verification link to ${email}. Please check your inbox and click the link to verify your account.`
                }
              </p>
            </div>
            {token && (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}
            {!token && (
              <div className="space-y-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                  <p>• Check your spam/junk folder if you don't see the email</p>
                  <p>• The verification link will expire in 24 hours</p>
                  <p>• You must verify your email before you can sign in</p>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleResendVerification}
                    isLoading={isResending}
                    disabled={isResending}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleGoToLogin}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Email Verified Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {message || 'Your email has been verified. You can now sign in to your account.'}
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting to login page...
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGoToLogin}
                className="w-full"
              >
                Continue to Login
              </Button>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Verification Failed
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {message || 'The verification link is invalid or has expired.'}
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <p>• Verification links expire after 24 hours</p>
                <p>• Make sure you clicked the complete link from your email</p>
                <p>• You can request a new verification email below</p>
              </div>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleResendVerification}
                  isLoading={isResending}
                  disabled={isResending}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Send New Verification Email
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleGoToLogin}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Verify your email address to complete your account setup"
    >
      {renderContent()}
    </AuthLayout>
  );
};