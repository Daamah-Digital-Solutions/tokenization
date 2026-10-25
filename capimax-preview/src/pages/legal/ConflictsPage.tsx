import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ConflictsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة تعارض المصالح' : 'Conflicts of Interest Policy'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تسعى كابي مكس RT إلى تحديد حالات تعارض المصالح وإدارتها.
        </p>

        <h2>حالات التعارض المحتملة</h2>
        <ul>
          <li>العلاقات مع المطوّرين أو مزوّدي الخدمات أو الجهات التابعة؛</li>
          <li>المصالح المالية أو التجارية.</li>
        </ul>

        <h2>تدابير الحد من التعارض</h2>
        <ul>
          <li>متطلبات الإفصاح؛</li>
          <li>الضوابط الداخلية؛</li>
          <li>الفصل بين عمليات اتخاذ القرار.</li>
        </ul>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT seeks to identify and manage conflicts of interest.
        </p>

        <h2>Potential Conflicts</h2>
        <ul>
          <li>Relationships with developers, service providers, or affiliates;</li>
          <li>Financial or commercial interests.</li>
        </ul>

        <h2>Mitigation Measures</h2>
        <ul>
          <li>Disclosure requirements;</li>
          <li>Internal controls;</li>
          <li>Separation of decision-making processes.</li>
        </ul>
      </section>
      )}
    </LegalPageLayout>
  );
};
