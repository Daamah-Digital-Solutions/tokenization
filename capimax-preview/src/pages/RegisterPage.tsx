import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useRouter } from '../utils/router';

export const RegisterPage: React.FC = () => {
  const { navigate } = useRouter();

  const handleSuccess = (email: string) => {
    // Redirect directly to code verification with email parameter
    navigate('code-verification');
    // Update URL to include email parameter
    window.history.replaceState({}, '', `/code-verification?email=${encodeURIComponent(email)}`);
  };

  const handleGoToLogin = () => {
    navigate('login');
  };

  return (
    <AuthLayout
      title="Join Capimax"
      subtitle="Create your account and start owning tokenized real estate with as little as $100"
    >
      <RegisterForm
        onSignIn={handleGoToLogin}
        onSuccess={handleSuccess}
      />
    </AuthLayout>
  );
};