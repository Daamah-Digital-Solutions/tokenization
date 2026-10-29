import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CookiesPolicyPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة ملفات تعريف الارتباط' : isFr ? 'Politique relative aux cookies' : 'Cookies Policy'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تستخدم كابي مكس RT ملفات تعريف الارتباط (الكوكيز) والتقنيات المشابهة لتحسين تجربة المستخدم.
        </p>

        <h2>أنواع ملفات تعريف الارتباط</h2>
        <ul>
          <li>ملفات تعريف الارتباط الأساسية؛</li>
          <li>ملفات تعريف الارتباط الخاصة بالأداء والتحليلات؛</li>
          <li>ملفات تعريف الارتباط الوظيفية.</li>
        </ul>

        <p>
          يمكن للمستخدمين إدارة تفضيلات ملفات تعريف الارتباط من خلال إعدادات المتصفح.
        </p>
      </section>
      ) : isFr ? (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT utilise des cookies et des technologies similaires afin d'améliorer l'expérience utilisateur.
        </p>

        <h2>Types de cookies</h2>
        <ul>
          <li>Cookies essentiels ;</li>
          <li>Cookies de performance et d'analyse ;</li>
          <li>Cookies fonctionnels.</li>
        </ul>

        <p>
          Les utilisateurs peuvent gérer leurs préférences en matière de cookies via les paramètres de leur navigateur.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT uses cookies and similar technologies to enhance user experience.
        </p>

        <h2>Types of Cookies</h2>
        <ul>
          <li>Essential cookies;</li>
          <li>Performance and analytics cookies;</li>
          <li>Functional cookies.</li>
        </ul>

        <p>
          Users may manage cookie preferences via browser settings.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
