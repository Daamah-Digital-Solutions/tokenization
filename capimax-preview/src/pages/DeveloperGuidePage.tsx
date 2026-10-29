import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const DeveloperGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل المطوّر' : isFr ? 'Guide du promoteur' : "Developer's Guide"}
      subtitle={isAr ? 'منصة كابي مكس RT – دليل المطوّر' : isFr ? 'Plateforme Capimax RT – Guide du promoteur' : "Capimax RT Platform – Developer's Guide"}
    >
      {isAr ? (
      <section className="info-section">
        <h2>1. ترميز العقارات</h2>
        <ul>
          <li>تحويل العقارات إلى وحدات رقمية (رموز رقمية) تمثّل حصصًا جزئية من العقار.</li>
          <li>يتيح للمطوّر بيع الملكية الكاملة أو الجزئية للعقارات مع الاحتفاظ بوحدات معينة لاستمرار الدخل.</li>
          <li>تضمن العقود الذكية تنفيذ جميع الشروط لكلٍّ من المطوّر والشركاء الملاك.</li>
        </ul>

        <h2>2. الملكية الجزئية</h2>
        <ul>
          <li>يمكن للشركاء الملاك تملّك حصص جزئية في العقارات، بما يخفض عوائق الدخول ويوزّع المخاطر.</li>
          <li>تمكّن المطوّرين من جمع رأس المال بكفاءة للمشاريع القائمة أو الجديدة.</li>
          <li>يمكن للمطوّرين الاحتفاظ بجزء من الملكية لتحقيق دخل مستمر أو الاستفادة من ارتفاع قيمة العقار.</li>
        </ul>

        <h2>3. البلوك تشين والعقود الذكية</h2>
        <ul>
          <li><strong>البلوك تشين:</strong> سجل آمن وشفاف لجميع العمليات المتعلقة بالعقار.</li>
          <li><strong>العقود الذكية:</strong> تنفّذ تلقائيًا جميع الشروط القانونية والمالية، بما في ذلك الاكتتاب والتحصيل والتوزيع.</li>
          <li><strong>المزايا للمطوّرين:</strong> تضمن الالتزام بالعقود، وتتيح إدارة شفافة لحصص العقار، وتقلّل المخاطر القانونية والتشغيلية.</li>
        </ul>

        <h2>4. مزايا المنصة للمطوّرين</h2>
        <ol>
          <li>ترميز العقارات وتحويلها إلى وحدات رقمية.</li>
          <li>تنفّذ العقود الذكية جميع شروط الاكتتاب والبيع.</li>
          <li>إدراج العقارات على المنصة لاكتتاب الشركاء الملاك.</li>
          <li>أدوات تسويق للترويج للمشاريع عالميًا.</li>
          <li>تحصيل آلي للأموال من المشترين.</li>
          <li>لوحة تحكم متكاملة لإدارة الاكتتاب ومتابعة التقدّم وإصدار تقارير تفصيلية.</li>
          <li>دعم من شركات التقييم والتأمين والإدارة لتسهيل تنفيذ المشروع بسلاسة.</li>
          <li>محفظة رقمية لسحب الأموال عالميًا عبر العملات المشفّرة أو القنوات المصرفية التقليدية.</li>
          <li>تقارير دورية عن أداء المشروع ومشاركة الشركاء الملاك.</li>
          <li>
            <strong>مرونة ومزايا خاصة بالمطوّر:</strong>
            <ul>
              <li>إمكانية ترميز وبيع عقارات جاهزة للتأجير ذات عوائد.</li>
              <li>إمكانية ترميز وبيع مشاريع تطويرية عبر أربع جولات للمشروع.</li>
              <li>إمكانية ترميز عقارات قيد الإنشاء بخطط أقساط.</li>
              <li>الاحتفاظ بجزء من المشروع للحفاظ على دخل مستمر.</li>
              <li>خيار الاحتفاظ بإدارة المشروع عبر شركة خارجية، بما يضمن السيولة والسيطرة.</li>
              <li>رقابة شفافة على جميع الوحدات والشركاء الملاك والتدفقات المالية عبر لوحات تحكم المنصة.</li>
            </ul>
          </li>
        </ol>

        <h2>5. اتفاقية الملكية بين المطوّر والمنصة</h2>
        <p>
          تحدّد اتفاقية الملكية جميع التفاصيل القانونية والمالية والتوثيقية الخاصة بالعقار
          والمشروع، بما في ذلك:
        </p>
        <ul>
          <li>البيانات الكاملة للعقار والمشروع، والمستندات القانونية والفنية.</li>
          <li>شركات التقييم والإدارة المعتمدة.</li>
          <li>الرسوم: الترميز، والإدارة، والإدراج، والاكتتاب، والشركة ذات الغرض الخاص (SPV)، والتقييم.</li>
          <li>آلية نقل ملكية المشروع/العقار إلى الشركة ذات الغرض الخاص (SPV).</li>
          <li>الالتزامات القانونية والمالية لكلٍّ من المطوّر والمنصة.</li>
        </ul>
        <p>
          <strong>مهم:</strong> يجب توقيع الاتفاقية قبل أي مرحلة أخرى.
        </p>
        <p>
          <strong>في حال عدم اكتمال الاكتتاب:</strong> تحدّد الاتفاقية إجراءات إنهائها أو تجديدها
          حتى اكتمال الاكتتاب.
        </p>

        <h2>6. الشروط والأحكام الخاصة بالإدراج والمسؤوليات القانونية</h2>
        <ul>
          <li>تقديم مستندات دقيقة وكاملة.</li>
          <li>الالتزام بالجداول الزمنية والمراحل المحددة للإدراج والاكتتاب.</li>
          <li>الامتثال للقوانين واللوائح المحلية والدولية.</li>
          <li>المطوّر مسؤول عن دقة جميع المستندات.</li>
          <li>المنصة مسؤولة عن إدارة الاكتتاب والتحقق من خلال العقود الذكية.</li>
        </ul>

        <h2>7. رسوم المطوّرين</h2>
        <ol>
          <li><strong>رسوم الترميز:</strong> لتحويل العقار/المشروع إلى وحدات رقمية.</li>
          <li><strong>رسوم الإدارة:</strong> لتشغيل المنصة وإدارة الاكتتاب.</li>
          <li><strong>رسوم الإدراج والاكتتاب:</strong> للإدراج على المنصة واكتتاب الشركاء الملاك.</li>
          <li><strong>رسوم الشركة ذات الغرض الخاص (SPV):</strong> لتأسيس وإدارة شركة ذات غرض خاص لكل عقار/مشروع.</li>
          <li><strong>رسوم التقييم:</strong> أتعاب شركات التقييم المعتمدة لتقييم المشروع/العقار.</li>
        </ol>

        <h2>8. المستندات المطلوبة من المطوّر</h2>
        <ol>
          <li>سند ملكية العقار أو العقد القانوني للمشروع.</li>
          <li>المخططات المعمارية والتراخيص القانونية.</li>
          <li>تقرير تقييم حديث صادر عن شركات معتمدة.</li>
          <li>شهادات التأمين، إن وُجدت.</li>
          <li>مستندات الهوية القانونية للمطوّر أو الشركة.</li>
          <li>المستندات المالية المتعلقة بالديون أو الالتزامات على العقار/المشروع.</li>
          <li>أي اتفاقيات قائمة مع الشركاء الملاك الحاليين أو المستأجرين أو الشركاء.</li>
        </ol>

        <h2>9. مراحل إدراج العقار/المشروع حتى الاكتتاب</h2>

        <h3>المرحلة 0: توقيع اتفاقية الملكية</h3>
        <ul>
          <li>يجب توقيعها قبل أي مرحلة أخرى.</li>
          <li>تحدّد جميع التفاصيل القانونية والمالية والتوثيقية.</li>
          <li>تحدّد الرسوم وآلية نقل الملكية إلى الشركة ذات الغرض الخاص (SPV).</li>
        </ul>

        <h3>المرحلة 1: المعاينة والتقييم والاعتماد</h3>
        <ul>
          <li>الاتفاق على جهة التقييم.</li>
          <li>تقرير شامل عن المشروع/العقار يتضمن النوع والموقع والعوائد المتوقعة والمخاطر.</li>
          <li>اعتماد المشروع/العقار للاكتتاب.</li>
        </ul>

        <h3>المرحلة 2: تأسيس الشركة ذات الغرض الخاص (SPV) وإعداد العقد الذكي</h3>
        <ul>
          <li>الاتفاق على الجهة التي ستؤسس الشركة ذات الغرض الخاص (SPV).</li>
          <li>تحويل العقار/المشروع إلى رموز رقمية عبر الشركة ذات الغرض الخاص (SPV).</li>
          <li>إعداد العقود الذكية للتنفيذ القانوني والمالي لكل وحدة.</li>
        </ul>

        <h3>المرحلة 3: الإدراج على المنصة وفتح الاكتتاب</h3>
        <ul>
          <li>الإدراج على كابي مكس RT.</li>
          <li>لوحة تحكم للمطوّر لإدارة الاكتتاب ومتابعة الطلبات والتحكم في الجدول الزمني.</li>
        </ul>

        <h3>المرحلة 4: التسويق واستقطاب المشترين</h3>
        <ul>
          <li>أدوات ترويج رقمية للوصول العالمي.</li>
          <li>تقارير واضحة عن العوائد والمخاطر لكل شريك مالك.</li>
        </ul>

        <h3>المرحلة 5: تحصيل الأموال واكتمال الاكتتاب</h3>
        <ul>
          <li>استلام الأموال عبر المحفظة الرقمية أو القنوات المصرفية.</li>
          <li>توزيع الرموز الرقمية تلقائيًا على الشركاء الملاك عبر العقود الذكية.</li>
        </ul>

        <h3>المرحلة 6: الإدارة بعد الاكتتاب</h3>
        <p>بعد الاكتتاب النهائي:</p>
        <ul>
          <li>يستلم المطوّر الأموال.</li>
          <li>التنفيذ الكامل لاتفاقية الملكية.</li>
          <li>نقل الملكية إلى الشركة ذات الغرض الخاص (SPV).</li>
        </ul>
        <p>إدارة حصص المطوّر والشركاء الملاك، والتخارج عبر السوق السنوية أو مزوّد السيولة.</p>
        <p>
          <strong>في حال عدم اكتمال الاكتتاب:</strong> تحدّد بنود اتفاقية الملكية إجراءات إنهاء
          الاتفاقية أو تجديدها حتى اكتمال الاكتتاب.
        </p>

        <h2>10. مسؤوليات المطوّر والمنصة</h2>
        <h3>مسؤوليات المطوّر:</h3>
        <ul>
          <li>تقديم مستندات دقيقة وكاملة.</li>
          <li>الامتثال لجميع المتطلبات القانونية والتنظيمية.</li>
          <li>متابعة التقارير المالية وضمان الالتزام بالعقود الذكية.</li>
          <li>التعاون مع شركات التقييم والتأمين والإدارة.</li>
          <li>الالتزام بالشروط والرسوم المحددة في اتفاقية الملكية.</li>
        </ul>
        <h3>مسؤوليات المنصة:</h3>
        <ul>
          <li>إدارة عمليات الترميز والاكتتاب والشركة ذات الغرض الخاص (SPV) والبلوك تشين.</li>
          <li>التحقق من المستندات القانونية والمالية.</li>
          <li>إدارة تحصيل الأموال وتحويل المدفوعات إلى المطوّر بعد اكتمال الاكتتاب.</li>
          <li>توفير لوحات التحكم والتقارير والتحليلات.</li>
          <li>توفير أدوات التسويق والترويج.</li>
          <li>الالتزام بشروط اتفاقية الملكية الموقّعة.</li>
        </ul>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <h2>1. Tokenisation immobilière</h2>
        <ul>
          <li>Conversion des biens en unités numériques (jetons) représentant des parts fractionnées du bien.</li>
          <li>Permet au promoteur de vendre tout ou partie de la propriété des biens tout en conservant certaines unités pour un revenu continu.</li>
          <li>Les contrats intelligents garantissent l'exécution de toutes les conditions, tant pour le promoteur que pour les copropriétaires.</li>
        </ul>

        <h2>2. Propriété fractionnée</h2>
        <ul>
          <li>Les copropriétaires peuvent acquérir des parts fractionnées de biens, ce qui abaisse le seuil d'entrée et répartit le risque.</li>
          <li>Permet aux promoteurs de lever des capitaux efficacement pour des projets en cours ou nouveaux.</li>
          <li>Les promoteurs peuvent conserver une partie de la propriété afin de générer un revenu continu ou de profiter de la valorisation du bien.</li>
        </ul>

        <h2>3. Blockchain et contrats intelligents</h2>
        <ul>
          <li><strong>Blockchain :</strong> un registre sécurisé et transparent pour toutes les opérations liées aux biens.</li>
          <li><strong>Contrats intelligents :</strong> appliquent automatiquement toutes les conditions juridiques et financières, y compris la souscription, l'encaissement et la distribution.</li>
          <li><strong>Avantages pour les promoteurs :</strong> garantissent le respect des contrats, permettent une gestion transparente des parts des biens et réduisent les risques juridiques et opérationnels.</li>
        </ul>

        <h2>4. Fonctionnalités de la plateforme pour les promoteurs</h2>
        <ol>
          <li>Tokeniser les biens et les convertir en unités numériques.</li>
          <li>Les contrats intelligents appliquent toutes les conditions de souscription et de vente.</li>
          <li>Mettre en ligne les biens sur la plateforme pour la souscription des copropriétaires.</li>
          <li>Outils marketing pour promouvoir les projets à l'international.</li>
          <li>Encaissement automatisé des fonds des acheteurs.</li>
          <li>Tableau de bord intégré pour gérer la souscription, suivre l'avancement et générer des rapports détaillés.</li>
          <li>Accompagnement par des sociétés d'évaluation, d'assurance et de gestion pour faciliter la bonne exécution des projets.</li>
          <li>Portefeuille numérique pour retirer des fonds dans le monde entier, en cryptomonnaies ou par voie bancaire traditionnelle.</li>
          <li>Rapports périodiques sur la performance des projets et la participation des copropriétaires.</li>
          <li>
            <strong>Flexibilité et avantages propres aux promoteurs :</strong>
            <ul>
              <li>Possibilité de tokeniser et de vendre des biens prêts à la location, générant des rendements.</li>
              <li>Possibilité de tokeniser et de vendre des projets de développement répartis en quatre tours de financement.</li>
              <li>Possibilité de tokeniser des biens en construction avec des plans de paiement échelonné.</li>
              <li>Conserver une partie du projet pour maintenir un revenu continu.</li>
              <li>Option de conserver la gestion du projet via une société externe, garantissant liquidité et contrôle.</li>
              <li>Supervision transparente de toutes les unités, des copropriétaires et des flux financiers via les tableaux de bord de la plateforme.</li>
            </ul>
          </li>
        </ol>

        <h2>5. Contrat de propriété entre le promoteur et la plateforme</h2>
        <p>
          Le Contrat de propriété définit toutes les informations juridiques, financières et documentaires du
          bien et du projet, notamment :
        </p>
        <ul>
          <li>L'ensemble des données du bien et du projet, ainsi que les documents juridiques et techniques.</li>
          <li>Les sociétés d'évaluation et de gestion agréées.</li>
          <li>Les frais : tokenisation, administration, mise en ligne, souscription, SPV et évaluation.</li>
          <li>Le mécanisme de transfert de la propriété du projet/bien à une SPV (société ad hoc).</li>
          <li>Les obligations juridiques et financières du promoteur et de la plateforme.</li>
        </ul>
        <p>
          <strong>Important :</strong> le contrat doit être signé avant toute autre étape.
        </p>
        <p>
          <strong>Si la souscription n'est pas achevée :</strong> le contrat définit les procédures permettant soit
          de le résilier, soit de le renouveler jusqu'à l'achèvement de la souscription.
        </p>

        <h2>6. Conditions générales de mise en ligne et responsabilités juridiques</h2>
        <ul>
          <li>Remise de documents exacts et complets.</li>
          <li>Respect des délais et des étapes définies pour la mise en ligne et la souscription.</li>
          <li>Conformité aux lois et réglementations locales et internationales.</li>
          <li>Le promoteur est responsable de l'exactitude de tous les documents.</li>
          <li>La plateforme est responsable de la gestion de la souscription et de la vérification via les contrats intelligents.</li>
        </ul>

        <h2>7. Frais à la charge des promoteurs</h2>
        <ol>
          <li><strong>Frais de tokenisation :</strong> pour convertir le bien/projet en unités numériques.</li>
          <li><strong>Frais d'administration :</strong> fonctionnement de la plateforme et gestion de la souscription.</li>
          <li><strong>Frais de mise en ligne et de souscription :</strong> pour la mise en ligne sur la plateforme et la souscription des copropriétaires.</li>
          <li><strong>Frais de SPV :</strong> constitution et gestion de la SPV propre à chaque bien/projet.</li>
          <li><strong>Frais d'évaluation :</strong> honoraires des sociétés d'évaluation agréées pour l'évaluation du projet/bien.</li>
        </ol>

        <h2>8. Documents requis de la part du promoteur</h2>
        <ol>
          <li>Titre de propriété du bien ou contrat juridique du projet.</li>
          <li>Plans architecturaux et permis légaux.</li>
          <li>Rapport d'évaluation récent établi par des sociétés agréées.</li>
          <li>Attestations d'assurance, le cas échéant.</li>
          <li>Pièces d'identité légales du promoteur ou de la société.</li>
          <li>Documents financiers relatifs aux dettes ou obligations grevant le bien/projet.</li>
          <li>Tout accord existant avec les copropriétaires, locataires ou partenaires actuels.</li>
        </ol>

        <h2>9. Étapes de mise en ligne du bien/projet jusqu'à la souscription</h2>

        <h3>Étape 0 : signature du Contrat de propriété</h3>
        <ul>
          <li>Doit être signé avant toute autre étape.</li>
          <li>Définit toutes les informations juridiques, financières et documentaires.</li>
          <li>Fixe les frais et le mécanisme de transfert de la propriété à la SPV.</li>
        </ul>

        <h3>Étape 1 : inspection, évaluation et approbation</h3>
        <ul>
          <li>Accord sur l'organisme d'évaluation.</li>
          <li>Rapport complet sur le projet/bien comprenant le type, l'emplacement, les rendements attendus et les risques.</li>
          <li>Approbation du projet/bien pour la souscription.</li>
        </ul>

        <h3>Étape 2 : création de la SPV et mise en place des contrats intelligents</h3>
        <ul>
          <li>Accord sur l'entité chargée de constituer la SPV.</li>
          <li>Conversion du bien/projet en jetons numériques via la SPV.</li>
          <li>Préparation des contrats intelligents pour l'exécution juridique et financière de chaque unité.</li>
        </ul>

        <h3>Étape 3 : mise en ligne sur la plateforme et ouverture de la souscription</h3>
        <ul>
          <li>Mise en ligne sur Capimax RT.</li>
          <li>Tableau de bord permettant au promoteur de gérer la souscription, de suivre les demandes et de maîtriser le calendrier.</li>
        </ul>

        <h3>Étape 4 : marketing et attraction des acheteurs</h3>
        <ul>
          <li>Outils de promotion numérique pour une portée internationale.</li>
          <li>Rapports clairs sur les rendements et les risques pour chaque copropriétaire.</li>
        </ul>

        <h3>Étape 5 : encaissement des fonds et achèvement de la souscription</h3>
        <ul>
          <li>Réception des fonds via le portefeuille numérique ou les circuits bancaires.</li>
          <li>Les jetons sont distribués automatiquement aux copropriétaires via les contrats intelligents.</li>
        </ul>

        <h3>Étape 6 : gestion après la souscription</h3>
        <p>Après la souscription définitive :</p>
        <ul>
          <li>Le promoteur reçoit les fonds.</li>
          <li>Exécution intégrale du Contrat de propriété.</li>
          <li>Transfert de la propriété à la SPV.</li>
        </ul>
        <p>Gestion des parts du promoteur et des copropriétaires, sortie via le marché annuel ou le fournisseur de liquidité.</p>
        <p>
          <strong>Si la souscription n'est pas achevée :</strong> les clauses du Contrat de propriété définissent les procédures permettant
          soit de résilier, soit de renouveler le contrat jusqu'à l'achèvement de la souscription.
        </p>

        <h2>10. Responsabilités du promoteur et de la plateforme</h2>
        <h3>Responsabilités du promoteur :</h3>
        <ul>
          <li>Remettre des documents exacts et complets.</li>
          <li>Respecter toutes les exigences légales et réglementaires.</li>
          <li>Suivre les rapports financiers et veiller au respect des contrats intelligents.</li>
          <li>Coopérer avec les sociétés d'évaluation, d'assurance et de gestion.</li>
          <li>Respecter les conditions et les frais prévus dans le Contrat de propriété.</li>
        </ul>
        <h3>Responsabilités de la plateforme :</h3>
        <ul>
          <li>Gérer la tokenisation, la souscription et les opérations liées à la SPV et à la blockchain.</li>
          <li>Vérifier les documents juridiques et financiers.</li>
          <li>Gérer l'encaissement des fonds et verser les paiements au promoteur après l'achèvement de la souscription.</li>
          <li>Fournir des tableaux de bord, des rapports et des analyses.</li>
          <li>Fournir des outils de marketing et de promotion.</li>
          <li>Respecter les conditions du Contrat de propriété signé.</li>
        </ul>
      </section>
      ) : (
      <section className="info-section">
        <h2>1. Real Estate Tokenization</h2>
        <ul>
          <li>Convert properties into digital units (Tokens) representing fractional shares of the property.</li>
          <li>Allows the developer to sell full or partial ownership of properties while retaining certain units for continued income.</li>
          <li>Smart contracts guarantee the execution of all terms for both the developer and co-owners.</li>
        </ul>

        <h2>2. Fractional Ownership</h2>
        <ul>
          <li>Co-owners can acquire fractional shares in properties, reducing entry barriers and distributing risk.</li>
          <li>Enables developers to raise capital efficiently for ongoing or new projects.</li>
          <li>Developers can retain part of the ownership to generate ongoing income or profit from property appreciation.</li>
        </ul>

        <h2>3. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> A secure, transparent ledger for all property operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically enforce all legal and financial conditions, including subscription, collection, and distribution.</li>
          <li><strong>Benefits for Developers:</strong> Guarantees compliance with contracts, allows transparent management of property shares, reduces legal and operational risk.</li>
        </ul>

        <h2>4. Platform Features for Developers</h2>
        <ol>
          <li>Tokenize properties and convert them into digital units.</li>
          <li>Smart contracts enforce all subscription and sale conditions.</li>
          <li>List properties on the platform for co-owner subscription.</li>
          <li>Marketing tools to promote projects globally.</li>
          <li>Automated fund collection from buyers.</li>
          <li>Integrated dashboard to manage subscription, track progress, and generate detailed reports.</li>
          <li>Support from evaluation, insurance, and management companies to facilitate smooth project execution.</li>
          <li>Digital wallet to withdraw funds globally via cryptocurrencies or traditional banking.</li>
          <li>Periodic reports on project performance and co-owner participation.</li>
          <li>
            <strong>Developer-Specific Flexibility &amp; Advantages:</strong>
            <ul>
              <li>Ability to tokenize and sell ready-to-rent properties with returns.</li>
              <li>Ability to tokenize and sell development projects through four project rounds.</li>
              <li>Ability to tokenize under-construction properties with installment plans.</li>
              <li>Retain part of the project to maintain ongoing income.</li>
              <li>Option to retain project management via an external company, ensuring liquidity and control.</li>
              <li>Transparent oversight of all units, co-owners, and financial flows via platform dashboards.</li>
            </ul>
          </li>
        </ol>

        <h2>5. Ownership Agreement Between Developer and Platform</h2>
        <p>
          The Ownership Agreement defines all legal, financial, and documentation details of the
          property and project, including:
        </p>
        <ul>
          <li>Complete property and project data, legal and technical documents.</li>
          <li>Accredited evaluation and management companies.</li>
          <li>Fees: tokenization, administration, listing, subscription, SPV, and evaluation.</li>
          <li>Mechanism to transfer project/property ownership to an SPV (Special Purpose Vehicle).</li>
          <li>Legal and financial obligations of both the developer and platform.</li>
        </ul>
        <p>
          <strong>Important:</strong> Agreement must be signed before any other stage.
        </p>
        <p>
          <strong>In case subscription is not completed:</strong> Agreement defines procedures for either
          terminating or renewing until subscription completion.
        </p>

        <h2>6. Terms &amp; Conditions for Listing and Legal Responsibilities</h2>
        <ul>
          <li>Submission of accurate and complete documentation.</li>
          <li>Adherence to timelines and defined stages for listing and subscription.</li>
          <li>Compliance with local and international laws and regulations.</li>
          <li>Developer responsible for accuracy of all documents.</li>
          <li>Platform responsible for subscription management and verification through smart contracts.</li>
        </ul>

        <h2>7. Fees for Developers</h2>
        <ol>
          <li><strong>Tokenization Fee:</strong> To convert property/project into digital units.</li>
          <li><strong>Administration Fee:</strong> Platform operation and subscription management.</li>
          <li><strong>Listing &amp; Subscription Fees:</strong> For platform listing and co-owner subscription.</li>
          <li><strong>SPV Fee:</strong> Establishment and management of SPV for each property/project.</li>
          <li><strong>Evaluation Fee:</strong> Accredited evaluation companies' fees for project/property assessment.</li>
        </ol>

        <h2>8. Required Documents from Developer</h2>
        <ol>
          <li>Property ownership deed or project legal contract.</li>
          <li>Architectural plans and legal permits.</li>
          <li>Recent evaluation report from accredited companies.</li>
          <li>Insurance certificates, if applicable.</li>
          <li>Legal identification documents for the developer or company.</li>
          <li>Financial documents relating to debts or obligations on the property/project.</li>
          <li>Any existing agreements with current co-owners, tenants, or partners.</li>
        </ol>

        <h2>9. Property/Project Listing Stages Until Subscription</h2>

        <h3>Stage 0: Signing the Ownership Agreement</h3>
        <ul>
          <li>Must be signed before any other stage.</li>
          <li>Defines all legal, financial, and documentation details.</li>
          <li>Establishes fees and mechanism for SPV ownership transfer.</li>
        </ul>

        <h3>Stage 1: Inspection, Evaluation, and Approval</h3>
        <ul>
          <li>Agreement on evaluation entity.</li>
          <li>Comprehensive project/property report including type, location, expected returns, and risks.</li>
          <li>Project/property approved for subscription.</li>
        </ul>

        <h3>Stage 2: SPV Creation &amp; Smart Contract Setup</h3>
        <ul>
          <li>Agreement on entity establishing SPV.</li>
          <li>Conversion of property/project into digital tokens via SPV.</li>
          <li>Smart contracts prepared for legal and financial execution of each unit.</li>
        </ul>

        <h3>Stage 3: Platform Listing &amp; Subscription Opening</h3>
        <ul>
          <li>Listing on Capimax RT.</li>
          <li>Dashboard for developer to manage subscription, track requests, and control timeline.</li>
        </ul>

        <h3>Stage 4: Marketing &amp; Buyer Attraction</h3>
        <ul>
          <li>Digital promotion tools for global reach.</li>
          <li>Clear reports on returns and risks for each co-owner.</li>
        </ul>

        <h3>Stage 5: Fund Collection &amp; Subscription Completion</h3>
        <ul>
          <li>Receive funds via digital wallet or banking channels.</li>
          <li>Tokens automatically distributed to co-owners via smart contracts.</li>
        </ul>

        <h3>Stage 6: Post-Subscription Management</h3>
        <p>After final subscription:</p>
        <ul>
          <li>Developer receives funds.</li>
          <li>Full execution of Ownership Agreement.</li>
          <li>Ownership transferred to SPV.</li>
        </ul>
        <p>Manage developer and co-owner shares, exit via annual market or liquidity provider.</p>
        <p>
          <strong>In Case Subscription Is Not Completed:</strong> Ownership Agreement clauses define procedures to
          either terminate or renew the agreement until subscription completion.
        </p>

        <h2>10. Developer &amp; Platform Responsibilities</h2>
        <h3>Developer Responsibilities:</h3>
        <ul>
          <li>Submit accurate, complete documents.</li>
          <li>Comply with all legal and regulatory requirements.</li>
          <li>Monitor financial reports and ensure compliance with smart contracts.</li>
          <li>Cooperate with evaluation, insurance, and management companies.</li>
          <li>Adhere to terms and fees specified in Ownership Agreement.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage tokenization, subscription, and SPV/blockchain operations.</li>
          <li>Verify legal and financial documentation.</li>
          <li>Manage fund collection and transfer payments to developer after subscription completion.</li>
          <li>Provide dashboards, reports, and analytics.</li>
          <li>Provide marketing and promotion tools.</li>
          <li>Adhere to terms of signed Ownership Agreement.</li>
        </ul>
      </section>
      )}
    </InfoPageLayout>
  );
};
