import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const AMLKYCPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'ملخص عام لسياسات مكافحة غسل الأموال والتحقق من هوية العملاء والشركات (AML / KYC / KYB)' : isFr ? 'Synthèse publique AML / KYC / KYB' : 'AML / KYC / KYB Public Summary'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تحتفظ كابي مكس RT بإطار متين لمكافحة غسل الأموال وتمويل الإرهاب (AML/CFT).
        </p>

        <h2>العناصر الرئيسية</h2>
        <ul>
          <li>تحديد هوية العملاء والتحقق منها؛</li>
          <li>المراقبة المستمرة؛</li>
          <li>فحص المعاملات؛</li>
          <li>الإبلاغ عن الأنشطة المشبوهة.</li>
        </ul>

        <p className="legal-emphasis">
          قد يؤدي عدم الامتثال إلى تعليق الحساب أو إنهائه.
        </p>
      </section>
      ) : isFr ? (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT maintient un dispositif solide de lutte contre le blanchiment de capitaux et le financement du terrorisme (AML/CFT).
        </p>

        <h2>Éléments clés</h2>
        <ul>
          <li>Identification et vérification de la clientèle ;</li>
          <li>Surveillance continue ;</li>
          <li>Filtrage des transactions ;</li>
          <li>Déclaration des activités suspectes.</li>
        </ul>

        <p className="legal-emphasis">
          Tout manquement peut entraîner la suspension ou la résiliation du compte.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT maintains a robust AML/CFT framework.
        </p>

        <h2>Key Elements</h2>
        <ul>
          <li>Customer identification and verification;</li>
          <li>Ongoing monitoring;</li>
          <li>Transaction screening;</li>
          <li>Reporting of suspicious activity.</li>
        </ul>

        <p className="legal-emphasis">
          Failure to comply may result in account suspension or termination.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
