import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const CompliancePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'الإطار التنظيمي وإطار الامتثال' : isFr ? 'Cadre réglementaire et de conformité' : 'Regulatory & Compliance Framework'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
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
      ) : isFr ? (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT opère en tant que plateforme technologique et d'infrastructure et applique une approche fondée en priorité sur la conformité, alignée sur les meilleures pratiques internationales.
        </p>

        <h2>3.1 Objectifs de conformité</h2>
        <ul>
          <li>Prévenir le blanchiment de capitaux et la criminalité financière ;</li>
          <li>Protéger l'intégrité de la plateforme ;</li>
          <li>Garantir une participation licite des utilisateurs éligibles.</li>
        </ul>

        <h2>3.2 KYC / KYB</h2>
        <p>Tous les utilisateurs doivent effectuer une vérification d'identité :</p>
        <ul>
          <li>Personnes physiques : pièce d'identité délivrée par une autorité publique, justificatif de domicile ;</li>
          <li>Personnes morales : documents sociaux, structure de l'actionnariat, signataires autorisés.</li>
        </ul>

        <h2>3.3 Sanctions et filtrage</h2>
        <p>La plateforme procède à un filtrage au regard :</p>
        <ul>
          <li>Des listes de sanctions internationales ;</li>
          <li>Des bases de données des personnes politiquement exposées (PEP) ;</li>
          <li>Des listes de surveillance émanant de fournisseurs reconnus.</li>
        </ul>

        <h2>3.4 Restrictions juridictionnelles</h2>
        <p>L'accès peut être restreint en fonction :</p>
        <ul>
          <li>Du pays de résidence ;</li>
          <li>De la nationalité ;</li>
          <li>Des lois locales applicables.</li>
        </ul>

        <h2>3.5 Classification des investisseurs</h2>
        <p>
          Certaines offres peuvent être réservées à des catégories d'investisseurs spécifiques (par exemple, investisseurs professionnels, qualifiés ou accrédités).
        </p>

        <h2>3.6 Conservation des registres</h2>
        <p>
          Capimax RT conserve les registres de conformité, les journaux d'audit et l'historique des transactions conformément aux exigences légales applicables.
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
