import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const RisksPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'مخاطر التملّك وإفصاحات الملاك' : 'Ownership Risks & Owner Disclosures'}
      subtitle={isAr ? 'فهم مخاطر التملّك والتزامات المنصة' : 'Understanding ownership risks and platform commitments'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          يهدف هذا القسم إلى رفع مستوى الوعي وحماية كلٍّ من الملاك والمنصة من خلال إفصاحات واضحة.
        </p>

        <h2>الفئات الرئيسية للمخاطر</h2>

        <h3>مخاطر السوق والتقييم</h3>
        <p>
          قد تتقلب قيمة الأصول العقارية بسبب الظروف الاقتصادية وأسعار الفائدة والتضخم وديناميكيات العرض والطلب والأحداث الجيوسياسية.
        </p>

        <h3>مخاطر السيولة</h3>
        <p>
          قد تكون وحدات الملكية المرمّزة غير سائلة. ولا تضمن السوق الثانوية وجود تداول نشط أو مشترين. وترتيبات مزوّد السيولة (إن وُجدت) اختيارية ومحدودة وخاضعة لشروط.
        </p>

        <h3>المخاطر التشغيلية ومخاطر الإدارة</h3>
        <p>
          قد تنشأ مخاطر نتيجة أخطاء أو إخفاقات من جانب الشركات ذات الغرض الخاص (SPV) أو مديري العقارات أو شركات التقييم أو شركات التأمين أو مزوّدي خدمات الدفع. وقد تقع أيضًا أعطال تقنية أو حوادث أمن سيبراني أو اختراقات للبيانات.
        </p>

        <h3>المخاطر التنظيمية والقانونية</h3>
        <p>
          قد تؤدي التغييرات في القوانين أو اللوائح أو ممارسات التطبيق إلى تقييد الوصول إلى المنصة، أو التأثير في أهلية الملاك، أو التأثير في مشروعية الطروحات المرمّزة أو هيكلها.
        </p>

        <h3>مخاطر الطرف المقابل</h3>
        <p>
          قد تتعثر الشركات ذات الغرض الخاص (SPV) أو المطوّرون أو مزوّدو الخدمات، أو يصبحون معسرين، أو يخفقون في الوفاء بالتزاماتهم التعاقدية.
        </p>

        <h3>أحداث القوة القاهرة</h3>
        <p>
          قد تؤثر أحداث خارجة عن السيطرة، مثل الكوارث الطبيعية والأوبئة والحروب والإجراءات الحكومية، تأثيرًا جوهريًا في أداء الأصول.
        </p>

        <div className="info-warning">
          <strong>تحذير بشأن التملّك:</strong> ينطوي كل تملّك عقاري على مخاطر، بما في ذلك احتمال خسارة جزء من رأس المال المستخدم في الشراء أو كامله. ويجب على الملاك المحتملين مراجعة جميع عوامل المخاطر وفهمها بعناية قبل اتخاذ أي قرار شراء.
        </div>

        <h2>التزام كابي مكس RT</h2>
        <ul className="check-list">
          <li>الإفصاح الكامل عن المخاطر والمعلومات الجوهرية</li>
          <li>لا وعود ولا ضمانات بشأن الأداء</li>
          <li>لا تسويق أو إعلان مضلّل</li>
          <li>توعية الملاك والشفافية</li>
        </ul>

        <h2>مصادر ذات صلة</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/legal/risk-disclosure')}>
            الإفصاح الكامل عن المخاطر
          </button>
          <button className="link-button" onClick={() => navigateToPage('/legal/disclaimer')}>
            إخلاء مسؤولية المنصة
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            الأسئلة الشائعة
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          This section aims to raise awareness and protect both owners and the platform through clear disclosures.
        </p>

        <h2>Key Risk Categories</h2>

        <h3>Market and Valuation Risk</h3>
        <p>
          The value of real estate assets may fluctuate due to economic conditions, interest rates, inflation, supply and demand dynamics, and geopolitical events.
        </p>

        <h3>Liquidity Risk</h3>
        <p>
          Tokenized ownership units may be illiquid. The secondary market does not guarantee active trading or buyers. Liquidity provider arrangements (if any) are optional, limited, and subject to conditions.
        </p>

        <h3>Operational and Management Risk</h3>
        <p>
          Risks may arise from errors or failures by SPVs, property managers, valuation firms, insurers, or payment providers. Technology failures, cybersecurity incidents, or data breaches may also occur.
        </p>

        <h3>Regulatory and Legal Risk</h3>
        <p>
          Changes in laws, regulations, or enforcement practices may restrict access to the platform, affect owner eligibility, or impact the legality or structure of tokenized offerings.
        </p>

        <h3>Counterparty Risk</h3>
        <p>
          SPVs, developers, or service providers may default, become insolvent, or fail to perform contractual obligations.
        </p>

        <h3>Force Majeure Events</h3>
        <p>
          Events beyond control such as natural disasters, pandemics, wars, and government actions may materially impact asset performance.
        </p>

        <div className="info-warning">
          <strong>Ownership Warning:</strong> All real estate ownership involves risk, including the potential loss of part or all of the capital used to purchase. Prospective owners must carefully review and understand all risk factors before making any purchase decision.
        </div>

        <h2>Capimax RT Commitment</h2>
        <ul className="check-list">
          <li>Full disclosure of risks and material information</li>
          <li>No performance promises or guarantees</li>
          <li>No misleading marketing or advertising</li>
          <li>Owner education and transparency</li>
        </ul>

        <h2>Related Resources</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/legal/risk-disclosure')}>
            Full Risk Disclosure
          </button>
          <button className="link-button" onClick={() => navigateToPage('/legal/disclaimer')}>
            Platform Disclaimer
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            FAQ
          </button>
        </div>
      </section>
      )}
    </InfoPageLayout>
  );
};
