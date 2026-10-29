import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const OwnersGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل مالك العقار' : isFr ? 'Guide du propriétaire du bien' : "Owner's Guide"}
      subtitle={isAr ? 'منصة كابي مكس RT – دليل مالك العقار' : isFr ? 'Plateforme Capimax RT – Guide du propriétaire du bien' : "Capimax RT Platform – Owner's Guide"}
    >
      {isAr ? (
      <section className="info-section">
        <h2>1. ترميز العقارات</h2>
        <ul>
          <li>تحويل ملكية العقار إلى وحدات رقمية (رموز رقمية) تمثّل حصصًا جزئية من العقار.</li>
          <li>يتيح لمالك العقار بيع جزء من العقار أو الاحتفاظ ببعض الحصص لتحقيق دخل مستمر.</li>
          <li>تضمن العقود الذكية حماية حقوق كلٍّ من مالك العقار والشركاء الملاك.</li>
        </ul>

        <h2>2. الملكية الجزئية</h2>
        <ul>
          <li>تمكّن الشركاء الملاك من شراء حصص جزئية من العقار، بما يخفض عوائق الدخول ويوزّع المخاطر.</li>
          <li>توفّر لمالك العقار تمويلًا مرنًا للمشاريع دون الحاجة إلى قروض تقليدية.</li>
          <li>يمكن لمالك العقار الاحتفاظ بجزء من الملكية للحصول على دخل مستمر أو الاستفادة من ارتفاع قيمة العقار.</li>
        </ul>

        <h2>3. البلوك تشين والعقود الذكية</h2>
        <ul>
          <li><strong>البلوك تشين:</strong> قاعدة بيانات آمنة وشفافة لجميع العمليات العقارية.</li>
          <li><strong>العقود الذكية:</strong> تنفّذ تلقائيًا الشروط القانونية والمالية للعقد، بما في ذلك الاكتتاب والتحصيل والتوزيع.</li>
          <li><strong>المزايا لمالك العقار:</strong> تضمن الالتزام بالعقود، والإدارة الشفافة لحصص الملكية، وتقليل المخاطر القانونية.</li>
        </ul>

        <h2>4. مزايا المنصة لمالك العقار</h2>
        <ol>
          <li>ترميز العقار إلى وحدات رقمية.</li>
          <li>عقود ذكية لتنفيذ جميع شروط الاكتتاب والبيع.</li>
          <li>إدراج العقار على المنصة وفتحه للاكتتاب.</li>
          <li>أدوات ترويجية وتسويقية لاستقطاب المشترين.</li>
          <li>تحصيل آلي للأموال من المشترين.</li>
          <li>لوحة تحكم متكاملة لمتابعة الاكتتابات وإدارة حصص الملكية.</li>
          <li>دعم من شركات التقييم والتأمين والإدارة لتسهيل عملية الاكتتاب.</li>
          <li>محفظة رقمية لسحب الأموال من أي مكان في العالم باستخدام العملات المشفّرة أو الوسائل المصرفية التقليدية.</li>
          <li>تقارير دورية عن أداء العقار وحصص الشركاء الملاك.</li>
          <li><strong>مرونة مالك العقار:</strong> يمكن لمالك العقار بيع العقار بالكامل، أو بيع جزء منه، أو الاحتفاظ بإدارته لتحقيق دخل مستمر أو الإشراف على المشروع.</li>
        </ol>

        <h2>5. اتفاقية الملكية بين مالك العقار والمنصة</h2>
        <p>
          اتفاقية الملكية عقد أساسي بين مالك العقار وكابي مكس RT، يتضمن جميع التفاصيل القانونية
          والمالية والتوثيقية المتعلقة بالعقار، بما في ذلك:
        </p>
        <ul>
          <li>البيانات الكاملة للعقار والمستندات القانونية/الفنية.</li>
          <li>بيانات شركات التقييم المعتمدة.</li>
          <li>الرسوم المتعلقة بالترميز والإدارة والإدراج والاكتتاب والشركة ذات الغرض الخاص (SPV) والتقييم.</li>
          <li>آلية نقل ملكية العقار إلى الشركة ذات الغرض الخاص (SPV).</li>
          <li>الحقوق والالتزامات القانونية والمالية لكلٍّ من مالك العقار والمنصة.</li>
        </ul>
        <p>
          <strong>ملاحظة مهمة:</strong> يجب توقيع اتفاقية الملكية قبل أي مرحلة أخرى، إذ تشكّل الأساس
          القانوني لجميع إجراءات إدراج العقار والاكتتاب.
        </p>
        <p>
          <strong>في حال عدم نجاح الاكتتاب:</strong> تتضمن الاتفاقية بنودًا تحدّد إجراءات:
        </p>
        <ul>
          <li>إنهاء الاتفاقية قانونيًا، أو</li>
          <li>تجديد الاتفاقية حتى اكتمال الاكتتاب.</li>
        </ul>

        <h2>6. الشروط والأحكام الخاصة بإدراج العقار والمسؤوليات القانونية</h2>
        <ul>
          <li>تقديم مستندات دقيقة وكاملة إلى المنصة.</li>
          <li>الالتزام بالجدول الزمني والمراحل المحددة لإدراج العقار والاكتتاب.</li>
          <li>الالتزام بقوانين العقارات والملكية المحلية والدولية.</li>
          <li>يتحمّل مالك العقار المسؤولية عن أي مستندات غير دقيقة أو غير صحيحة.</li>
          <li>تتحمّل المنصة مسؤولية إدارة الاكتتاب والتحقق من صحة المعاملات عبر العقود الذكية.</li>
        </ul>

        <h2>7. الرسوم التي يجب أن يكون مالك العقار على علم بها</h2>
        <ol>
          <li><strong>رسوم ترميز العقار:</strong> لتحويل العقار إلى وحدات رقمية.</li>
          <li><strong>رسوم الإدارة:</strong> رسوم تشغيل المنصة وإدارة الاكتتاب.</li>
          <li><strong>رسوم الإدراج والاكتتاب:</strong> لإدراج العقار على المنصة وفتحه للمشترين.</li>
          <li><strong>رسوم الشركة ذات الغرض الخاص (SPV):</strong> لتأسيس وإدارة الشركة ذات الغرض الخاص لكل عقار.</li>
          <li><strong>رسوم التقييم:</strong> أتعاب شركات التقييم المعتمدة لإعداد تقارير دقيقة عن العقار.</li>
        </ol>

        <h2>8. المستندات المطلوبة من مالك العقار</h2>
        <ol>
          <li>سند ملكية العقار أو عقد الملكية.</li>
          <li>المخططات المعمارية وتراخيص البناء القانونية.</li>
          <li>شهادة تقييم حديثة للعقار صادرة عن شركات معتمدة.</li>
          <li>شهادة تأمين العقار، إن وُجدت.</li>
          <li>مستندات الهوية القانونية لمالك العقار أو الشركة المالكة.</li>
          <li>المستندات المالية المتعلقة بأي ديون أو التزامات على العقار.</li>
          <li>أي اتفاقيات قائمة مع الشركاء الملاك الحاليين أو المستأجرين.</li>
        </ol>

        <h2>9. مراحل إدراج العقار حتى الاكتتاب</h2>

        <h3>المرحلة 0: توقيع اتفاقية الملكية</h3>
        <ul>
          <li>تُوقَّع اتفاقية الملكية بين مالك العقار والمنصة قبل أي إجراءات أخرى.</li>
          <li>تحدّد الاتفاقية جميع التفاصيل القانونية والمالية والتوثيقية للعقار.</li>
          <li>الاتفاق على الرسوم وآلية نقل ملكية العقار إلى الشركة ذات الغرض الخاص (SPV).</li>
          <li>تشكّل الأساس القانوني لجميع مراحل الإدراج والاكتتاب.</li>
        </ul>

        <h3>المرحلة 1: المعاينة والتقييم والاعتماد</h3>
        <ul>
          <li>بعد توقيع الاتفاقية، يتفق مالك العقار والمنصة على جهة تقييم العقار.</li>
          <li>يصدر تقرير شامل عن العقار يتضمن الموقع ونوع العقار والعوائد المتوقعة والمخاطر.</li>
          <li>يُعتمد العقار للاكتتاب بناءً على تقييم موضوعي.</li>
        </ul>

        <h3>المرحلة 2: تأسيس الشركة ذات الغرض الخاص (SPV) وإعداد العقد الذكي</h3>
        <ul>
          <li>يتفق مالك العقار والمنصة على الجهة المسؤولة عن تأسيس الشركة ذات الغرض الخاص (SPV).</li>
          <li>يُحوَّل العقار إلى وحدات رقمية (رموز رقمية) عبر الشركة ذات الغرض الخاص (SPV).</li>
          <li>تُعدّ العقود الذكية لتحديد الشروط القانونية والمالية لكل وحدة.</li>
        </ul>

        <h3>المرحلة 3: الإدراج على المنصة والاكتتاب</h3>
        <ul>
          <li>يُدرج العقار على كابي مكس RT، ويُفتح الاكتتاب للمشترين.</li>
          <li>لوحة تحكم لمالك العقار لإدارة الاكتتاب ومتابعة الطلبات والتحكم في الجدول الزمني.</li>
        </ul>

        <h3>المرحلة 4: التسويق واستقطاب المشترين</h3>
        <ul>
          <li>أدوات تسويق عقاري رقمية لاستقطاب المشترين.</li>
          <li>تقارير واضحة عن العوائد المتوقعة والمخاطر لكل شريك مالك.</li>
        </ul>

        <h3>المرحلة 5: تحصيل الأموال واكتمال الاكتتاب</h3>
        <ul>
          <li>استلام الأموال من المشترين عبر المحفظة الرقمية أو البنوك.</li>
          <li>توزيع الحصص تلقائيًا على المشترين من خلال العقود الذكية.</li>
        </ul>

        <h3>المرحلة 6: الإدارة بعد الاكتتاب</h3>
        <p>بعد الاكتمال النهائي للاكتتاب:</p>
        <ul>
          <li>يستلم مالك العقار أمواله.</li>
          <li>التنفيذ الكامل لاتفاقية الملكية.</li>
          <li>نقل ملكية العقار إلى الشركة ذات الغرض الخاص (SPV) وفقًا لما تحدّده الاتفاقية.</li>
        </ul>
        <p>
          إدارة حصص مالك العقار والشركاء الملاك، والتخارج عبر السوق السنوية أو مزوّد السيولة.
        </p>
        <p>
          <strong>في حال عدم نجاح الاكتتاب:</strong> تحدّد بنود اتفاقية الملكية إجراءات إنهاء الاتفاقية
          أو تجديدها حتى اكتمال الاكتتاب.
        </p>

        <h2>10. مسؤوليات مالك العقار والمنصة</h2>
        <h3>مسؤوليات مالك العقار:</h3>
        <ul>
          <li>تقديم مستندات دقيقة وكاملة.</li>
          <li>الامتثال لجميع القوانين واللوائح المحلية والدولية.</li>
          <li>متابعة التقارير المالية وضمان الالتزام بشروط العقد الذكي.</li>
          <li>التعاون مع شركات التقييم والتأمين والإدارة لتسهيل عملية الاكتتاب بسلاسة.</li>
          <li>الالتزام بالشروط والرسوم المحددة في اتفاقية الملكية.</li>
        </ul>
        <h3>مسؤوليات المنصة:</h3>
        <ul>
          <li>إدارة الترميز والاكتتاب عبر الشركة ذات الغرض الخاص (SPV) والبلوك تشين.</li>
          <li>التحقق من المستندات القانونية والمالية.</li>
          <li>إدارة تحصيل الأموال وتحويل المدفوعات إلى مالك العقار بعد الاكتمال النهائي للاكتتاب.</li>
          <li>توفير لوحات التحكم والتقارير والتحليلات الدقيقة.</li>
          <li>تقديم أدوات تسويق وترويج احترافية للعقار.</li>
          <li>الالتزام بشروط اتفاقية الملكية الموقّعة مع مالك العقار.</li>
        </ul>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <h2>1. Tokenisation immobilière</h2>
        <ul>
          <li>Conversion de la propriété d'un bien en unités numériques (jetons) représentant des parts fractionnées du bien.</li>
          <li>Permet au propriétaire de vendre une partie du bien ou de conserver certains jetons afin de générer un revenu régulier.</li>
          <li>Les contrats intelligents garantissent la protection des droits du propriétaire comme des copropriétaires.</li>
        </ul>

        <h2>2. Propriété fractionnée</h2>
        <ul>
          <li>Permet aux copropriétaires d'acheter des parts fractionnées du bien, ce qui abaisse le seuil d'entrée et répartit les risques.</li>
          <li>Offre au propriétaire un financement flexible de ses projets sans recourir aux prêts traditionnels.</li>
          <li>Le propriétaire peut conserver une partie de la propriété pour percevoir un revenu continu ou profiter de la valorisation du bien.</li>
        </ul>

        <h2>3. Blockchain et contrats intelligents</h2>
        <ul>
          <li><strong>Blockchain :</strong> une base de données sécurisée et transparente pour toutes les opérations immobilières.</li>
          <li><strong>Contrats intelligents :</strong> exécutent automatiquement les conditions juridiques et financières du contrat, y compris la souscription, l'encaissement et la distribution.</li>
          <li><strong>Avantages pour le propriétaire :</strong> garantissent le respect des contrats, une gestion transparente des parts de propriété et des risques juridiques réduits.</li>
        </ul>

        <h2>4. Fonctionnalités de la plateforme pour le propriétaire</h2>
        <ol>
          <li>Tokenisation du bien en unités numériques.</li>
          <li>Contrats intelligents pour appliquer toutes les conditions de souscription et de vente.</li>
          <li>Mise en ligne du bien sur la plateforme et ouverture à la souscription.</li>
          <li>Outils de promotion et de marketing pour attirer des acheteurs.</li>
          <li>Encaissement automatique des fonds des acheteurs.</li>
          <li>Tableau de bord intégré pour suivre les souscriptions et gérer les parts de propriété.</li>
          <li>Accompagnement par des sociétés d'évaluation, d'assurance et de gestion pour faciliter le processus de souscription.</li>
          <li>Portefeuille numérique pour retirer des fonds depuis n'importe où dans le monde, en cryptomonnaies ou par les moyens bancaires traditionnels.</li>
          <li>Rapports périodiques sur la performance du bien et les parts des copropriétaires.</li>
          <li><strong>Flexibilité pour le propriétaire :</strong> le propriétaire peut vendre le bien en totalité, en vendre une partie, ou en conserver la gestion afin de générer un revenu régulier ou de superviser le projet.</li>
        </ol>

        <h2>5. Contrat de propriété entre le propriétaire et la plateforme</h2>
        <p>
          Le Contrat de propriété est le contrat principal conclu entre le propriétaire et Capimax RT ;
          il contient toutes les informations juridiques, financières et documentaires relatives au bien,
          notamment :
        </p>
        <ul>
          <li>L'ensemble des données du bien et ses documents juridiques et techniques.</li>
          <li>Les coordonnées des sociétés d'évaluation agréées.</li>
          <li>Les frais liés à la tokenisation, à l'administration, à la mise en ligne, à la souscription, à la SPV et à l'évaluation.</li>
          <li>Le mécanisme de transfert de la propriété du bien à une SPV (société ad hoc).</li>
          <li>Les droits et obligations juridiques et financiers du propriétaire et de la plateforme.</li>
        </ul>
        <p>
          <strong>Remarque importante :</strong> le contrat de propriété doit être signé avant toute autre étape, car il
          constitue le fondement juridique de toutes les procédures de mise en ligne et de souscription du bien.
        </p>
        <p>
          <strong>En cas d'échec de la souscription :</strong> le contrat comprend des clauses définissant la
          procédure permettant :
        </p>
        <ul>
          <li>De résilier légalement le contrat, ou</li>
          <li>De renouveler le contrat jusqu'à l'achèvement de la souscription.</li>
        </ul>

        <h2>6. Conditions générales de mise en ligne du bien et responsabilités juridiques</h2>
        <ul>
          <li>Remettre à la plateforme des documents exacts et complets.</li>
          <li>Respecter le calendrier et les étapes définies pour la mise en ligne et la souscription du bien.</li>
          <li>Se conformer aux lois locales et internationales en matière d'immobilier et de propriété.</li>
          <li>Le propriétaire est responsable de tout document inexact ou erroné.</li>
          <li>La plateforme est responsable de la gestion de la souscription et de la vérification de la validité des transactions via les contrats intelligents.</li>
        </ul>

        <h2>7. Frais dont le propriétaire doit avoir connaissance</h2>
        <ol>
          <li><strong>Frais de tokenisation du bien :</strong> pour la conversion du bien en unités numériques.</li>
          <li><strong>Frais d'administration :</strong> frais de fonctionnement de la plateforme et de gestion de la souscription.</li>
          <li><strong>Frais de mise en ligne et de souscription :</strong> pour la mise en ligne du bien sur la plateforme et son ouverture aux acheteurs.</li>
          <li><strong>Frais de SPV :</strong> pour la constitution et la gestion de la société ad hoc propre à chaque bien.</li>
          <li><strong>Frais d'évaluation :</strong> honoraires des sociétés d'évaluation agréées pour l'établissement de rapports précis sur le bien.</li>
        </ol>

        <h2>8. Documents requis de la part du propriétaire</h2>
        <ol>
          <li>Titre de propriété ou acte de propriété du bien.</li>
          <li>Plans architecturaux et permis de construire légaux.</li>
          <li>Certificat d'évaluation récent du bien délivré par des sociétés agréées.</li>
          <li>Attestation d'assurance du bien, le cas échéant.</li>
          <li>Pièces d'identité légales du propriétaire ou de la société propriétaire.</li>
          <li>Documents financiers relatifs à toute dette ou obligation grevant le bien.</li>
          <li>Tout accord existant avec les copropriétaires ou locataires actuels.</li>
        </ol>

        <h2>9. Étapes de mise en ligne du bien jusqu'à la souscription</h2>

        <h3>Étape 0 : signature du Contrat de propriété</h3>
        <ul>
          <li>Le Contrat de propriété entre le propriétaire et la plateforme est signé avant toute autre procédure.</li>
          <li>Le contrat définit toutes les informations juridiques, financières et documentaires du bien.</li>
          <li>Accord sur les frais et sur le mécanisme de transfert de la propriété du bien à la SPV.</li>
          <li>Il constitue le fondement juridique de toutes les étapes de mise en ligne et de souscription.</li>
        </ul>

        <h3>Étape 1 : inspection, évaluation et approbation</h3>
        <ul>
          <li>Après la signature du contrat, le propriétaire et la plateforme conviennent de l'organisme chargé d'évaluer le bien.</li>
          <li>Un rapport complet sur le bien est établi, comprenant l'emplacement, le type de bien, les rendements attendus et les risques.</li>
          <li>Le bien est approuvé pour la souscription sur la base d'une évaluation objective.</li>
        </ul>

        <h3>Étape 2 : création de la SPV et préparation des contrats intelligents</h3>
        <ul>
          <li>Le propriétaire et la plateforme conviennent de l'entité chargée de constituer la SPV.</li>
          <li>Le bien est converti en unités numériques (jetons) par l'intermédiaire de la SPV.</li>
          <li>Les contrats intelligents sont préparés afin de définir les conditions juridiques et financières de chaque unité.</li>
        </ul>

        <h3>Étape 3 : mise en ligne sur la plateforme et souscription</h3>
        <ul>
          <li>Le bien est mis en ligne sur Capimax RT et la souscription est ouverte aux acheteurs.</li>
          <li>Tableau de bord du propriétaire pour gérer la souscription, suivre les demandes et maîtriser le calendrier.</li>
        </ul>

        <h3>Étape 4 : marketing et attraction des acheteurs</h3>
        <ul>
          <li>Outils de promotion immobilière numérique pour attirer des acheteurs.</li>
          <li>Des rapports clairs sur les rendements attendus et les risques sont fournis à chaque copropriétaire.</li>
        </ul>

        <h3>Étape 5 : encaissement des fonds et achèvement de la souscription</h3>
        <ul>
          <li>Réception des fonds des acheteurs via le portefeuille numérique ou les banques.</li>
          <li>Les jetons sont distribués automatiquement aux acheteurs par l'intermédiaire des contrats intelligents.</li>
        </ul>

        <h3>Étape 6 : gestion après la souscription</h3>
        <p>Après l'achèvement définitif de la souscription :</p>
        <ul>
          <li>Le propriétaire reçoit ses fonds.</li>
          <li>Exécution intégrale du Contrat de propriété.</li>
          <li>Transfert de la propriété du bien à la SPV, conformément au contrat.</li>
        </ul>
        <p>
          Gestion des parts du propriétaire et des copropriétaires, et sortie via le marché annuel ou le fournisseur
          de liquidité.
        </p>
        <p>
          <strong>En cas d'échec de la souscription :</strong> les clauses du Contrat de propriété déterminent la
          procédure permettant soit de résilier le contrat, soit de le renouveler jusqu'à l'achèvement de la souscription.
        </p>

        <h2>10. Responsabilités du propriétaire et de la plateforme</h2>
        <h3>Responsabilités du propriétaire :</h3>
        <ul>
          <li>Remettre des documents exacts et complets.</li>
          <li>Respecter l'ensemble des lois et réglementations locales et internationales.</li>
          <li>Suivre les rapports financiers et veiller au respect des conditions des contrats intelligents.</li>
          <li>Coopérer avec les sociétés d'évaluation, d'assurance et de gestion pour faciliter le bon déroulement de la souscription.</li>
          <li>Respecter les conditions et les frais prévus dans le Contrat de propriété.</li>
        </ul>
        <h3>Responsabilités de la plateforme :</h3>
        <ul>
          <li>Gérer la tokenisation et la souscription via la SPV et la blockchain.</li>
          <li>Vérifier les documents juridiques et financiers.</li>
          <li>Gérer l'encaissement des fonds et verser les paiements au propriétaire après l'achèvement définitif de la souscription.</li>
          <li>Fournir des tableaux de bord, des rapports et des analyses précises.</li>
          <li>Proposer des outils professionnels de marketing et de promotion du bien.</li>
          <li>Respecter les conditions du Contrat de propriété signé avec le propriétaire.</li>
        </ul>
      </section>
      ) : (
      <section className="info-section">
        <h2>1. Real Estate Tokenization</h2>
        <ul>
          <li>Converting property ownership into digital units (Tokens) representing fractional shares of the property.</li>
          <li>Allows the owner to sell part of the property or retain some tokens to generate ongoing income.</li>
          <li>Smart contracts ensure the protection of both the owner's and co-owners' rights.</li>
        </ul>

        <h2>2. Fractional Ownership</h2>
        <ul>
          <li>Enables co-owners to purchase fractional shares of the property, reducing entry barriers and distributing risks.</li>
          <li>Provides the owner with flexible financing for projects without the need for traditional loans.</li>
          <li>The owner can retain part of the ownership to receive continuous income or benefit from property value appreciation.</li>
        </ul>

        <h2>3. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> A secure and transparent database for all real estate operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically execute legal and financial contract terms, including subscription, collection, and distribution.</li>
          <li><strong>Benefits for the Owner:</strong> Ensures compliance with contracts, transparent management of ownership shares, and reduced legal risks.</li>
        </ul>

        <h2>4. Platform Features for the Owner</h2>
        <ol>
          <li>Tokenization of the property into digital units.</li>
          <li>Smart contracts to enforce all subscription and sale terms.</li>
          <li>Listing the property on the platform and opening it for subscription.</li>
          <li>Promotional and marketing tools to attract buyers.</li>
          <li>Automatic collection of funds from buyers.</li>
          <li>Integrated dashboard to track subscriptions and manage ownership shares.</li>
          <li>Support from evaluation, insurance, and management companies to facilitate the subscription process.</li>
          <li>Digital wallet to withdraw funds from anywhere in the world using cryptocurrencies or traditional banking methods.</li>
          <li>Periodic reports on property performance and co-owner shares.</li>
          <li><strong>Owner Flexibility:</strong> The owner can sell the property entirely, sell a portion of it, or retain its management to generate ongoing income or oversee the project.</li>
        </ol>

        <h2>5. Ownership Agreement Between Owner and Platform</h2>
        <p>
          The Ownership Agreement is a primary contract between the owner and Capimax RT,
          containing all legal, financial, and documentation details regarding the property,
          including:
        </p>
        <ul>
          <li>Full property data and legal/technical documents.</li>
          <li>Details of accredited evaluation companies.</li>
          <li>Fees related to tokenization, administration, listing, subscription, SPV, and evaluation.</li>
          <li>The mechanism for transferring property ownership to an SPV (Special Purpose Vehicle).</li>
          <li>Legal and financial rights and obligations of both the owner and the platform.</li>
        </ul>
        <p>
          <strong>Important Note:</strong> The ownership agreement must be signed before any other stage, as it
          forms the legal foundation for all property listing and subscription procedures.
        </p>
        <p>
          <strong>In Case of Unsuccessful Subscription:</strong> The agreement includes clauses defining the
          procedure to:
        </p>
        <ul>
          <li>Legally terminate the agreement, or</li>
          <li>Renew the agreement until the subscription is completed.</li>
        </ul>

        <h2>6. Terms &amp; Conditions for Property Listing and Legal Responsibilities</h2>
        <ul>
          <li>Submit accurate and complete documents to the platform.</li>
          <li>Comply with the timeline and defined stages for property listing and subscription.</li>
          <li>Adhere to local and international real estate and ownership laws.</li>
          <li>The owner is responsible for any inaccurate or incorrect documents.</li>
          <li>The platform is responsible for managing the subscription and verifying transaction validity via smart contracts.</li>
        </ul>

        <h2>7. Fees the Owner Must Be Aware Of</h2>
        <ol>
          <li><strong>Property Tokenization Fee:</strong> For converting the property into digital units.</li>
          <li><strong>Administration Fee:</strong> Platform operation and subscription management fee.</li>
          <li><strong>Listing &amp; Subscription Fees:</strong> For listing the property on the platform and opening it for buyers.</li>
          <li><strong>SPV Fees:</strong> For establishing and managing the Special Purpose Vehicle for each property.</li>
          <li><strong>Evaluation Fees:</strong> Fees for accredited evaluation companies to produce accurate property reports.</li>
        </ol>

        <h2>8. Required Documents from the Owner</h2>
        <ol>
          <li>Property ownership deed or title contract.</li>
          <li>Architectural plans and legal construction permits.</li>
          <li>Recent property evaluation certificate from accredited companies.</li>
          <li>Property insurance certificate, if available.</li>
          <li>Legal identification documents for the owner or owning company.</li>
          <li>Financial documents related to any debts or obligations on the property.</li>
          <li>Any existing agreements with current co-owners or tenants.</li>
        </ol>

        <h2>9. Property Listing Stages Until Subscription</h2>

        <h3>Stage 0: Signing the Ownership Agreement</h3>
        <ul>
          <li>The Ownership Agreement between the owner and platform is signed before any other procedures.</li>
          <li>The agreement defines all legal, financial, and documentation details of the property.</li>
          <li>Agreement on fees and the mechanism to transfer property ownership to the SPV.</li>
          <li>Forms the legal foundation for all listing and subscription stages.</li>
        </ul>

        <h3>Stage 1: Inspection, Evaluation, and Approval</h3>
        <ul>
          <li>After signing the agreement, the owner and platform agree on the property evaluation entity.</li>
          <li>A comprehensive property report is issued, including location, property type, expected returns, and risks.</li>
          <li>The property is approved for subscription based on an objective evaluation.</li>
        </ul>

        <h3>Stage 2: SPV Creation and Smart Contract Preparation</h3>
        <ul>
          <li>The owner and platform agree on the entity responsible for establishing the SPV.</li>
          <li>Property is converted into digital units (Tokens) via the SPV.</li>
          <li>Smart contracts are prepared to define the legal and financial terms for each unit.</li>
        </ul>

        <h3>Stage 3: Platform Listing and Subscription</h3>
        <ul>
          <li>Property is listed on Capimax RT, and the subscription is opened to buyers.</li>
          <li>Owner dashboard to manage subscription, track requests, and control the timeline.</li>
        </ul>

        <h3>Stage 4: Marketing and Buyer Attraction</h3>
        <ul>
          <li>Digital real estate promotion tools to attract buyers.</li>
          <li>Clear reports provided for expected returns and risks for each co-owner.</li>
        </ul>

        <h3>Stage 5: Fund Collection and Subscription Completion</h3>
        <ul>
          <li>Receive funds from buyers via digital wallet or banks.</li>
          <li>Tokens distributed automatically to buyers through smart contracts.</li>
        </ul>

        <h3>Stage 6: Post-Subscription Management</h3>
        <p>After final completion of subscription:</p>
        <ul>
          <li>The owner receives their funds.</li>
          <li>Full execution of the Ownership Agreement.</li>
          <li>Transfer of property ownership to the SPV as defined in the agreement.</li>
        </ul>
        <p>
          Management of owner and co-owner shares and exit via the annual market or liquidity
          provider.
        </p>
        <p>
          <strong>In Case of Unsuccessful Subscription:</strong> Clauses in the Ownership Agreement determine the
          procedure to either terminate the agreement or renew it until subscription completion.
        </p>

        <h2>10. Owner &amp; Platform Responsibilities</h2>
        <h3>Owner Responsibilities:</h3>
        <ul>
          <li>Submit accurate and complete documents.</li>
          <li>Comply with all local and international laws and regulations.</li>
          <li>Monitor financial reports and ensure adherence to smart contract terms.</li>
          <li>Cooperate with evaluation, insurance, and management companies to facilitate a smooth subscription process.</li>
          <li>Adhere to terms and fees specified in the Ownership Agreement.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage tokenization and subscription via SPV and blockchain.</li>
          <li>Verify legal and financial documents.</li>
          <li>Manage fund collection and transfer payments to the owner after final subscription completion.</li>
          <li>Provide dashboards, reports, and accurate analytics.</li>
          <li>Offer professional marketing and promotional tools for the property.</li>
          <li>Adhere to terms of the Ownership Agreement signed with the owner.</li>
        </ul>
      </section>
      )}
    </InfoPageLayout>
  );
};
