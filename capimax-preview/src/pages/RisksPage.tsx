import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const RisksPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'مخاطر التملّك وإفصاحات الملاك' : isFr ? 'Risques liés à la propriété et informations aux propriétaires' : 'Ownership Risks & Owner Disclosures'}
      subtitle={isAr ? 'فهم مخاطر التملّك والتزامات المنصة' : isFr ? 'Comprendre les risques liés à la propriété et les engagements de la plateforme' : 'Understanding ownership risks and platform commitments'}
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
      ) : isFr ? (
      <section className="info-section">
        <p className="info-intro">
          Cette section vise à sensibiliser et à protéger à la fois les propriétaires et la plateforme grâce à des informations claires.
        </p>

        <h2>Principales catégories de risques</h2>

        <h3>Risque de marché et d'évaluation</h3>
        <p>
          La valeur des actifs immobiliers peut fluctuer en fonction de la conjoncture économique, des taux d'intérêt, de l'inflation, de l'équilibre entre l'offre et la demande et des événements géopolitiques.
        </p>

        <h3>Risque de liquidité</h3>
        <p>
          Les parts de propriété tokenisées peuvent être illiquides. Le marché secondaire ne garantit ni des échanges actifs ni la présence d'acheteurs. Les dispositifs de fournisseur de liquidité (le cas échéant) sont facultatifs, limités et soumis à conditions.
        </p>

        <h3>Risque opérationnel et de gestion</h3>
        <p>
          Des risques peuvent découler d'erreurs ou de défaillances des SPV (sociétés ad hoc), des gestionnaires de biens, des sociétés d'évaluation, des assureurs ou des prestataires de paiement. Des défaillances technologiques, des incidents de cybersécurité ou des violations de données peuvent également survenir.
        </p>

        <h3>Risque réglementaire et juridique</h3>
        <p>
          Des modifications des lois, des réglementations ou des pratiques de contrôle peuvent restreindre l'accès à la plateforme, affecter l'éligibilité des propriétaires ou avoir une incidence sur la légalité ou la structure des offres tokenisées.
        </p>

        <h3>Risque de contrepartie</h3>
        <p>
          Les SPV, les promoteurs ou les prestataires de services peuvent faire défaut, devenir insolvables ou ne pas exécuter leurs obligations contractuelles.
        </p>

        <h3>Cas de force majeure</h3>
        <p>
          Des événements échappant à tout contrôle, tels que les catastrophes naturelles, les pandémies, les guerres et les mesures gouvernementales, peuvent avoir une incidence significative sur la performance des actifs.
        </p>

        <div className="info-warning">
          <strong>Avertissement relatif à la propriété :</strong> Toute propriété immobilière comporte des risques, y compris la perte potentielle d'une partie ou de la totalité du capital consacré à l'achat. Les propriétaires potentiels doivent examiner attentivement et comprendre l'ensemble des facteurs de risque avant de prendre toute décision d'achat.
        </div>

        <h2>L'engagement de Capimax RT</h2>
        <ul className="check-list">
          <li>Communication complète des risques et des informations importantes</li>
          <li>Aucune promesse ni garantie de performance</li>
          <li>Aucun marketing ni publicité trompeurs</li>
          <li>Pédagogie et transparence envers les propriétaires</li>
        </ul>

        <h2>Ressources associées</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/legal/risk-disclosure')}>
            Avertissement complet sur les risques
          </button>
          <button className="link-button" onClick={() => navigateToPage('/legal/disclaimer')}>
            Clause de non-responsabilité de la plateforme
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            FAQ
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
