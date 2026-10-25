import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useRouter } from '../utils/router';
import { useTranslation } from 'react-i18next';

export const RegisterPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation('ui');

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
      title={t('registerPage.layoutTitle')}
      subtitle={t('registerPage.layoutSubtitle')}
    >
      <RegisterForm
        onSignIn={handleGoToLogin}
        onSuccess={handleSuccess}
      />
    </AuthLayout>
  );
};