import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const SecurityPolicyPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'نظرة عامة على أمن المعلومات' : 'Information Security Overview'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تطبّق كابي مكس RT تدابير أمنية وفق معايير القطاع، بما في ذلك:
        </p>

        <ul>
          <li>المصادقة الثنائية (2FA)؛</li>
          <li>ضوابط الوصول حسب الدور؛</li>
          <li>تشفير البيانات أثناء النقل وأثناء التخزين؛</li>
          <li>المراقبة الأمنية والتدقيق بشكل منتظم؛</li>
          <li>خطط الاستجابة للحوادث والتعافي منها.</li>
        </ul>

        <p className="legal-emphasis">
          رغم بذل أقصى الجهود، لا يوجد نظام محصّن تمامًا من المخاطر، ويُقرّ المستخدمون بوجود مخاطر متبقية تتعلق بالأمن السيبراني.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT implements industry-standard security measures, including:
        </p>

        <ul>
          <li>Two-factor authentication (2FA);</li>
          <li>Role-based access controls;</li>
          <li>Encryption of data in transit and at rest;</li>
          <li>Regular security monitoring and audits;</li>
          <li>Incident response and recovery plans.</li>
        </ul>

        <p className="legal-emphasis">
          Despite best efforts, no system is entirely immune from risk, and users acknowledge residual cybersecurity risks.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
