import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const InvestorGuidePage: React.FC = () => {
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
      title={isAr ? 'دليل الشريك المالك' : isFr ? 'Guide du copropriétaire' : 'Co-Owner Guide'}
      subtitle={isAr ? 'كيف تتملّك على كابي مكس RT - دليل عملي خطوة بخطوة' : isFr ? 'Comment devenir propriétaire sur Capimax RT - Un guide pratique étape par étape' : 'How to Own on Capimax RT - A practical step-by-step guide'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          يقدّم هذا الدليل شرحًا عمليًا خطوة بخطوة لكيفية التملّك عبر كابي مكس RT.
        </p>

        <h2>رحلة المالك خطوة بخطوة</h2>

        <ol>
          <li>
            <span className="step-title">تسجيل الحساب</span>
            أنشئ حسابك على كابي مكس RT باستخدام بريدك الإلكتروني ومعلوماتك الأساسية.
          </li>
          <li>
            <span className="step-title">التحقق من الهوية</span>
            أكمل إجراءات التحقق من الهوية لتصبح مالكًا موثّقًا.
          </li>
          <li>
            <span className="step-title">تصفّح الفرص المتاحة</span>
            استكشف فرص التملّك المتاحة المدرجة على المنصة.
          </li>
          <li>
            <span className="step-title">مراجعة مستندات الأصل</span>
            ادخل إلى غرفة البيانات وراجع جميع المستندات ذات الصلة بالعقار الذي اخترته.
          </li>
          <li>
            <span className="step-title">إتمام الشراء</span>
            حدّد مبلغ الشراء وأكمل إجراءات التملّك.
          </li>
          <li>
            <span className="step-title">متابعة أداء المحفظة الاستثمارية</span>
            تابع العقارات التي تملكها من خلال لوحة التحكم الخاصة بك.
          </li>
          <li>
            <span className="step-title">استلام التوزيعات (إن وُجدت)</span>
            استلم توزيعات الدخل وفقًا لسياسة التوزيع المعلنة.
          </li>
          <li>
            <span className="step-title">تنفيذ استراتيجية التخارج</span>
            عندما تكون مستعدًا، استخدم آليات التخارج بما فيها السوق الثانوية أو خيارات مزوّد السيولة.
          </li>
        </ol>

        <h2>لوحة تحكم المحفظة الاستثمارية للمالك</h2>
        <p>
          توفّر لوحة تحكم المالك:
        </p>
        <ul className="check-list">
          <li>قائمة الأصول المملوكة</li>
          <li>عدد الوحدات المملوكة</li>
          <li>قيمة الملكية</li>
          <li>سجل التوزيعات</li>
          <li>شهادات الملكية الرقمية</li>
          <li>سجلات المعاملات</li>
        </ul>

        <div className="info-warning">
          <strong>مهم:</strong> قبل الشراء، تأكد من مراجعة جميع المستندات بعناية، وفهم المخاطر المرتبطة، واستشارة مستشارك المالي عند الحاجة. ينطوي كل تملّك عقاري على مخاطر، بما في ذلك احتمال خسارة رأس المال.
        </div>

        <h2>ابدأ الآن</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/register')}>
            إنشاء حساب
          </button>
          <button className="link-button" onClick={() => navigateToPage('/properties')}>
            تصفّح العقارات
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            عرض إفصاحات المخاطر
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            الأسئلة الشائعة
          </button>
        </div>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <p className="info-intro">
          Ce guide présente, étape par étape et de manière pratique, comment devenir propriétaire via Capimax RT.
        </p>

        <h2>Le parcours du propriétaire, étape par étape</h2>

        <ol>
          <li>
            <span className="step-title">Création du compte</span>
            Créez votre compte sur Capimax RT avec votre adresse e-mail et vos informations de base.
          </li>
          <li>
            <span className="step-title">Vérification d'identité (KYC)</span>
            Effectuez la procédure de vérification d'identité pour devenir un propriétaire vérifié.
          </li>
          <li>
            <span className="step-title">Découverte des opportunités disponibles</span>
            Explorez les opportunités de propriété disponibles proposées sur la plateforme.
          </li>
          <li>
            <span className="step-title">Examen de la documentation de l'actif</span>
            Accédez à la salle de données et examinez toute la documentation pertinente relative au bien choisi.
          </li>
          <li>
            <span className="step-title">Réalisation d'un achat</span>
            Choisissez le montant de votre achat et finalisez le processus d'acquisition.
          </li>
          <li>
            <span className="step-title">Suivi de la performance du portefeuille</span>
            Suivez les biens que vous détenez depuis votre tableau de bord personnalisé.
          </li>
          <li>
            <span className="step-title">Perception des distributions (le cas échéant)</span>
            Percevez les distributions de revenus conformément à la politique de distribution annoncée.
          </li>
          <li>
            <span className="step-title">Mise en œuvre d'une stratégie de sortie</span>
            Le moment venu, utilisez les mécanismes de sortie, notamment le marché secondaire ou les options du fournisseur de liquidité.
          </li>
        </ol>

        <h2>Tableau de bord du portefeuille du propriétaire</h2>
        <p>
          Le tableau de bord du propriétaire présente :
        </p>
        <ul className="check-list">
          <li>La liste des actifs détenus</li>
          <li>Le nombre de parts détenues</li>
          <li>La valeur de la propriété</li>
          <li>L'historique des distributions</li>
          <li>Les certificats de propriété numériques</li>
          <li>L'historique des transactions</li>
        </ul>

        <div className="info-warning">
          <strong>Important :</strong> Avant tout achat, assurez-vous d'avoir examiné attentivement toute la documentation, d'avoir compris les risques encourus et, si nécessaire, d'avoir consulté votre conseiller financier. Toute propriété immobilière comporte des risques, y compris la perte potentielle du capital investi.
        </div>

        <h2>Commencer</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/register')}>
            Créer un compte
          </button>
          <button className="link-button" onClick={() => navigateToPage('/properties')}>
            Parcourir les biens
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            Voir les avertissements sur les risques
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/faq')}>
            FAQ
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          This guide provides a practical step-by-step walkthrough of how to own through Capimax RT.
        </p>

        <h2>Step-by-Step Owner Journey</h2>

        <ol>
          <li>
            <span className="step-title">Account Registration</span>
            Create your account on Capimax RT with your email and basic information.
          </li>
          <li>
            <span className="step-title">Identity Verification (KYC)</span>
            Complete the identity verification process to become a verified owner.
          </li>
          <li>
            <span className="step-title">Browsing Available Opportunities</span>
            Explore the available ownership opportunities listed on the platform.
          </li>
          <li>
            <span className="step-title">Reviewing Asset Documentation</span>
            Access the Data Room and review all relevant documentation for your chosen property.
          </li>
          <li>
            <span className="step-title">Making a Purchase</span>
            Select your purchase amount and complete the ownership process.
          </li>
          <li>
            <span className="step-title">Monitoring Portfolio Performance</span>
            Track your owned properties through your personalized dashboard.
          </li>
          <li>
            <span className="step-title">Receiving Distributions (if applicable)</span>
            Receive income distributions according to the stated distribution policy.
          </li>
          <li>
            <span className="step-title">Executing an Exit Strategy</span>
            When ready, utilize exit mechanisms including the secondary market or liquidity provider options.
          </li>
        </ol>

        <h2>Owner Portfolio Dashboard</h2>
        <p>
          The owner dashboard provides:
        </p>
        <ul className="check-list">
          <li>List of owned assets</li>
          <li>Number of units held</li>
          <li>Ownership value</li>
          <li>Distribution history</li>
          <li>Digital ownership certificates</li>
          <li>Transaction logs</li>
        </ul>

        <div className="info-warning">
          <strong>Important:</strong> Before buying, ensure you have thoroughly reviewed all documentation, understood the risks involved, and consulted with your financial advisor if needed. All real estate ownership involves risk, including the potential loss of principal.
        </div>

        <h2>Get Started</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/register')}>
            Create Account
          </button>
          <button className="link-button" onClick={() => navigateToPage('/properties')}>
            Browse Properties
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            View Risk Disclosures
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
