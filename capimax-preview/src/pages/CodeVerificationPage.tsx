import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, RefreshCw, ArrowLeft, Mail } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/auth/AuthService';
import { useRouter } from '../utils/router';

type VerificationState = 'pending' | 'verifying' | 'success' | 'error' | 'resending';

export const CodeVerificationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { login } = useAuth();

  const [verificationState, setVerificationState] = useState<VerificationState>('pending');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate('register');
      return;
    }
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (verificationCode[index]) {
        // Clear current input if it has value
        const newCode = [...verificationCode];
        newCode[index] = '';
        setVerificationCode(newCode);
      } else if (index > 0) {
        // Move to previous input and clear it
        const newCode = [...verificationCode];
        newCode[index - 1] = '';
        setVerificationCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        if (digits.length === 6) {
          const newCode = digits.split('');
          setVerificationCode(newCode);
          // Focus last input
          if (inputRefs.current[5]) {
            inputRefs.current[5].focus();
          }
        }
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      const newCode = digits.split('');
      setVerificationCode(newCode);
      // Focus last input
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
    }
  };

  const isCodeComplete = verificationCode.every(digit => digit !== '');

  const handleVerifyCode = async () => {
    if (!isCodeComplete) return;

    try {
      setVerificationState('verifying');
      setMessage('');

      const code = verificationCode.join('');

      // Call the verification endpoint that returns JWT tokens
      const response = await AuthService.verifyEmailCode(email, code);

      console.log('🔍 Full verification response:', response);
      console.log('🔍 Response structure:', {
        hasUser: !!response.user,
        hasToken: !!response.token,
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken
      });

      // The response should contain user and tokens for auto-login
      if (response.user && response.token) {
        setVerificationState('success');
        setMessage('Email verified successfully! Logging you in...');

        // Auto-login the user
        // Store the token in the AuthService
        const loginResponse = {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken
        };

        // Manually set the auth state by calling login with the returned data
        await login(email, '', undefined, loginResponse);

        // Redirect to dashboard after successful login
        setTimeout(() => {
          navigate('dashboard');
        }, 2000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Code verification failed:', error);
      console.error('Error structure:', {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details
      });

      // Extract the most relevant error message
      let errorMessage = 'Invalid verification code. Please try again.';

      if (error.details?.non_field_errors?.length > 0) {
        errorMessage = error.details.non_field_errors[0];
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage(errorMessage);
      setVerificationState('error');

      // Clear the code and focus first input
      setVerificationCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);
      setVerificationState('resending');

      // Call resend endpoint (we'll need to add this)
      const response = await AuthService.resendEmailVerification();
      setMessage(response.message || 'A new verification code has been sent to your email!');
      setVerificationState('pending');
      setTimeLeft(300); // Reset countdown

      // Clear current code
      setVerificationCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (error: any) {
      console.error('Failed to resend verification code:', error);
      setMessage(error.message || 'Failed to resend verification code. Please try again.');
      setVerificationState('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('login');
  };

  const handleGoBack = () => {
    navigate('register');
  };

  const renderContent = () => {
    switch (verificationState) {
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
                {message || 'Your email has been verified and you are being logged in.'}
              </p>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Redirecting to your dashboard...
            </div>
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
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
                {message || 'The verification code is invalid or has expired.'}
              </p>
            </div>

            {/* Code input for retry */}
            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={ref => inputRefs.current[index] = ref}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleVerifyCode}
                disabled={!isCodeComplete || verificationState === 'verifying'}
                isLoading={verificationState === 'verifying'}
                className="w-full"
              >
                {verificationState === 'verifying' ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleResendCode}
                isLoading={isResending}
                disabled={isResending || timeLeft > 240} // Allow resend after 1 minute
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Send New Code
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Registration
              </Button>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Verify Your Email
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                We've sent a 6-digit verification code to
              </p>
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
              </div>
            </div>

            {message && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">{message}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                  Enter the 6-digit code
                </label>
                <div className="flex justify-center gap-3">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={ref => inputRefs.current[index] = ref}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all"
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleVerifyCode}
                disabled={!isCodeComplete || verificationState === 'verifying'}
                isLoading={verificationState === 'verifying'}
                className="w-full"
              >
                {verificationState === 'verifying' ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <p>• Check your spam/junk folder if you don't see the email</p>
                <p>• The verification code expires in {formatTime(timeLeft)}</p>
                <p>• You can request a new code if needed</p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleResendCode}
                  isLoading={isResending}
                  disabled={isResending || timeLeft > 240} // Allow resend after 1 minute
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {timeLeft > 240 ? `Resend in ${formatTime(timeLeft - 240)}` : 'Send New Code'}
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleGoBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Registration
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleGoToLogin}
                    className="flex-1"
                  >
                    Already Verified? Sign In
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Enter the 6-digit code we sent to your email to complete your registration"
    >
      {renderContent()}
    </AuthLayout>
  );
};