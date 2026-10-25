import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CookiesPolicyPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة ملفات تعريف الارتباط' : 'Cookies Policy'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
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
