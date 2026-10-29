import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const CapimaxRTGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل كابي مكس RT' : isFr ? 'Guide Capimax RT' : 'Capimax RT Guide'}
      subtitle={isAr ? 'جزء من Capimax Group' : isFr ? 'Membre de Capimax Group' : 'Part of Capimax Group'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          Capimax Group مجموعة عالمية تضم 12 شركة تعمل في الولايات المتحدة الأمريكية والمملكة
          المتحدة والإمارات العربية المتحدة، وتتخصص في:
        </p>
        <ul>
          <li>تملّك وإدارة صناديق تملّك العقارات.</li>
          <li>تقنية البلوك تشين والتكنولوجيا المالية.</li>
          <li>الأصول الافتراضية.</li>
        </ul>
        <p>
          <strong>نطاق العمل:</strong> عالمي دون قيود جغرافية، بما يتيح للملاك وبائعي العقارات
          والمطوّرين والوسطاء المشاركة من أي مكان في العالم.
        </p>

        <h2>نظرة عامة على منصة كابي مكس RT</h2>
        <p>
          كابي مكس RT منصة رقمية متقدمة لترميز العقارات، تعتمد على تقنية البلوك تشين والعقود
          الذكية، وتتيح:
        </p>
        <ul>
          <li>الملكية الجزئية والشراء الجزئي في العقارات المرمّزة.</li>
          <li>الحماية القانونية والمالية للملاك وبائعي العقارات والمطوّرين.</li>
          <li>الوصول إلى سوق تخارج داخلية ووسائل دفع متعددة، مع مزوّد سيولة يتيح قريبًا التخارج الفوري.</li>
        </ul>

        <h2>أنواع العقارات على المنصة</h2>
        <h3>1. عقارات مُدرّة للدخل جاهزة للاستخدام:</h3>
        <ul>
          <li>عقارات مكتملة الإنشاء وقيد التشغيل.</li>
          <li>توفّر عوائد دورية ثابتة للملاك وفقًا لحصص ملكيتهم.</li>
          <li>تُدار وتُراجَع من قِبل شركات إدارة عقارية متخصصة لضمان استقرار العوائد.</li>
        </ul>
        <h3>2. عقارات تطويرية على أربع جولات تمويل:</h3>
        <ul>
          <li>مشاريع في مراحل تطوير متعددة، مقسّمة إلى أربع جولات تمويل.</li>
          <li>يمكن للملاك المشاركة منذ المراحل الأولى، بما يزيد العوائد المحتملة مع تقدّم المشروع.</li>
          <li>تغطي العقود الذكية كل جولة لضمان الالتزام بالشروط القانونية والمالية.</li>
        </ul>
        <h3>3. عقارات قيد الإنشاء بخطط أقساط:</h3>
        <ul>
          <li>شراء عقارات قيد الإنشاء مع خيارات أقساط مرنة.</li>
          <li>تضمن العقود الذكية التزام المطوّرين بالجدول الزمني للمشروع ومراحل التسليم.</li>
        </ul>
        <p>
          تخضع جميع العقارات لتقييم دقيق من قِبل متخصصين عقاريين وشركات تقييم دولية لضمان
          الجودة والشفافية.
        </p>

        <h2>نموذج الشركة ذات الغرض الخاص (SPV)</h2>
        <p>
          يُدار كل مشروع على كابي مكس RT من خلال شركة ذات غرض خاص (SPV) مستقلة، وهي هيكل قانوني
          وهيكل ملكية يحمي حقوق جميع الأطراف ويضمن:
        </p>
        <h3>للملاك:</h3>
        <ul>
          <li>ملكية جزئية دقيقة من خلال الرموز الرقمية.</li>
          <li>مرونة في حجم الشراء.</li>
          <li>حماية قانونية ومالية عبر العقود الذكية.</li>
          <li>خيارات للتخارج عبر السوق الداخلية السنوية أو قريبًا من خلال مزوّد السيولة.</li>
          <li>تقارير وتحليلات تفصيلية عن أداء الملكية.</li>
        </ul>
        <h3>لبائعي العقارات / المطوّرين:</h3>
        <ul>
          <li>تمويل آمن ومرن للمشاريع من المشترين.</li>
          <li>إدارة شفافة للالتزامات المالية للمشترين.</li>
          <li>تقليل المخاطر التشغيلية ومخاطر التأمين.</li>
          <li>متابعة المشاريع من خلال لوحات تحكم مخصصة للبائع/المطوّر.</li>
        </ul>
        <h3>لمنصة كابي مكس RT:</h3>
        <ul>
          <li>أمان كامل للمعاملات المالية والقانونية.</li>
          <li>بناء شبكة عالمية من الملاك والمطوّرين والوسطاء ومزوّدي السيولة.</li>
          <li>إيرادات مستدامة من رسوم الترميز وإدارة المنصة.</li>
          <li>توسّع عالمي للمنصة مع الالتزام بالمعايير القانونية الدولية.</li>
        </ul>

        <h2>التسويق العقاري</h2>
        <p>
          التسويق العقاري هو عملية تسويق العقارات لاستقطاب المشترين والبائعين، ويشمل:
        </p>
        <ul>
          <li>عرضًا احترافيًا للعقار يشمل الموقع والنوع والعوائد المتوقعة وخطط التطوير.</li>
          <li>تقديم معلومات شفافة عن العوائد والمخاطر.</li>
          <li>استخدام الأدوات الرقمية والبلوك تشين لإثبات الملكية وضمان الشفافية.</li>
        </ul>
        <p>
          يزيد التسويق العقاري الفعّال من تفاعل الملاك ومن السيولة في السوق الداخلية للمنصة.
        </p>

        <h2>الملكية الجزئية</h2>
        <p>
          تتيح الملكية الجزئية للملاك تملّك حصة محددة من العقار بدلًا من شراء العقار بالكامل،
          وتوفّر:
        </p>
        <ul>
          <li>خفض عوائق الدخول أمام المشترين.</li>
          <li>توزيع المخاطر بين عدة ملاك.</li>
          <li>مرونة في بيع الحصص وتداولها داخل السوق الداخلية.</li>
        </ul>

        <h3>مزايا الملكية الجزئية عبر البلوك تشين:</h3>
        <ul>
          <li>التحقق الآمن والشفاف من الملكية من خلال العقود الذكية.</li>
          <li>إمكانية التتبّع الكامل لكل معاملة مالية وقانونية.</li>
          <li>تسهيل التخارج والتداول بطريقة سريعة وموثوقة.</li>
          <li>خفض تكاليف الوسطاء التقليديين.</li>
        </ul>

        <h3>المزايا لكل طرف:</h3>
        <p><strong>للملاك:</strong></p>
        <ul>
          <li>ملكية دقيقة وعوائد متناسبة.</li>
          <li>مرونة مالية عالية ودخول مبكر في المشاريع الكبرى.</li>
          <li>القدرة على التخارج أو تداول الحصص بسهولة داخل منصة آمنة.</li>
        </ul>
        <p><strong>للمطوّرين / البائعين:</strong></p>
        <ul>
          <li>تمويل سريع ومرن للمشاريع دون قروض تقليدية.</li>
          <li>توزيع المخاطر بين عدة ملاك.</li>
          <li>إدارة مالية شفافة وفعّالة.</li>
        </ul>
        <p><strong>لمنصة كابي مكس RT:</strong></p>
        <ul>
          <li>بناء الثقة والشفافية بين جميع الأطراف.</li>
          <li>زيادة حجم التداول ونشاط الملكية.</li>
          <li>تقديم خدمات رقمية احترافية ومتكاملة لجميع المستخدمين.</li>
        </ul>

        <h2>لوحات التحكم والتحليلات</h2>
        <p>توفّر المنصة لوحات تحكم متخصصة لكل طرف:</p>
        <ol>
          <li><strong>المالك:</strong> متابعة الحصص والعوائد وأداء العقار وخيارات التخارج.</li>
          <li><strong>البائع:</strong> إدارة الملكية الجزئية ومراقبة العوائد والتقارير القانونية.</li>
          <li><strong>المطوّر:</strong> متابعة مراحل المشروع وجولات التمويل والتزامات المشترين.</li>
          <li><strong>الوسيط:</strong> إدارة العملاء ومتابعة الطلبات وتسهيل المعاملات.</li>
        </ol>
        <p>مزايا لوحات التحكم والتحليلات:</p>
        <ul>
          <li>تقارير مالية وقانونية تفصيلية.</li>
          <li>مؤشرات الأداء والعائد على الاستثمار ومراقبة المخاطر.</li>
          <li>التحقق اللحظي من جميع المعاملات لتحقيق الشفافية الكاملة.</li>
        </ul>

        <h2>سوق التخارج السنوية ومزوّد السيولة</h2>
        <ul>
          <li><strong>سوق التخارج السنوية:</strong> تتيح للملاك الحاليين عرض حصصهم للبيع على مشترين جدد داخل المنصة.</li>
          <li><strong>مزوّد السيولة:</strong> يتيح التخارج الفوري من الحصص المرمّزة، بما يزيد مرونة الملكية.</li>
        </ul>

        <h2>وسائل متعددة للدفع والسحب</h2>
        <ul>
          <li>العملات المشفّرة الرئيسية.</li>
          <li>العملات الورقية المحلية والدولية.</li>
          <li>وسائل الدفع الرقمية، بما فيها البطاقات الافتراضية والمحافظ الإلكترونية والتحويلات البنكية.</li>
        </ul>
        <p>صُمّمت لتوفير الراحة والمرونة للمستخدمين حول العالم.</p>

        <h2>الشفافية والتحقق</h2>
        <ul>
          <li>جميع المعاملات قابلة للتتبّع والتحقق عبر العقود الذكية والبلوك تشين.</li>
          <li>يمكن للملاك والبائعين والمطوّرين الاطلاع لحظيًا على معلومات تفصيلية عن العقارات والحصص التي يملكونها.</li>
          <li>تضمن المصداقية والشفافية في جميع العمليات والتحليلات والتقييمات.</li>
        </ul>

        <h2>المزايا الكاملة للمنصة</h2>
        <ul>
          <li>ترميز العقارات باستخدام الشركة ذات الغرض الخاص (SPV) والبلوك تشين لتحقيق الأمان القانوني والمالي.</li>
          <li>ملكية جزئية دقيقة مع خيارات تخارج مرنة.</li>
          <li>لوحات تحكم وتحليلات متقدمة لجميع الأطراف.</li>
          <li>سوق تخارج داخلية، ومزوّد سيولة قريبًا.</li>
          <li>دعم العملات المتعددة ووسائل الدفع الرقمية.</li>
          <li>شفافية ومصداقية كاملة في جميع العمليات.</li>
          <li>أدوات تسويق عقاري احترافية لاستقطاب المشترين.</li>
          <li>دعم لغات وعملات متعددة للاستخدام العالمي.</li>
          <li>هيكل شركة ذات غرض خاص (SPV) مستقل لكل مشروع يحمي جميع الأطراف.</li>
          <li>توسيع فرص التملّك والتعاون عالميًا للمطوّرين والمشترين.</li>
        </ul>

        <h2>الخلاصة</h2>
        <p>
          كابي مكس RT منصة عالمية متكاملة للملكية العقارية الجزئية:
        </p>
        <ul>
          <li>آمنة وشفافة ومرنة.</li>
          <li>تقدّم خدمات رقمية متقدمة للملاك والبائعين والمطوّرين والوسطاء.</li>
          <li>تدعم الملكية الجزئية عبر البلوك تشين لتحقيق الحماية والمرونة والربحية.</li>
          <li>توفّر أدوات تسويق وتقارير وسوقًا داخلية ومزايا تقنية متقدمة.</li>
        </ul>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <p className="info-intro">
          Capimax Group est un groupe international regroupant 12 sociétés implantées aux
          États-Unis, au Royaume-Uni et aux Émirats arabes unis, spécialisé dans :
        </p>
        <ul>
          <li>L'accession à la propriété et la gestion de fonds de propriété immobilière.</li>
          <li>La blockchain et les technologies financières.</li>
          <li>Les actifs virtuels.</li>
        </ul>
        <p>
          <strong>Champ d'activité :</strong> mondial, sans restriction géographique, permettant aux propriétaires, aux vendeurs
          de biens, aux promoteurs et aux courtiers de participer depuis n'importe où dans le monde.
        </p>

        <h2>Présentation de la plateforme Capimax RT</h2>
        <p>
          Capimax RT est une plateforme numérique avancée de tokenisation immobilière, qui s'appuie sur
          la technologie blockchain et les contrats intelligents pour permettre :
        </p>
        <ul>
          <li>La propriété fractionnée et l'achat partiel de biens tokenisés.</li>
          <li>Une protection juridique et financière pour les propriétaires, les vendeurs de biens et les promoteurs.</li>
          <li>L'accès à un marché de sortie interne et à de multiples plateformes de paiement, avec bientôt un fournisseur de liquidité permettant des sorties instantanées.</li>
        </ul>

        <h2>Types de biens proposés sur la plateforme</h2>
        <h3>1. Biens de rapport prêts à l'emploi :</h3>
        <ul>
          <li>Biens entièrement construits et en exploitation.</li>
          <li>Ils offrent aux propriétaires des rendements périodiques fixes en fonction de leurs parts de propriété.</li>
          <li>Gérés et contrôlés par des sociétés professionnelles de gestion immobilière afin d'assurer des rendements stables.</li>
        </ul>
        <h3>2. Biens en développement en quatre tours de financement :</h3>
        <ul>
          <li>Projets à différentes phases de développement, répartis en quatre tours de financement.</li>
          <li>Les propriétaires peuvent participer dès les premières étapes, ce qui accroît le rendement potentiel à mesure que le projet avance.</li>
          <li>Chaque tour est encadré par des contrats intelligents garantissant le respect des conditions juridiques et financières.</li>
        </ul>
        <h3>3. Biens en construction avec plans de paiement échelonné :</h3>
        <ul>
          <li>Achetez des biens en construction avec des options de paiement échelonné flexibles.</li>
          <li>Les contrats intelligents garantissent que les promoteurs respectent le calendrier du projet et les jalons de livraison.</li>
        </ul>
        <p>
          Tous les biens sont rigoureusement évalués par des spécialistes de l'immobilier et des sociétés
          d'expertise internationales afin d'en garantir la qualité et la transparence.
        </p>

        <h2>Modèle de SPV (société ad hoc)</h2>
        <p>
          Chaque projet sur Capimax RT est géré par une SPV indépendante, une structure juridique et de propriété
          qui protège les droits de toutes les parties et garantit :
        </p>
        <h3>Pour les propriétaires :</h3>
        <ul>
          <li>Une propriété fractionnée précise grâce aux jetons numériques.</li>
          <li>Une flexibilité quant au montant de l'achat.</li>
          <li>Une protection juridique et financière grâce aux contrats intelligents.</li>
          <li>Des options de sortie via le marché interne annuel ou bientôt via un fournisseur de liquidité.</li>
          <li>Des rapports et analyses détaillés sur la performance de la propriété.</li>
        </ul>
        <h3>Pour les vendeurs de biens / promoteurs :</h3>
        <ul>
          <li>Un financement de projet sécurisé et flexible apporté par les acheteurs.</li>
          <li>Une gestion transparente des engagements financiers des acheteurs.</li>
          <li>Des risques opérationnels et d'assurance réduits.</li>
          <li>Le suivi des projets grâce à des tableaux de bord dédiés aux vendeurs/promoteurs.</li>
        </ul>
        <h3>Pour la plateforme Capimax RT :</h3>
        <ul>
          <li>Une sécurité totale des transactions financières et juridiques.</li>
          <li>La constitution d'un réseau mondial de propriétaires, promoteurs, courtiers et fournisseurs de liquidité.</li>
          <li>Des revenus durables issus des frais de tokenisation et de gestion de la plateforme.</li>
          <li>L'expansion mondiale de la plateforme dans le respect des normes juridiques internationales.</li>
        </ul>

        <h2>Promotion immobilière</h2>
        <p>
          La promotion immobilière consiste à commercialiser des biens afin d'attirer acheteurs et vendeurs,
          notamment par :
        </p>
        <ul>
          <li>Une présentation professionnelle du bien, incluant l'emplacement, le type, les rendements attendus et les plans de développement.</li>
          <li>Des informations transparentes sur les rendements et les risques.</li>
          <li>L'utilisation d'outils numériques et de la blockchain pour prouver la propriété et garantir la transparence.</li>
        </ul>
        <p>
          Une promotion immobilière efficace accroît l'engagement des propriétaires et la liquidité sur le marché
          interne de la plateforme.
        </p>

        <h2>Propriété fractionnée</h2>
        <p>
          La propriété fractionnée permet aux propriétaires de détenir une part déterminée d'un bien au lieu d'acheter
          le bien en entier, ce qui offre :
        </p>
        <ul>
          <li>Un seuil d'entrée plus bas pour les acheteurs.</li>
          <li>Une répartition des risques entre plusieurs propriétaires.</li>
          <li>La possibilité de vendre et d'échanger des parts au sein du marché interne.</li>
        </ul>

        <h3>Avantages de la propriété fractionnée grâce à la blockchain :</h3>
        <ul>
          <li>Une vérification sécurisée et transparente de la propriété grâce aux contrats intelligents.</li>
          <li>Une traçabilité complète de chaque transaction financière et juridique.</li>
          <li>Des sorties et des échanges facilités, rapides et fiables.</li>
          <li>Des coûts d'intermédiation traditionnels réduits.</li>
        </ul>

        <h3>Avantages pour chaque partie :</h3>
        <p><strong>Pour les propriétaires :</strong></p>
        <ul>
          <li>Une propriété précise et des rendements proportionnels.</li>
          <li>Une grande flexibilité financière et un accès anticipé à de grands projets.</li>
          <li>La possibilité de sortir ou d'échanger des parts facilement au sein d'une plateforme sécurisée.</li>
        </ul>
        <p><strong>Pour les promoteurs / vendeurs :</strong></p>
        <ul>
          <li>Un financement de projet rapide et flexible, sans prêts traditionnels.</li>
          <li>Une répartition des risques entre plusieurs propriétaires.</li>
          <li>Une gestion financière transparente et efficace.</li>
        </ul>
        <p><strong>Pour la plateforme Capimax RT :</strong></p>
        <ul>
          <li>Instaure la confiance et la transparence entre toutes les parties.</li>
          <li>Accroît le volume des échanges et l'activité de propriété.</li>
          <li>Offre des services numériques professionnels et intégrés à tous les utilisateurs.</li>
        </ul>

        <h2>Tableaux de bord et analyses</h2>
        <p>La plateforme propose des tableaux de bord spécialisés pour chaque partie :</p>
        <ol>
          <li><strong>Propriétaire :</strong> suivre ses parts, ses rendements, la performance des biens et les options de sortie.</li>
          <li><strong>Vendeur :</strong> gérer la propriété fractionnée, suivre les rendements et les rapports juridiques.</li>
          <li><strong>Promoteur :</strong> suivre les jalons du projet, les tours de financement et les engagements des acheteurs.</li>
          <li><strong>Courtier :</strong> gérer ses clients, suivre les demandes et faciliter les transactions.</li>
        </ol>
        <p>Fonctionnalités des tableaux de bord et des analyses :</p>
        <ul>
          <li>Rapports financiers et juridiques détaillés.</li>
          <li>Indicateurs de performance, rendement (ROI) et suivi des risques.</li>
          <li>Vérification en temps réel de toutes les transactions pour une transparence totale.</li>
        </ul>

        <h2>Marché de sortie annuel et fournisseur de liquidité</h2>
        <ul>
          <li><strong>Marché de sortie annuel :</strong> permet aux propriétaires actuels de mettre en vente leurs parts auprès de nouveaux acheteurs au sein de la plateforme.</li>
          <li><strong>Fournisseur de liquidité :</strong> permet une sortie instantanée pour les parts tokenisées, ce qui accroît la flexibilité de la propriété.</li>
        </ul>

        <h2>Multiples moyens de paiement et de retrait</h2>
        <ul>
          <li>Les principales cryptomonnaies.</li>
          <li>Les devises fiduciaires locales et internationales.</li>
          <li>Les moyens de paiement numériques, y compris les cartes virtuelles, les portefeuilles électroniques et les virements bancaires.</li>
        </ul>
        <p>Conçus pour offrir commodité et flexibilité aux utilisateurs du monde entier.</p>

        <h2>Transparence et vérification</h2>
        <ul>
          <li>Toutes les transactions sont traçables et vérifiables grâce aux contrats intelligents et à la blockchain.</li>
          <li>Les propriétaires, vendeurs et promoteurs peuvent accéder en temps réel à des informations détaillées sur les biens et les parts qu'ils détiennent.</li>
          <li>Garantit la crédibilité et la transparence de toutes les opérations, analyses et expertises.</li>
        </ul>

        <h2>L'ensemble des fonctionnalités de la plateforme</h2>
        <ul>
          <li>Tokenisation immobilière s'appuyant sur une SPV et la blockchain pour la sécurité juridique et financière.</li>
          <li>Propriété fractionnée précise avec des options de sortie flexibles.</li>
          <li>Tableaux de bord et analyses avancés pour toutes les parties.</li>
          <li>Marché de sortie interne et, bientôt, fournisseur de liquidité.</li>
          <li>Prise en charge de plusieurs devises et des paiements numériques.</li>
          <li>Transparence et crédibilité totales dans toutes les opérations.</li>
          <li>Outils professionnels de promotion immobilière pour attirer des acheteurs.</li>
          <li>Prise en charge multilingue et multidevise pour un usage mondial.</li>
          <li>Structure de SPV indépendante pour chaque projet, protégeant toutes les parties.</li>
          <li>Des opportunités de propriété et de collaboration élargies à l'échelle mondiale pour les promoteurs et les acheteurs.</li>
        </ul>

        <h2>Conclusion</h2>
        <p>
          Capimax RT est une plateforme mondiale entièrement intégrée dédiée à la propriété immobilière fractionnée :
        </p>
        <ul>
          <li>Sécurisée, transparente et flexible.</li>
          <li>Elle offre des services numériques avancés aux propriétaires, vendeurs, promoteurs et courtiers.</li>
          <li>Elle permet la propriété fractionnée via la blockchain, gage de protection, de flexibilité et de rentabilité.</li>
          <li>Elle propose des outils de promotion, des rapports, un marché interne et des avantages technologiques de pointe.</li>
        </ul>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          Capimax Group is a global conglomerate comprising 12 companies operating in the United
          States, United Kingdom, and United Arab Emirates, specializing in:
        </p>
        <ul>
          <li>Ownership and management of real estate ownership funds.</li>
          <li>Blockchain and financial technology.</li>
          <li>Virtual assets.</li>
        </ul>
        <p>
          <strong>Scope of Operations:</strong> Global, without geographical restrictions, enabling owners, property
          sellers, developers, and brokers to participate from anywhere in the world.
        </p>

        <h2>Capimax RT Platform Overview</h2>
        <p>
          Capimax RT is an advanced digital platform for real estate tokenization, leveraging
          blockchain technology and smart contracts, allowing:
        </p>
        <ul>
          <li>Fractional ownership and partial purchase in tokenized properties.</li>
          <li>Legal and financial protection for owners, property sellers, and developers.</li>
          <li>Access to an internal exit market and multiple payment platforms, with a liquidity provider soon enabling instant exits.</li>
        </ul>

        <h2>Types of Properties on the Platform</h2>
        <h3>1. Ready-to-Use Income Properties:</h3>
        <ul>
          <li>Fully constructed and operational properties.</li>
          <li>Provide fixed periodic returns to owners based on their ownership shares.</li>
          <li>Managed and reviewed by professional property management companies to ensure stable returns.</li>
        </ul>
        <h3>2. Development Properties in Four Funding Rounds:</h3>
        <ul>
          <li>Projects in multiple development phases, divided into four financing rounds.</li>
          <li>Owners can participate from the early stages, increasing potential returns as the project progresses.</li>
          <li>Each round is covered by smart contracts ensuring compliance with legal and financial terms.</li>
        </ul>
        <h3>3. Under-Construction Properties with Installment Plans:</h3>
        <ul>
          <li>Buy properties under construction with flexible installment options.</li>
          <li>Smart contracts ensure developers adhere to the project timeline and delivery milestones.</li>
        </ul>
        <p>
          All properties are carefully evaluated by real estate specialists and international appraisal
          companies to ensure quality and transparency.
        </p>

        <h2>SPV (Special Purpose Vehicle) Model</h2>
        <p>
          Each project on Capimax RT is managed through an independent SPV, a legal and ownership
          structure that protects the rights of all parties and ensures:
        </p>
        <h3>For Owners:</h3>
        <ul>
          <li>Accurate fractional ownership through digital tokens.</li>
          <li>Flexibility in purchase size.</li>
          <li>Legal and financial protection via smart contracts.</li>
          <li>Exit options via the annual internal market or soon through a liquidity provider.</li>
          <li>Detailed reports and analytics on ownership performance.</li>
        </ul>
        <h3>For Property Sellers / Developers:</h3>
        <ul>
          <li>Secure and flexible project financing from buyers.</li>
          <li>Transparent management of buyer financial commitments.</li>
          <li>Reduced operational and insurance risks.</li>
          <li>Project tracking through dedicated seller/developer dashboards.</li>
        </ul>
        <h3>For Capimax RT Platform:</h3>
        <ul>
          <li>Full security for financial and legal transactions.</li>
          <li>Establishing a global network of owners, developers, brokers, and liquidity providers.</li>
          <li>Sustainable revenue from tokenization and platform management fees.</li>
          <li>Global platform expansion while complying with international legal standards.</li>
        </ul>

        <h2>Real Estate Promotion</h2>
        <p>
          Real estate promotion is the process of marketing properties to attract buyers and sellers,
          including:
        </p>
        <ul>
          <li>Professional presentation of the property, including location, type, expected returns, and development plans.</li>
          <li>Providing transparent information about returns and risks.</li>
          <li>Using digital tools and blockchain to prove ownership and ensure transparency.</li>
        </ul>
        <p>
          Effective real estate promotion increases owner engagement and liquidity in the platform's
          internal market.
        </p>

        <h2>Fractional Ownership</h2>
        <p>
          Fractional ownership allows owners to own a specific share of a property instead of buying
          the entire property, offering:
        </p>
        <ul>
          <li>Lower barriers to entry for buyers.</li>
          <li>Risk distribution among multiple owners.</li>
          <li>Flexibility to sell and trade shares within the internal market.</li>
        </ul>

        <h3>Benefits of Fractional Ownership via Blockchain:</h3>
        <ul>
          <li>Secure and transparent ownership verification through smart contracts.</li>
          <li>Full traceability of every financial and legal transaction.</li>
          <li>Facilitated exits and trading in a fast and reliable manner.</li>
          <li>Reduced traditional intermediary costs.</li>
        </ul>

        <h3>Benefits for Each Party:</h3>
        <p><strong>For Owners:</strong></p>
        <ul>
          <li>Precise ownership and proportional returns.</li>
          <li>High financial flexibility and early entry into large projects.</li>
          <li>Ability to exit or trade shares easily within a secure platform.</li>
        </ul>
        <p><strong>For Developers / Sellers:</strong></p>
        <ul>
          <li>Fast and flexible project financing without traditional loans.</li>
          <li>Risk distribution among multiple owners.</li>
          <li>Transparent and efficient financial management.</li>
        </ul>
        <p><strong>For Capimax RT Platform:</strong></p>
        <ul>
          <li>Builds trust and transparency among all parties.</li>
          <li>Increases trading volume and ownership activity.</li>
          <li>Provides professional, integrated digital services to all users.</li>
        </ul>

        <h2>Dashboards and Analytics</h2>
        <p>The platform provides specialized dashboards for each party:</p>
        <ol>
          <li><strong>Owner:</strong> Track shares, returns, property performance, and exit options.</li>
          <li><strong>Seller:</strong> Manage fractional ownership, monitor returns, and legal reports.</li>
          <li><strong>Developer:</strong> Track project milestones, funding rounds, and buyer commitments.</li>
          <li><strong>Broker:</strong> Manage clients, track requests, and facilitate transactions.</li>
        </ol>
        <p>Dashboard and analytics features:</p>
        <ul>
          <li>Detailed financial and legal reporting.</li>
          <li>Performance indicators, ROI, and risk monitoring.</li>
          <li>Real-time verification of all transactions for full transparency.</li>
        </ul>

        <h2>Annual Exit Market and Liquidity Provider</h2>
        <ul>
          <li><strong>Annual Exit Market:</strong> Allows current owners to offer their shares for sale to new buyers within the platform.</li>
          <li><strong>Liquidity Provider:</strong> Enables instant exit for tokenized shares, increasing ownership flexibility.</li>
        </ul>

        <h2>Multiple Payment and Withdrawal Methods</h2>
        <ul>
          <li>Major cryptocurrencies.</li>
          <li>Local and international fiat currencies.</li>
          <li>Digital payment methods including virtual cards, e-wallets, and bank transfers.</li>
        </ul>
        <p>Designed to provide convenience and flexibility for global users.</p>

        <h2>Transparency and Verification</h2>
        <ul>
          <li>All transactions are traceable and verifiable via smart contracts and blockchain.</li>
          <li>Owners, sellers, and developers can access detailed information on their owned properties and shares in real-time.</li>
          <li>Ensures credibility and transparency for all operations, analytics, and appraisals.</li>
        </ul>

        <h2>Full Platform Features</h2>
        <ul>
          <li>Real estate tokenization using SPV and blockchain for legal and financial security.</li>
          <li>Accurate fractional ownership with flexible exit options.</li>
          <li>Advanced dashboards and analytics for all parties.</li>
          <li>Internal exit market and soon liquidity provider.</li>
          <li>Multi-currency and digital payment support.</li>
          <li>Full transparency and credibility across all operations.</li>
          <li>Professional real estate promotion tools to attract buyers.</li>
          <li>Multi-language and multi-currency support for global use.</li>
          <li>Independent SPV structure for each project protecting all parties.</li>
          <li>Expanded global ownership opportunities and collaboration for developers and buyers.</li>
        </ul>

        <h2>Conclusion</h2>
        <p>
          Capimax RT is a fully integrated global platform for fractional real estate ownership:
        </p>
        <ul>
          <li>Secure, transparent, and flexible.</li>
          <li>Provides advanced digital services for owners, sellers, developers, and brokers.</li>
          <li>Supports fractional ownership via blockchain for protection, flexibility, and profitability.</li>
          <li>Offers promotion tools, reports, internal market, and advanced technological advantages.</li>
        </ul>
      </section>
      )}
    </InfoPageLayout>
  );
};
