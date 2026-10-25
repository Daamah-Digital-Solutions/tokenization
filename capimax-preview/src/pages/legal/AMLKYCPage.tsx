import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const AMLKYCPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'ملخص عام لسياسات مكافحة غسل الأموال والتحقق من هوية العملاء والشركات (AML / KYC / KYB)' : 'AML / KYC / KYB Public Summary'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
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
