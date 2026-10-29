import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const RiskDisclosurePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'الإفصاح عن مخاطر التملّك' : isFr ? 'Avertissement sur les risques liés à la propriété' : 'Ownership Risk Disclosure'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          ينطوي تملّك العقارات المرمّزة عبر كابي مكس RT على مخاطر كبيرة، بما في ذلك احتمال خسارة جزء من رأس المال المستخدم في الشراء أو كامله. ويجب على الملاك المحتملين مراجعة عوامل المخاطر التالية، الواردة على سبيل المثال لا الحصر، وفهمها بعناية.
        </p>

        <h2>2.1 مخاطر السوق</h2>
        <p>
          قد تتقلب قيمة الأصول العقارية بسبب الظروف الاقتصادية وأسعار الفائدة والتضخم وديناميكيات العرض والطلب والأحداث الجيوسياسية.
        </p>

        <h2>2.2 مخاطر السيولة</h2>
        <ul>
          <li>قد تكون وحدات الملكية المرمّزة غير سائلة.</li>
          <li>لا تضمن السوق الثانوية وجود تداول نشط أو مشترين.</li>
          <li>ترتيبات مزوّد السيولة (إن وُجدت) اختيارية ومحدودة وخاضعة لشروط.</li>
        </ul>

        <h2>2.3 لا يوجد تخارج مضمون</h2>
        <p>
          لا يوجد أي ضمان بأن يتمكن الملاك من التخارج من العقارات التي يملكونها في الوقت أو بالسعر المرغوب.
        </p>

        <h2>2.4 المخاطر التنظيمية والقانونية</h2>
        <p>قد تؤدي التغييرات في القوانين أو اللوائح أو ممارسات التطبيق إلى:</p>
        <ul>
          <li>تقييد الوصول إلى المنصة؛</li>
          <li>التأثير في أهلية الملاك؛</li>
          <li>التأثير في مشروعية الطروحات المرمّزة أو هيكلها.</li>
        </ul>

        <h2>2.5 المخاطر التشغيلية</h2>
        <p>قد تنشأ المخاطر عن:</p>
        <ul>
          <li>أخطاء أو إخفاقات من جانب الشركات ذات الغرض الخاص (SPV) أو مديري العقارات أو شركات التقييم أو شركات التأمين أو مزوّدي خدمات الدفع؛</li>
          <li>الأعطال التقنية أو حوادث الأمن السيبراني أو اختراقات البيانات.</li>
        </ul>

        <h2>2.6 مخاطر الطرف المقابل</h2>
        <p>
          قد تتعثر الشركات ذات الغرض الخاص (SPV) أو المطوّرون أو مزوّدو الخدمات، أو يصبحون معسرين، أو يخفقون في الوفاء بالتزاماتهم التعاقدية.
        </p>

        <h2>2.7 مخاطر التقييم</h2>
        <p>
          تستند التقييمات إلى افتراضات ومنهجيات قد لا تعكس ظروف السوق المستقبلية أو الأسعار القابلة للتحقق.
        </p>

        <h2>2.8 القوة القاهرة</h2>
        <p>
          قد تؤثر أحداث خارجة عن السيطرة (الكوارث الطبيعية، الأوبئة، الحروب، الإجراءات الحكومية) تأثيرًا جوهريًا في أداء الأصول.
        </p>

        <p className="legal-emphasis">
          بالمتابعة، يُقرّ الملاك بفهمهم الكامل لهذه المخاطر وقبولهم بها.
        </p>
      </section>
      ) : isFr ? (
      <section className="legal-section">
        <p className="legal-intro">
          La détention de biens immobiliers tokenisés par l'intermédiaire de Capimax RT comporte des risques importants, y compris la perte potentielle d'une partie ou de la totalité du capital consacré à l'achat. Les propriétaires potentiels doivent examiner attentivement et comprendre les facteurs de risque suivants, dont la liste n'est pas exhaustive.
        </p>

        <h2>2.1 Risque de marché</h2>
        <p>
          La valeur des actifs immobiliers peut fluctuer en fonction de la conjoncture économique, des taux d'intérêt, de l'inflation, de l'équilibre entre l'offre et la demande et des événements géopolitiques.
        </p>

        <h2>2.2 Risque de liquidité</h2>
        <ul>
          <li>Les parts de propriété tokenisées peuvent être illiquides.</li>
          <li>Le marché secondaire ne garantit ni des échanges actifs ni la présence d'acheteurs.</li>
          <li>Les dispositifs de fournisseur de liquidité (le cas échéant) sont facultatifs, limités et soumis à conditions.</li>
        </ul>

        <h2>2.3 Absence de sortie garantie</h2>
        <p>
          Rien ne garantit que les propriétaires pourront sortir des biens qu'ils détiennent au moment ou au prix souhaité.
        </p>

        <h2>2.4 Risque réglementaire et juridique</h2>
        <p>Des modifications des lois, des réglementations ou des pratiques de contrôle peuvent :</p>
        <ul>
          <li>Restreindre l'accès à la plateforme ;</li>
          <li>Affecter l'éligibilité des propriétaires ;</li>
          <li>Avoir une incidence sur la légalité ou la structure des offres tokenisées.</li>
        </ul>

        <h2>2.5 Risque opérationnel</h2>
        <p>Des risques peuvent découler :</p>
        <ul>
          <li>D'erreurs ou de défaillances des SPV (sociétés ad hoc), des gestionnaires de biens, des sociétés d'évaluation, des assureurs ou des prestataires de paiement ;</li>
          <li>De défaillances technologiques, d'incidents de cybersécurité ou de violations de données.</li>
        </ul>

        <h2>2.6 Risque de contrepartie</h2>
        <p>
          Les SPV, les promoteurs ou les prestataires de services peuvent faire défaut, devenir insolvables ou ne pas exécuter leurs obligations contractuelles.
        </p>

        <h2>2.7 Risque d'évaluation</h2>
        <p>
          Les évaluations reposent sur des hypothèses et des méthodologies susceptibles de ne pas refléter les conditions futures du marché ni les prix effectivement réalisables.
        </p>

        <h2>2.8 Force majeure</h2>
        <p>
          Des événements échappant à tout contrôle (catastrophes naturelles, pandémies, guerres, mesures gouvernementales) peuvent avoir une incidence significative sur la performance des actifs.
        </p>

        <p className="legal-emphasis">
          En poursuivant, les propriétaires reconnaissent avoir pleinement compris et accepté ces risques.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Owning tokenized real estate through Capimax RT involves significant risks, including the potential loss of part or all of the capital used to purchase. Prospective owners must carefully review and understand the following non-exhaustive risk factors.
        </p>

        <h2>2.1 Market Risk</h2>
        <p>
          The value of real estate assets may fluctuate due to economic conditions, interest rates, inflation, supply and demand dynamics, and geopolitical events.
        </p>

        <h2>2.2 Liquidity Risk</h2>
        <ul>
          <li>Tokenized ownership units may be illiquid.</li>
          <li>The secondary market does not guarantee active trading or buyers.</li>
          <li>Liquidity provider arrangements (if any) are optional, limited, and subject to conditions.</li>
        </ul>

        <h2>2.3 No Guaranteed Exit</h2>
        <p>
          There is no assurance that owners will be able to exit their owned properties at a desired time or price.
        </p>

        <h2>2.4 Regulatory & Legal Risk</h2>
        <p>Changes in laws, regulations, or enforcement practices may:</p>
        <ul>
          <li>Restrict access to the platform;</li>
          <li>Affect owner eligibility;</li>
          <li>Impact the legality or structure of tokenized offerings.</li>
        </ul>

        <h2>2.5 Operational Risk</h2>
        <p>Risks may arise from:</p>
        <ul>
          <li>Errors or failures by SPVs, property managers, valuation firms, insurers, or payment providers;</li>
          <li>Technology failures, cybersecurity incidents, or data breaches.</li>
        </ul>

        <h2>2.6 Counterparty Risk</h2>
        <p>
          SPVs, developers, or service providers may default, become insolvent, or fail to perform contractual obligations.
        </p>

        <h2>2.7 Valuation Risk</h2>
        <p>
          Valuations are based on assumptions and methodologies that may not reflect future market conditions or realizable prices.
        </p>

        <h2>2.8 Force Majeure</h2>
        <p>
          Events beyond control (natural disasters, pandemics, wars, government actions) may materially impact asset performance.
        </p>

        <p className="legal-emphasis">
          By proceeding, owners acknowledge full understanding and acceptance of these risks.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
