import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const HowItWorksPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || 'en').startsWith('ar');

  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isAr) {
    return (
      <InfoPageLayout
        title="كيف تعمل كابي مكس RT"
        subtitle="فهم الإطار التشغيلي للمنصة"
      >
        <section className="info-section">
          <p className="info-intro">
            يوضّح هذا القسم، بأسلوب واضح ومنظّم، كيف تعمل كابي مكس RT بوصفها منصة تقنية، ويغطي دورة الحياة الكاملة للأصل العقاري المرمَّز للملّاك، وبائعي العقارات / المطوّرين، والشركاء الاستراتيجيين والتشغيليين.
          </p>

          <h2>نظرة عامة على المنصة</h2>
          <p>
            تعمل كابي مكس RT كبنية تحتية رقمية تربط الأصول العقارية والشركات ذات الغرض الخاص (SPV) والملّاك ومقدّمي الخدمات ضمن إطار تشغيلي منظّم وملتزم وشفّاف.
          </p>
          <p>
            لا تبيع المنصة العقارات، ولا تدير العقارات المملوكة، ولا تقدّم خدمات مالية. بل إنها:
          </p>
          <ul>
            <li>تتيح هيكلة الأصول من خلال الشركات ذات الغرض الخاص (SPV)</li>
            <li>تيسّر التوثيق والإفصاحات وإعداد التقارير</li>
            <li>تنظّم وصول الملّاك ومشاركتهم</li>
            <li>تدعم آليات خروج منظّمة</li>
          </ul>

          <h2>نموذج التشغيل خطوة بخطوة</h2>

          <ol>
            <li>
              <span className="step-title">تقديم الأصل (البائع / المطوّر)</span>
              تقديم طلب إدراج عبر المنصة. إدخال تفاصيل الأصل ومعلومات الملكية وأهداف التملّك. رفع المستندات الأولية الخاصة بالملكية والمشروع.
            </li>
            <li>
              <span className="step-title">المراجعة والفحص الأولي</span>
              مراجعة أولية للمواد المقدَّمة. تقييم أهلية الإدراج على المنصة. طلب مستندات إضافية عند الحاجة. قرار أولي بالقبول أو الرفض.
            </li>
            <li>
              <span className="step-title">تأسيس الشركة ذات الغرض الخاص (SPV) وهيكلتها</span>
              تأسيس شركة ذات غرض خاص (SPV) مخصّصة للأصل. الربط القانوني بين الشركة ذات الغرض الخاص والأصل محل الاستثمار. إعداد اتفاقيات التشغيل والإدارة والملكية.
            </li>
            <li>
              <span className="step-title">التقييم والتأمين</span>
              تقييم مستقل من قِبل جهات خارجية مؤهّلة. ترتيب التغطية التأمينية حيثما ينطبق ذلك. رفع التقارير والوثائق إلى غرفة البيانات.
            </li>
            <li>
              <span className="step-title">طرح الملكية</span>
              تحديد سعر الوحدة والحد الأدنى للشراء وحجم الطرح. نشر صفحة طرح الأصل. فتح باب الاكتتاب أمام الملّاك الموثَّقين والمؤهَّلين.
            </li>
            <li>
              <span className="step-title">العمليات بعد الشراء</span>
              إدارة مستمرة للأصل والشركة ذات الغرض الخاص. تقارير تشغيلية ومالية دورية. توزيع الدخل (إن وُجد) وفقًا للسياسات المعلنة.
            </li>
            <li>
              <span className="step-title">آليات الخروج</span>
              البيع من خلال السوق الثانوية. خروج اختياري عبر مزوّد السيولة (وفقًا للشروط ومدى التوفّر). بيع الأصل وتصفية الشركة ذات الغرض الخاص حيثما ينطبق ذلك.
            </li>
          </ol>

          <h2>موارد ذات صلة</h2>
          <div>
            <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
              ما هو الترميز
            </button>
            <button className="link-button" onClick={() => navigateToPage('/spv')}>
              ما هي الشركة ذات الغرض الخاص (SPV)
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
              عرض الإفصاحات عن المخاطر
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/secondary-market')}>
              السوق الثانوية
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/investor-guide')}>
              دليل الشريك المالك
            </button>
          </div>
        </section>
      </InfoPageLayout>
    );
  }

  return (
    <InfoPageLayout
      title="How Capimax RT Works"
      subtitle="Understanding the platform's operational framework"
    >
      <section className="info-section">
        <p className="info-intro">
          This section explains, in a clear and structured manner, how Capimax RT operates as a technology platform, covering the full lifecycle of a tokenized real estate asset for Owners, Property Sellers / Developers, and Strategic and Operational Partners.
        </p>

        <h2>Platform Overview</h2>
        <p>
          Capimax RT operates as a digital infrastructure that connects real estate assets, SPVs, owners, and service providers within a structured, compliant, and transparent operational framework.
        </p>
        <p>
          The platform does not sell real estate, manage owned properties, or provide financial services. Instead, it:
        </p>
        <ul>
          <li>Enables asset structuring through SPVs</li>
          <li>Facilitates documentation, disclosures, and reporting</li>
          <li>Organizes owner access and participation</li>
          <li>Supports structured exit mechanisms</li>
        </ul>

        <h2>Step-by-Step Operating Model</h2>

        <ol>
          <li>
            <span className="step-title">Asset Submission (Seller / Developer)</span>
            Submission of a listing request through the platform. Entry of asset details, ownership information, and ownership objectives. Upload of preliminary ownership and project documentation.
          </li>
          <li>
            <span className="step-title">Initial Review & Screening</span>
            Preliminary review of submitted materials. Assessment of eligibility for platform listing. Request for additional documentation if required. Initial acceptance or rejection decision.
          </li>
          <li>
            <span className="step-title">SPV Formation & Structuring</span>
            Establishment of a dedicated SPV for the asset. Legal linkage between the SPV and the underlying asset. Preparation of operating, management, and ownership agreements.
          </li>
          <li>
            <span className="step-title">Valuation & Insurance</span>
            Independent valuation by qualified third-party firms. Arrangement of insurance coverage where applicable. Upload of reports and policies into the Data Room.
          </li>
          <li>
            <span className="step-title">Ownership Offering</span>
            Definition of unit price, minimum purchase, and offering size. Publication of the asset offering page. Opening of subscriptions to verified and eligible owners.
          </li>
          <li>
            <span className="step-title">Post-Purchase Operations</span>
            Ongoing asset and SPV administration. Periodic operational and financial reporting. Distribution of income (if any) in accordance with stated policies.
          </li>
          <li>
            <span className="step-title">Exit Mechanisms</span>
            Sale through the secondary market. Optional liquidity provider exit (subject to terms and availability). Asset sale and SPV wind-down where applicable.
          </li>
        </ol>

        <h2>Related Resources</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
            What is Tokenization
          </button>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            View Risk Disclosures
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/secondary-market')}>
            Secondary Market
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/investor-guide')}>
            Co-Owner Guide
          </button>
        </div>
      </section>
    </InfoPageLayout>
  );
};
