import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CompliancePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'الإطار التنظيمي وإطار الامتثال' : 'Regulatory & Compliance Framework'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تعمل كابي مكس RT بوصفها منصة تقنية ومنصة بنية تحتية، وتطبّق نهجًا يضع الامتثال أولًا بما يتوافق مع أفضل الممارسات الدولية.
        </p>

        <h2>3.1 أهداف الامتثال</h2>
        <ul>
          <li>منع غسل الأموال والجرائم المالية؛</li>
          <li>حماية نزاهة المنصة؛</li>
          <li>ضمان المشاركة المشروعة من قِبل المستخدمين المؤهلين.</li>
        </ul>

        <h2>3.2 التحقق من الهوية (KYC / KYB)</h2>
        <p>يجب على جميع المستخدمين إكمال التحقق من الهوية:</p>
        <ul>
          <li>الأفراد: وثيقة هوية صادرة عن جهة حكومية، وإثبات العنوان؛</li>
          <li>الكيانات: مستندات الشركة، وهيكل الملكية، والمفوّضون بالتوقيع.</li>
        </ul>

        <h2>3.3 العقوبات والفحص</h2>
        <p>تُجري المنصة فحصًا مقابل:</p>
        <ul>
          <li>قوائم العقوبات الدولية؛</li>
          <li>قواعد بيانات الأشخاص المعرّضين سياسيًا (PEP)؛</li>
          <li>قوائم المراقبة الصادرة عن مزوّدين موثوقين.</li>
        </ul>

        <h2>3.4 القيود المتعلقة بالولايات القضائية</h2>
        <p>قد يُقيَّد الوصول بناءً على:</p>
        <ul>
          <li>بلد الإقامة؛</li>
          <li>الجنسية؛</li>
          <li>القوانين المحلية السارية.</li>
        </ul>

        <h2>3.5 تصنيف المستثمرين</h2>
        <p>
          قد تقتصر بعض الطروحات على فئات محددة من المستثمرين (مثل المستثمرين المحترفين أو المؤهلين أو المعتمدين).
        </p>

        <h2>3.6 حفظ السجلات</h2>
        <p>
          تحتفظ كابي مكس RT بسجلات الامتثال وسجلات التدقيق وسجلات المعاملات وفقًا للمتطلبات القانونية السارية.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT operates as a technology and infrastructure platform and applies a compliance-first approach aligned with international best practices.
        </p>

        <h2>3.1 Compliance Objectives</h2>
        <ul>
          <li>Prevent money laundering and financial crime;</li>
          <li>Protect platform integrity;</li>
          <li>Ensure lawful participation by eligible users.</li>
        </ul>

        <h2>3.2 KYC / KYB</h2>
        <p>All users must complete identity verification:</p>
        <ul>
          <li>Individuals: government-issued identification, proof of address;</li>
          <li>Entities: corporate documents, ownership structure, authorized signatories.</li>
        </ul>

        <h2>3.3 Sanctions & Screening</h2>
        <p>The platform conducts screening against:</p>
        <ul>
          <li>International sanctions lists;</li>
          <li>Politically Exposed Persons (PEP) databases;</li>
          <li>Watchlists from reputable providers.</li>
        </ul>

        <h2>3.4 Jurisdictional Restrictions</h2>
        <p>Access may be restricted based on:</p>
        <ul>
          <li>Country of residence;</li>
          <li>Citizenship;</li>
          <li>Applicable local laws.</li>
        </ul>

        <h2>3.5 Investor Classification</h2>
        <p>
          Certain offerings may be limited to specific investor categories (e.g., professional, qualified, or accredited investors).
        </p>

        <h2>3.6 Record Keeping</h2>
        <p>
          Capimax RT maintains compliance records, audit logs, and transaction histories in accordance with applicable legal requirements.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
