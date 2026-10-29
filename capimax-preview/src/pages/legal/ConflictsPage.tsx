import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ConflictsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة تعارض المصالح' : isFr ? "Politique en matière de conflits d'intérêts" : 'Conflicts of Interest Policy'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
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
      ) : isFr ? (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT s'attache à identifier et à gérer les conflits d'intérêts.
        </p>

        <h2>Conflits potentiels</h2>
        <ul>
          <li>Relations avec des promoteurs, des prestataires de services ou des sociétés affiliées ;</li>
          <li>Intérêts financiers ou commerciaux.</li>
        </ul>

        <h2>Mesures d'atténuation</h2>
        <ul>
          <li>Obligations d'information ;</li>
          <li>Contrôles internes ;</li>
          <li>Séparation des processus décisionnels.</li>
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
