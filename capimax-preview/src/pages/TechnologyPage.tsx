import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const TechnologyPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || 'en').startsWith('ar');
  const isFr = (i18n.language || 'en').startsWith('fr');

  if (isAr) {
    return (
      <InfoPageLayout
        title="التقنية"
        subtitle="بنية تحتية آمنة للعقارات المرمَّزة"
      >
        <section className="info-section">
          <p className="info-intro">
            تعمل كابي مكس RT على بنية تحتية قائمة على البلوك تشين، صُمّمت لضمان النفاذ القانوني والأمان
            التقني وشفافية الأصول وحماية الملّاك. ويدمج إطارنا التقني الهياكل القانونية المنظَّمة مع
            العقود الذكية المدقَّقة لتقديم ترميز عقاري بمستوى مؤسسي.
          </p>

          <h2>1. البنية التحتية للبلوك تشين</h2>
          <h3>طبقة الشبكة</h3>
          <p>تستخدم كابي مكس RT شبكة بلوك تشين عامة مُحسَّنة لتحقيق:</p>
          <ul>
            <li>أمان عالٍ للمعاملات</li>
            <li>تحقق شفّاف على السلسلة</li>
            <li>سجلات ملكية غير قابلة للتعديل</li>
            <li>تسوية فعّالة</li>
          </ul>
          <h3>المبادئ الأساسية</h3>
          <ul>
            <li>التحقق عبر سجل لامركزي</li>
            <li>إصدار شفّاف للرموز الرقمية</li>
            <li>سجل معاملات قابل للتحقق علنًا</li>
            <li>التوافق مع المحافظ غير الحاضنة</li>
          </ul>
          <p>
            يُطلَق كل أصل مرمَّز عبر عقد ذكي مخصّص، مرتبط بالكيان القانوني المقابل له (هيكل الشركة ذات
            الغرض الخاص SPV / CBV).
          </p>

          <h2>2. إطار العقود الذكية</h2>
          <h3>العقود الذكية على مستوى الأصل</h3>
          <p>يُمثَّل كل عقار على كابي مكس RT بعقد ذكي مخصّص يحكم:</p>
          <ul>
            <li>إصدار الرموز الرقمية</li>
            <li>توزيع الملكية</li>
            <li>قيود النقل</li>
            <li>منطق التوزيعات</li>
            <li>ضوابط الامتثال</li>
          </ul>
          <h3>قدرات العقود الذكية</h3>
          <ul>
            <li>نقل ثانوي مُنظَّم (نافذة سيولة سنوية)</li>
            <li>التحقق من الوصول بناءً على التحقق من الهوية</li>
            <li>إدراج المحافظ في القائمة المعتمدة</li>
            <li>منطق فرض الامتثال</li>
            <li>آليات توزيع مؤتمتة</li>
          </ul>
          <p>
            تُهيكَل العقود الذكية بحيث تعكس الحقوق القانونية المنصوص عليها في مستندات الشركة ذات الغرض الخاص (SPV).
          </p>

          <h2>3. بنية الأمان</h2>
          <p>
            تتبع كابي مكس RT إطار أمان متعدد الطبقات مصمّمًا للحد من المخاطر التقنية والتشغيلية.
          </p>
          <h3>أمن البنية التحتية</h3>
          <ul>
            <li>تحصين البنية التحتية السحابية</li>
            <li>نقل بيانات مشفّر (SSL/TLS)</li>
            <li>بنية شبكة مُجزّأة</li>
          </ul>
          <h3>أمن التطبيقات</h3>
          <ul>
            <li>ضوابط وصول قائمة على الأدوار</li>
            <li>مصادقة متعددة العوامل</li>
            <li>فحص مستمر للثغرات</li>
          </ul>
          <h3>أمن العقود الذكية</h3>
          <ul>
            <li>التحقق عبر تدقيق خارجي</li>
            <li>التحقق من الشيفرة البرمجية</li>
            <li>فحوصات سلامة الإطلاق</li>
          </ul>
          <h3>الأمن التشغيلي</h3>
          <ul>
            <li>رقابة داخلية صارمة على الوصول</li>
            <li>الفصل بين المهام</li>
            <li>بروتوكولات مراقبة مستمرة</li>
          </ul>

          <h2>4. نموذج الحفظ</h2>
          <p>تدعم كابي مكس RT هيكل حفظ هجينًا.</p>
          <h3>حفظ الرموز الرقمية</h3>
          <ul>
            <li>يمكن للملّاك الاحتفاظ بالرموز الرقمية في محافظ معتمدة</li>
            <li>يضمن الإدراج في القائمة المعتمدة التوافق مع متطلبات الامتثال</li>
            <li>تكاملات اختيارية مع جهات حفظ خارجية (حيثما ينطبق ذلك)</li>
          </ul>
          <h3>حفظ الأصول</h3>
          <ul>
            <li>تُحفظ الأصول العقارية الأساسية ضمن شركات ذات غرض خاص (SPV / CBV) مسجّلة قانونيًا</li>
            <li>إشراف مستقل على إدارة العقارات</li>
            <li>آليات منظّمة لتحصيل الإيرادات</li>
          </ul>
          <p>يضمن نموذج الحفظ الفصل بين:</p>
          <ul>
            <li>عمليات المنصة</li>
            <li>ملكية الأصول</li>
            <li>حيازات الملّاك من الرموز الرقمية</li>
          </ul>

          <h2>5. التدقيق والتحقق</h2>
          <p>الشفافية والتحقق ركيزتان أساسيتان.</p>
          <h3>تدقيق العقود الذكية</h3>
          <ul>
            <li>تدقيقات أمنية مستقلة من جهات خارجية</li>
            <li>تحليل ثغرات الشيفرة البرمجية</li>
            <li>ملخصات تدقيق علنية (حيثما ينطبق ذلك)</li>
          </ul>
          <h3>الرقابة المالية والتشغيلية</h3>
          <ul>
            <li>تقارير على مستوى العقار</li>
            <li>التحقق من الإيرادات</li>
            <li>رقابة محاسبية منظّمة</li>
          </ul>
          <p>
            تُتاح مستندات التدقيق وملخصات التحقق لأصحاب المصلحة من خلال بوابة الشفافية.
          </p>

          <h2>6. شفافية البيانات</h2>
          <p>توفّر كابي مكس RT رؤية منظّمة عبر المنظومة بأكملها.</p>
          <h3>الشفافية على السلسلة</h3>
          <ul>
            <li>التحقق من المعروض من الرموز الرقمية</li>
            <li>توزيع الملكية</li>
            <li>سجلات المعاملات</li>
          </ul>
          <h3>الشفافية خارج السلسلة</h3>
          <ul>
            <li>الأداء المالي للعقار</li>
            <li>توزيعات العوائد</li>
            <li>تحديثات التقييم</li>
            <li>تقارير الأصول</li>
          </ul>
          <p>يحتفظ الملّاك بإمكانية الوصول إلى:</p>
          <ul>
            <li>لوحة تحكم المحفظة الاستثمارية</li>
            <li>سجل التوزيعات</li>
            <li>نشاط السوق الثانوية</li>
            <li>تقارير السيولة السنوية</li>
          </ul>

          <h2>7. تقنية مدمجة بالامتثال</h2>
          <p>التقنية في كابي مكس RT ليست بمعزل عن التنظيم.</p>
          <p>تُطلَق العقود الذكية بما يتوافق مع:</p>
          <ul>
            <li>الهيكل القانوني للولاية القضائية</li>
            <li>تطبيق متطلبات التحقق من الهوية / مكافحة غسل الأموال</li>
            <li>قيود النقل</li>
            <li>معايير أهلية الملّاك</li>
          </ul>
          <p>ويضمن ذلك توافق التنفيذ على البلوك تشين مع النفاذ القانوني.</p>

          <h2>8. التطوير والمراقبة المستمران</h2>
          <p>تخضع المنظومة التقنية لكابي مكس RT إلى:</p>
          <ul>
            <li>مراجعة أمنية مستمرة</li>
            <li>تحديثات دورية للأنظمة</li>
            <li>التكيّف مع متطلبات الامتثال</li>
            <li>تحسينات في مراقبة المخاطر</li>
          </ul>
          <p>تتبع حوكمة التقنية بروتوكولات مراجعة داخلية منظّمة.</p>
        </section>
      </InfoPageLayout>
    );
  }

  if (isFr) {
    return (
      <InfoPageLayout
        title="Technologie"
        subtitle="Une infrastructure sécurisée pour l'immobilier tokenisé"
      >
        <section className="info-section">
          <p className="info-intro">
            Capimax RT repose sur une infrastructure native blockchain conçue pour garantir la force
            juridique exécutoire, la sécurité technique, la transparence des actifs et la protection des propriétaires.
            Notre cadre technologique associe des structures juridiques réglementées à des contrats intelligents audités afin
            d'offrir une tokenisation immobilière de niveau institutionnel.
          </p>

          <h2>1. Infrastructure blockchain</h2>
          <h3>Couche réseau</h3>
          <p>Capimax RT utilise un réseau blockchain public optimisé pour :</p>
          <ul>
            <li>Une sécurité élevée des transactions</li>
            <li>Une vérification transparente sur la chaîne</li>
            <li>Des registres de propriété immuables</li>
            <li>Un règlement efficace</li>
          </ul>
          <h3>Principes fondamentaux</h3>
          <ul>
            <li>Validation par registre décentralisé</li>
            <li>Émission transparente des jetons</li>
            <li>Historique des transactions vérifiable publiquement</li>
            <li>Compatibilité avec les portefeuilles non dépositaires</li>
          </ul>
          <p>
            Chaque actif tokenisé est déployé au moyen d'un contrat intelligent dédié, rattaché à l'entité
            juridique correspondante (structure SPV/CBV).
          </p>

          <h2>2. Cadre des contrats intelligents</h2>
          <h3>Contrats intelligents au niveau de l'actif</h3>
          <p>Chaque bien sur Capimax RT est représenté par un contrat intelligent dédié qui régit :</p>
          <ul>
            <li>L'émission des jetons</li>
            <li>La répartition de la propriété</li>
            <li>Les restrictions de transfert</li>
            <li>La logique de distribution</li>
            <li>Les contrôles de conformité</li>
          </ul>
          <h3>Fonctionnalités des contrats intelligents</h3>
          <ul>
            <li>Transfert secondaire encadré (fenêtre de liquidité annuelle)</li>
            <li>Validation des accès fondée sur la vérification d'identité (KYC)</li>
            <li>Liste blanche des portefeuilles</li>
            <li>Logique d'application de la conformité</li>
            <li>Mécanismes de distribution automatisés</li>
          </ul>
          <p>
            Les contrats intelligents sont structurés de manière à refléter les droits juridiques prévus dans la documentation de la SPV.
          </p>

          <h2>3. Architecture de sécurité</h2>
          <p>
            Capimax RT applique un cadre de sécurité multicouche conçu pour atténuer les risques techniques et
            opérationnels.
          </p>
          <h3>Sécurité de l'infrastructure</h3>
          <ul>
            <li>Renforcement de l'infrastructure cloud</li>
            <li>Transmission chiffrée des données (SSL/TLS)</li>
            <li>Architecture réseau segmentée</li>
          </ul>
          <h3>Sécurité des applications</h3>
          <ul>
            <li>Contrôles d'accès fondés sur les rôles</li>
            <li>Authentification multifacteur</li>
            <li>Analyse continue des vulnérabilités</li>
          </ul>
          <h3>Sécurité des contrats intelligents</h3>
          <ul>
            <li>Validation par audit externe</li>
            <li>Vérification du code</li>
            <li>Contrôles d'intégrité du déploiement</li>
          </ul>
          <h3>Sécurité opérationnelle</h3>
          <ul>
            <li>Contrôle strict des accès internes</li>
            <li>Séparation des tâches</li>
            <li>Protocoles de surveillance continue</li>
          </ul>

          <h2>4. Modèle de conservation</h2>
          <p>Capimax RT prend en charge une structure de conservation hybride.</p>
          <h3>Conservation des jetons</h3>
          <ul>
            <li>Les propriétaires peuvent détenir leurs jetons dans des portefeuilles approuvés</li>
            <li>La liste blanche garantit l'alignement sur les exigences de conformité</li>
            <li>Intégrations facultatives avec des dépositaires tiers (le cas échéant)</li>
          </ul>
          <h3>Conservation des actifs</h3>
          <ul>
            <li>Les actifs immobiliers sous-jacents sont détenus au sein de SPV/CBV juridiquement immatriculées</li>
            <li>Supervision indépendante de la gestion immobilière</li>
            <li>Mécanismes structurés d'encaissement des revenus</li>
          </ul>
          <p>Le modèle de conservation garantit la séparation entre :</p>
          <ul>
            <li>Les opérations de la plateforme</li>
            <li>La propriété des actifs</li>
            <li>Les jetons détenus par les propriétaires</li>
          </ul>

          <h2>5. Audit &amp; vérification</h2>
          <p>La transparence et la vérification sont des piliers fondamentaux.</p>
          <h3>Audit des contrats intelligents</h3>
          <ul>
            <li>Audits de sécurité indépendants réalisés par des tiers</li>
            <li>Analyse des vulnérabilités du code</li>
            <li>Synthèses d'audit publiques (le cas échéant)</li>
          </ul>
          <h3>Supervision financière &amp; opérationnelle</h3>
          <ul>
            <li>Reporting au niveau de chaque bien</li>
            <li>Validation des revenus</li>
            <li>Supervision comptable structurée</li>
          </ul>
          <p>
            La documentation d'audit et les synthèses de vérification sont mises à la disposition des parties prenantes via le
            portail de transparence.
          </p>

          <h2>6. Transparence des données</h2>
          <p>Capimax RT offre une visibilité structurée sur l'ensemble de l'écosystème.</p>
          <h3>Transparence sur la chaîne</h3>
          <ul>
            <li>Vérification de l'offre de jetons</li>
            <li>Répartition de la propriété</li>
            <li>Registres des transactions</li>
          </ul>
          <h3>Transparence hors chaîne</h3>
          <ul>
            <li>Performance financière du bien</li>
            <li>Distributions de rendement</li>
            <li>Mises à jour des évaluations</li>
            <li>Rapports sur les actifs</li>
          </ul>
          <p>Les propriétaires conservent l'accès à :</p>
          <ul>
            <li>Tableau de bord du portefeuille</li>
            <li>Historique des distributions</li>
            <li>Activité sur le marché secondaire</li>
            <li>Rapports annuels de liquidité</li>
          </ul>

          <h2>7. Une technologie intégrant la conformité</h2>
          <p>Chez Capimax RT, la technologie n'est pas dissociée de la réglementation.</p>
          <p>Les contrats intelligents sont déployés en cohérence avec :</p>
          <ul>
            <li>La structure juridique de la juridiction</li>
            <li>L'application des règles KYC / AML</li>
            <li>Les restrictions de transfert</li>
            <li>Les critères d'éligibilité des propriétaires</li>
          </ul>
          <p>Cela garantit que l'exécution sur la blockchain est conforme à la force juridique exécutoire.</p>

          <h2>8. Développement &amp; surveillance continus</h2>
          <p>L'environnement technologique de Capimax RT fait l'objet :</p>
          <ul>
            <li>D'une revue de sécurité continue</li>
            <li>De mises à jour périodiques des systèmes</li>
            <li>D'une adaptation aux exigences de conformité</li>
            <li>D'améliorations de la surveillance des risques</li>
          </ul>
          <p>La gouvernance technologique suit des protocoles structurés de revue interne.</p>
        </section>
      </InfoPageLayout>
    );
  }

  return (
    <InfoPageLayout
      title="Technology"
      subtitle="Secure Infrastructure for Tokenized Real Estate"
    >
      <section className="info-section">
        <p className="info-intro">
          Capimax RT operates on a blockchain-native infrastructure designed to ensure legal
          enforceability, technical security, asset transparency, and owner protection.
          Our technology framework integrates regulated legal structures with audited smart contracts to
          deliver institutional-grade real estate tokenization.
        </p>

        <h2>1. Blockchain Infrastructure</h2>
        <h3>Network Layer</h3>
        <p>Capimax RT utilizes a public blockchain network optimized for:</p>
        <ul>
          <li>High transaction security</li>
          <li>Transparent on-chain verification</li>
          <li>Immutable ownership records</li>
          <li>Efficient settlement</li>
        </ul>
        <h3>Core Principles</h3>
        <ul>
          <li>Decentralized ledger validation</li>
          <li>Transparent token issuance</li>
          <li>Publicly verifiable transaction history</li>
          <li>Non-custodial compatibility</li>
        </ul>
        <p>
          Each tokenized asset is deployed via a dedicated smart contract, linked to its corresponding legal
          entity (SPV/CBV structure).
        </p>

        <h2>2. Smart Contract Framework</h2>
        <h3>Asset-Level Smart Contracts</h3>
        <p>Each property on Capimax RT is represented by a dedicated smart contract that governs:</p>
        <ul>
          <li>Token issuance</li>
          <li>Ownership allocation</li>
          <li>Transfer restrictions</li>
          <li>Distribution logic</li>
          <li>Compliance controls</li>
        </ul>
        <h3>Smart Contract Capabilities</h3>
        <ul>
          <li>Controlled secondary transfer (annual liquidity window)</li>
          <li>KYC-based access validation</li>
          <li>Wallet whitelisting</li>
          <li>Compliance enforcement logic</li>
          <li>Automated distribution mechanisms</li>
        </ul>
        <p>
          Smart contracts are structured to reflect the legal rights embedded in the SPV documentation.
        </p>

        <h2>3. Security Architecture</h2>
        <p>
          Capimax RT follows a multi-layer security framework designed to mitigate technical and
          operational risks.
        </p>
        <h3>Infrastructure Security</h3>
        <ul>
          <li>Cloud infrastructure hardening</li>
          <li>Encrypted data transmission (SSL/TLS)</li>
          <li>Segmented network architecture</li>
        </ul>
        <h3>Application Security</h3>
        <ul>
          <li>Role-based access controls</li>
          <li>Multi-factor authentication</li>
          <li>Continuous vulnerability scanning</li>
        </ul>
        <h3>Smart Contract Security</h3>
        <ul>
          <li>External audit validation</li>
          <li>Code verification</li>
          <li>Deployment integrity checks</li>
        </ul>
        <h3>Operational Security</h3>
        <ul>
          <li>Strict internal access control</li>
          <li>Segregation of duties</li>
          <li>Continuous monitoring protocols</li>
        </ul>

        <h2>4. Custody Model</h2>
        <p>Capimax RT supports a hybrid custody structure.</p>
        <h3>Token Custody</h3>
        <ul>
          <li>Owners may hold tokens in approved wallets</li>
          <li>Whitelisting ensures compliance alignment</li>
          <li>Optional third-party custody integrations (where applicable)</li>
        </ul>
        <h3>Asset Custody</h3>
        <ul>
          <li>Underlying real estate assets are held within legally registered SPVs/CBVs</li>
          <li>Independent property management oversight</li>
          <li>Structured revenue collection mechanisms</li>
        </ul>
        <p>The custody model ensures separation between:</p>
        <ul>
          <li>Platform operations</li>
          <li>Asset ownership</li>
          <li>Owner token holdings</li>
        </ul>

        <h2>5. Audit &amp; Verification</h2>
        <p>Transparency and verification are fundamental pillars.</p>
        <h3>Smart Contract Audit</h3>
        <ul>
          <li>Independent third-party security audits</li>
          <li>Code vulnerability analysis</li>
          <li>Public audit summaries (where applicable)</li>
        </ul>
        <h3>Financial &amp; Operational Oversight</h3>
        <ul>
          <li>Property-level reporting</li>
          <li>Revenue validation</li>
          <li>Structured accounting oversight</li>
        </ul>
        <p>
          Audit documentation and verification summaries are made accessible to stakeholders through the
          transparency portal.
        </p>

        <h2>6. Data Transparency</h2>
        <p>Capimax RT provides structured visibility across the ecosystem.</p>
        <h3>On-Chain Transparency</h3>
        <ul>
          <li>Token supply verification</li>
          <li>Ownership distribution</li>
          <li>Transaction records</li>
        </ul>
        <h3>Off-Chain Transparency</h3>
        <ul>
          <li>Property financial performance</li>
          <li>Yield distributions</li>
          <li>Valuation updates</li>
          <li>Asset reports</li>
        </ul>
        <p>Owners maintain access to:</p>
        <ul>
          <li>Portfolio dashboard</li>
          <li>Distribution history</li>
          <li>Secondary market activity</li>
          <li>Annual liquidity reports</li>
        </ul>

        <h2>7. Compliance-Integrated Technology</h2>
        <p>Technology at Capimax RT is not isolated from regulation.</p>
        <p>Smart contracts are deployed in alignment with:</p>
        <ul>
          <li>Jurisdictional legal structure</li>
          <li>KYC / AML enforcement</li>
          <li>Transfer restrictions</li>
          <li>Owner eligibility criteria</li>
        </ul>
        <p>This ensures that blockchain execution aligns with legal enforceability.</p>

        <h2>8. Continuous Development &amp; Monitoring</h2>
        <p>The Capimax RT technology stack is subject to:</p>
        <ul>
          <li>Ongoing security review</li>
          <li>Periodic system updates</li>
          <li>Compliance adaptation</li>
          <li>Risk monitoring enhancements</li>
        </ul>
        <p>Technology governance follows structured internal review protocols.</p>
      </section>
    </InfoPageLayout>
  );
};
