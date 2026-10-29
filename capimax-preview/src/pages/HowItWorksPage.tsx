import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const HowItWorksPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || 'en').startsWith('ar');
  const isFr = (i18n.language || 'en').startsWith('fr');

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

  if (isFr) {
    return (
      <InfoPageLayout
        title="Comment fonctionne Capimax RT"
        subtitle="Comprendre le cadre opérationnel de la plateforme"
      >
        <section className="info-section">
          <p className="info-intro">
            Cette section explique, de manière claire et structurée, comment Capimax RT fonctionne en tant que plateforme technologique, en couvrant l'ensemble du cycle de vie d'un actif immobilier tokenisé pour les Propriétaires, les Vendeurs de biens / Promoteurs et les Partenaires stratégiques et opérationnels.
          </p>

          <h2>Présentation de la plateforme</h2>
          <p>
            Capimax RT fonctionne comme une infrastructure numérique qui relie les actifs immobiliers, les SPV, les propriétaires et les prestataires de services au sein d'un cadre opérationnel structuré, conforme et transparent.
          </p>
          <p>
            La plateforme ne vend pas de biens immobiliers, ne gère pas les biens détenus et ne fournit pas de services financiers. En revanche, elle :
          </p>
          <ul>
            <li>Permet la structuration des actifs au moyen de SPV</li>
            <li>Facilite la documentation, les informations communiquées et le reporting</li>
            <li>Organise l'accès et la participation des propriétaires</li>
            <li>Prend en charge des mécanismes de sortie structurés</li>
          </ul>

          <h2>Modèle opérationnel étape par étape</h2>

          <ol>
            <li>
              <span className="step-title">Soumission de l'actif (Vendeur / Promoteur)</span>
              Soumission d'une demande de mise en ligne via la plateforme. Saisie des détails de l'actif, des informations de propriété et des objectifs de détention. Téléversement des documents préliminaires relatifs à la propriété et au projet.
            </li>
            <li>
              <span className="step-title">Examen et sélection initiaux</span>
              Examen préliminaire des éléments soumis. Évaluation de l'éligibilité à la mise en ligne sur la plateforme. Demande de documents complémentaires si nécessaire. Décision initiale d'acceptation ou de refus.
            </li>
            <li>
              <span className="step-title">Constitution et structuration de la SPV</span>
              Constitution d'une SPV dédiée à l'actif. Rattachement juridique entre la SPV et l'actif sous-jacent. Préparation des accords d'exploitation, de gestion et de propriété.
            </li>
            <li>
              <span className="step-title">Évaluation et assurance</span>
              Évaluation indépendante par des cabinets tiers qualifiés. Mise en place d'une couverture d'assurance le cas échéant. Téléversement des rapports et des polices dans la salle de données.
            </li>
            <li>
              <span className="step-title">Offre de propriété</span>
              Définition du prix unitaire, de l'achat minimum et de la taille de l'offre. Publication de la page d'offre de l'actif. Ouverture des souscriptions aux propriétaires vérifiés et éligibles.
            </li>
            <li>
              <span className="step-title">Opérations après l'achat</span>
              Administration continue de l'actif et de la SPV. Reporting opérationnel et financier périodique. Distribution des revenus (le cas échéant) conformément aux politiques annoncées.
            </li>
            <li>
              <span className="step-title">Mécanismes de sortie</span>
              Vente sur le marché secondaire. Sortie facultative via un fournisseur de liquidité (sous réserve des conditions et de la disponibilité). Vente de l'actif et liquidation de la SPV le cas échéant.
            </li>
          </ol>

          <h2>Ressources associées</h2>
          <div>
            <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
              Qu'est-ce que la tokenisation
            </button>
            <button className="link-button" onClick={() => navigateToPage('/spv')}>
              Qu'est-ce qu'une SPV
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
              Voir l'avertissement sur les risques
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/secondary-market')}>
              Marché secondaire
            </button>
            <button className="link-button-outline" onClick={() => navigateToPage('/investor-guide')}>
              Guide du copropriétaire
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
