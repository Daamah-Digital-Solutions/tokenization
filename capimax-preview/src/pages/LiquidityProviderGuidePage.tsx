import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const LiquidityProviderGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل مزوّد السيولة' : isFr ? 'Guide du fournisseur de liquidité' : 'Liquidity Provider Guide'}
      subtitle={isAr ? 'منصة كابي مكس RT – دليل مزوّد السيولة' : isFr ? 'Plateforme Capimax RT – Guide du fournisseur de liquidité' : 'Capimax RT Platform – Liquidity Provider Guide'}
    >
      {isAr ? (
      <section className="info-section">
        <h2>1. نظرة عامة على المنصة</h2>
        <p>
          كابي مكس RT منصة تابعة لـ Capimax Group، التي تضم 12 شركة عالمية في الولايات المتحدة
          الأمريكية والمملكة المتحدة والإمارات العربية المتحدة. وتعمل المجموعة في مجالات التملّك،
          وإدارة الصناديق العقارية، والبلوك تشين، والتكنولوجيا المالية، والأصول الرقمية.
        </p>
        <p>
          توفّر المنصة ترميز العقارات عبر البلوك تشين والعقود الذكية، بما يتيح الملكية الجزئية
          للعقارات. وتعمل كابي مكس RT عالميًا دون قيود جغرافية.
        </p>
        <p>
          وتقدّم لوحات تحكم مخصصة للملاك والبائعين والمطوّرين والوسطاء ومزوّدي السيولة، إلى جانب
          تقارير وتحليلات عن العقارات والملكية، بما يضمن الشفافية الكاملة وإمكانية التحقق من جميع
          العمليات المالية وعمليات الملكية.
        </p>

        <h2>2. تعريف مزوّد السيولة</h2>
        <p>
          مزوّد السيولة شخص طبيعي أو كيان اعتباري يوفّر سيولة مالية حصرًا لدعم فروق الأسعار في
          السوق السنوية أو في سوق خاصة ينشئها مزوّد السيولة.
        </p>
        <ul>
          <li>لا يموّل مزوّدو السيولة الاكتتابات المباشرة أو التمويل العام للمشاريع.</li>
          <li>يقتصر دورهم على تسهيل التخارج وضمان السيولة في السوق السنوية وأسواق السيولة الخاصة.</li>
          <li>يمكن أن يكون مزوّد السيولة مشتريًا فردًا أو بنكًا أو شركة استثمار متخصصة.</li>
        </ul>

        <h2>3. الدور على المنصة</h2>
        <ul>
          <li><strong>دعم السوق السنوية:</strong> توفير السيولة لضمان قدرة الملاك على شراء الحصص وبيعها بسلاسة في السوق السنوية.</li>
          <li><strong>إدارة الأسواق الخاصة:</strong> تمكين مزوّد السيولة من إنشاء سوق داخلية خاصة للعقارات المرمّزة ودعم معاملات الملاك.</li>
          <li><strong>استقرار السوق:</strong> ضمان استمرارية التداول وتقليل فروق الأسعار عند تخارج الملاك.</li>
          <li><strong>ثقة الملاك:</strong> توفير مصدر سيولة موثوق يمكن للملاك الاعتماد عليه في الشراء والبيع على المنصة.</li>
        </ul>

        <h2>4. مزايا مزوّد السيولة</h2>
        <ol>
          <li>
            <strong>عوائد مالية ثابتة:</strong> أرباح من فروق الأسعار ورسوم السوق عند دعم السوق السنوية أو الأسواق الخاصة.
          </li>
          <li>
            <strong>إيرادات إضافية من التخارج وإعادة البيع:</strong>
            <ul>
              <li>أرباح من رسوم التخارج عند خروج الملاك من السوق السنوية.</li>
              <li>أرباح أعلى عند حدوث التخارج من خلال السوق الخاصة لمزوّد السيولة.</li>
              <li>تتحقق الأرباح أيضًا من إعادة بيع الحصص في السوق السنوية، حيث يشتري ملاك جدد هذه الحصص.</li>
            </ul>
          </li>
          <li>
            <strong>فرص التملّك:</strong> الوصول إلى مشاريع عقارية مرمّزة وإمكانية مراقبة نشاط السوق الداخلية.
          </li>
          <li>
            <strong>الأمان المالي والقانوني:</strong> تُنفَّذ جميع المعاملات عبر العقود الذكية على البلوك تشين، بما يضمن سلامة رأس المال.
          </li>
          <li>
            <strong>إدارة مرنة للسيولة:</strong> إمكانية تحديد حجم السيولة المقدّمة للسوق السنوية أو السوق الخاصة ومراقبة الأداء.
          </li>
        </ol>

        <h2>5. نموذج العمل والأرباح</h2>
        <p>
          <strong>توفير السيولة:</strong> يودع مزوّد السيولة مبلغًا محددًا من الأموال لدعم فروق الأسعار
          في السوق السنوية أو في سوق خاصة.
        </p>
        <h3>مصادر الأرباح:</h3>
        <ul>
          <li>فروق الأسعار ورسوم السوق من معاملات البيع/الشراء بين الملاك داخل السوق المدعومة.</li>
          <li>رسوم التخارج المحصّلة عند تخارج الملاك من السوق السنوية.</li>
          <li>رسوم السوق الخاصة: رسوم أعلى على عمليات التخارج أو البيع عبر السوق الخاصة لمزوّد السيولة.</li>
          <li>إعادة بيع الحصص: أرباح عند شراء ملاك جدد لحصص سبق بيعها.</li>
        </ul>
        <h3>سحب الأموال:</h3>
        <ul>
          <li>يجوز لمزوّد السيولة سحب جزء من رأس المال المودع أو كامله بعد انتهاء فترة الدعم أو عند الاتفاق على الخروج من السوق الخاصة.</li>
          <li>تضمن العقود الذكية التنفيذ الآلي لعمليات سحب الأموال وفقًا للشروط المتفق عليها في اتفاقية مزوّد السيولة.</li>
        </ul>

        <h2>6. اتفاقية مزوّد السيولة</h2>
        <p>اتفاقية قانونية بين مزوّد السيولة وكابي مكس RT تحدّد:</p>
        <ul>
          <li>حجم السيولة المقدّمة وشروط دعم السوق السنوية أو السوق الخاصة.</li>
          <li>توزيع العوائد الناتجة عن فروق الأسعار ورسوم السوق ورسوم التخارج.</li>
          <li>حقوق مزوّد السيولة في سحب الأموال واسترداد رأس المال عند انتهاء فترة الدعم أو الاتفاقية.</li>
          <li>التزامات المنصة بتقديم معلومات دقيقة والحفاظ على شفافية السوق.</li>
          <li>الإجراءات المتبعة في حال عدم اكتمال التداول أو تقلبات السوق.</li>
        </ul>

        <h2>7. لوحة التحكم والتقارير</h2>
        <p>توفّر كابي مكس RT لوحة تحكم شاملة لمزوّد السيولة:</p>
        <ul>
          <li>مراقبة جميع الأنشطة في السوق السنوية والسوق الخاصة.</li>
          <li>عرض مؤشرات الأداء وفروق الأسعار ورسوم التخارج.</li>
          <li>إصدار تقارير كاملة تغطي جميع المعاملات والأرباح والحصص المتداولة.</li>
          <li>أدوات لتحقيق الشفافية الكاملة ومراقبة جميع العمليات في الأسواق المدعومة.</li>
        </ul>

        <h2>8. الحقوق المالية والأمان</h2>
        <ul>
          <li>جميع الأموال المودعة والأرباح محمية عبر العقود الذكية، بما يضمن التنفيذ الآلي.</li>
          <li>تتيح المحفظة الرقمية لمزوّد السيولة إدارة رأس المال والأرباح وعمليات السحب إلى الحسابات البنكية أو العملات المشفّرة.</li>
          <li>تضمن المنصة استقرار السوق السنوية والأسواق الخاصة وتقلّل المخاطر التشغيلية.</li>
          <li>يمكن لمزوّد السيولة مراقبة جميع العمليات المالية والتحقق من استحقاقه للعوائد المتفق عليها.</li>
        </ul>

        <h2>الملخص</h2>
        <p>
          يُعدّ مزوّد السيولة في كابي مكس RT عنصرًا أساسيًا لدعم السيولة في السوق السنوية وأسواق
          السيولة الخاصة، بما يضمن سلاسة تخارج الملاك واستقرار الأسعار وحماية رأس المال. وتتحقق
          الأرباح من:
        </p>
        <ul>
          <li>فروق الأسعار ورسوم السوق.</li>
          <li>رسوم التخارج المفروضة على الملاك.</li>
          <li>رسوم أعلى عبر السوق الخاصة.</li>
          <li>إعادة بيع الحصص وعمليات الشراء من قِبل ملاك جدد.</li>
        </ul>
        <p>
          جميع التفاصيل متاحة من خلال لوحة تحكم مخصصة وتقارير شاملة، بما يضمن الشفافية الكاملة
          ومراقبة جميع أنشطة السوق.
        </p>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <h2>1. Présentation de la plateforme</h2>
        <p>
          Capimax RT est une plateforme de Capimax Group, qui regroupe 12 sociétés internationales aux
          États-Unis, au Royaume-Uni et aux Émirats arabes unis. Le groupe est actif dans
          l'accession à la propriété, la gestion de fonds immobiliers, la blockchain, la fintech et les actifs numériques.
        </p>
        <p>
          La plateforme assure la tokenisation immobilière grâce à la blockchain et aux contrats intelligents, permettant
          la propriété fractionnée de biens. Capimax RT opère à l'échelle mondiale, sans restriction
          géographique.
        </p>
        <p>
          Elle propose des tableaux de bord dédiés aux propriétaires, vendeurs, promoteurs, courtiers et fournisseurs de liquidité,
          ainsi que des rapports et analyses sur les biens et la propriété, garantissant une transparence totale et la
          vérifiabilité de toutes les opérations financières et de propriété.
        </p>

        <h2>2. Définition du fournisseur de liquidité</h2>
        <p>
          Un fournisseur de liquidité est une personne physique ou morale qui apporte des liquidités financières uniquement pour
          absorber les écarts de prix sur le Marché annuel ou sur un marché privé créé par le fournisseur
          de liquidité.
        </p>
        <ul>
          <li>Les fournisseurs de liquidité ne financent ni les souscriptions directes ni le financement général des projets.</li>
          <li>Leur rôle se limite à faciliter les sorties et à assurer la liquidité sur le Marché annuel et les marchés de liquidité privés.</li>
          <li>Un fournisseur de liquidité peut être un acheteur particulier, une banque ou une société d'investissement spécialisée.</li>
        </ul>

        <h2>3. Rôle sur la plateforme</h2>
        <ul>
          <li><strong>Soutien au Marché annuel :</strong> apporter des liquidités pour que les propriétaires puissent acheter et vendre des jetons sans difficulté sur le Marché annuel.</li>
          <li><strong>Gestion de marchés privés :</strong> permettre au fournisseur de liquidité de créer un marché interne privé pour les biens tokenisés et de soutenir les transactions des propriétaires.</li>
          <li><strong>Stabilité du marché :</strong> assurer des échanges continus et réduire au minimum les écarts de prix lors des sorties des propriétaires.</li>
          <li><strong>Confiance des propriétaires :</strong> offrir une source de liquidité fiable sur laquelle les propriétaires peuvent compter pour acheter et vendre sur la plateforme.</li>
        </ul>

        <h2>4. Avantages pour le fournisseur de liquidité</h2>
        <ol>
          <li>
            <strong>Rendements financiers fixes :</strong> gains issus des écarts de prix et des frais de marché lors du soutien au Marché annuel ou aux marchés privés.
          </li>
          <li>
            <strong>Revenus supplémentaires issus des sorties et des reventes :</strong>
            <ul>
              <li>Gains provenant des frais de sortie lorsque les propriétaires quittent le Marché annuel.</li>
              <li>Gains plus élevés lorsque les sorties s'effectuent via le marché privé du fournisseur de liquidité.</li>
              <li>Bénéfices également générés par la revente de jetons sur le Marché annuel, où de nouveaux propriétaires achètent ces parts.</li>
            </ul>
          </li>
          <li>
            <strong>Opportunités de propriété :</strong> accès à des projets immobiliers tokenisés et possibilité de suivre l'activité du marché interne.
          </li>
          <li>
            <strong>Sécurité financière et juridique :</strong> toutes les transactions sont exécutées via des contrats intelligents sur la blockchain, garantissant la sécurité du capital.
          </li>
          <li>
            <strong>Gestion flexible de la liquidité :</strong> possibilité de déterminer le montant de liquidité apporté au Marché annuel ou au marché privé et d'en suivre la performance.
          </li>
        </ol>

        <h2>5. Modèle économique et gains</h2>
        <p>
          <strong>Apport de liquidité :</strong> le fournisseur de liquidité dépose un montant déterminé de fonds pour
          absorber les écarts de prix sur le Marché annuel ou sur un marché privé.
        </p>
        <h3>Sources de gains :</h3>
        <ul>
          <li>Écarts de prix et frais de marché issus des transactions d'achat/vente entre propriétaires au sein du marché soutenu.</li>
          <li>Frais de sortie perçus lorsque les propriétaires sortent du Marché annuel.</li>
          <li>Frais du marché privé : frais plus élevés pour les sorties ou ventes via le marché privé du fournisseur de liquidité.</li>
          <li>Revente de jetons : bénéfices lorsque de nouveaux propriétaires achètent des parts précédemment vendues.</li>
        </ul>
        <h3>Retrait des fonds :</h3>
        <ul>
          <li>Le fournisseur de liquidité peut retirer tout ou partie du capital déposé à la fin de la période de soutien ou sur accord de sortie du marché privé.</li>
          <li>Les contrats intelligents assurent l'exécution automatique des retraits de fonds selon les conditions convenues dans le Contrat de fournisseur de liquidité.</li>
        </ul>

        <h2>6. Contrat de fournisseur de liquidité</h2>
        <p>Un accord juridique entre le fournisseur de liquidité et Capimax RT qui précise :</p>
        <ul>
          <li>Le montant de liquidité apporté et les conditions de soutien au Marché annuel ou au marché privé.</li>
          <li>La répartition des rendements issus des écarts de prix, des frais de marché et des frais de sortie.</li>
          <li>Les droits du fournisseur de liquidité à retirer des fonds et à récupérer son capital à la fin de la période de soutien ou du contrat.</li>
          <li>Les obligations de la plateforme de fournir des informations exactes et de maintenir la transparence du marché.</li>
          <li>Les procédures applicables en cas d'échanges incomplets ou de fluctuations du marché.</li>
        </ul>

        <h2>7. Tableau de bord et rapports</h2>
        <p>Capimax RT met à la disposition du fournisseur de liquidité un tableau de bord complet :</p>
        <ul>
          <li>Suivre toutes les activités sur le Marché annuel et le marché privé.</li>
          <li>Afficher les indicateurs de performance, les écarts de prix et les frais de sortie.</li>
          <li>Générer des rapports complets couvrant toutes les transactions, les gains et les parts échangées.</li>
          <li>Des outils assurant une transparence totale et le suivi de toutes les opérations sur les marchés soutenus.</li>
        </ul>

        <h2>8. Droits financiers et sécurité</h2>
        <ul>
          <li>Tous les fonds déposés et les gains sont protégés par des contrats intelligents, garantissant une exécution automatique.</li>
          <li>Un portefeuille numérique permet au fournisseur de liquidité de gérer son capital, ses bénéfices et ses retraits vers des comptes bancaires ou en cryptomonnaies.</li>
          <li>La plateforme assure la stabilité du Marché annuel et des marchés privés et réduit les risques opérationnels.</li>
          <li>Le fournisseur de liquidité peut suivre toutes les opérations financières et vérifier son droit aux rendements convenus.</li>
        </ul>

        <h2>Résumé</h2>
        <p>
          Le fournisseur de liquidité de Capimax RT est essentiel pour soutenir la liquidité du Marché
          annuel et des marchés de liquidité privés, en assurant des sorties fluides pour les propriétaires, la stabilité des prix et la
          protection du capital. Les gains proviennent :
        </p>
        <ul>
          <li>Des écarts de prix et des frais de marché.</li>
          <li>Des frais de sortie des propriétaires.</li>
          <li>De frais plus élevés via le marché privé.</li>
          <li>De la revente de jetons et des achats par de nouveaux propriétaires.</li>
        </ul>
        <p>
          Tous les détails sont accessibles via un tableau de bord dédié et des rapports complets, garantissant
          une transparence totale et le suivi de toutes les activités du marché.
        </p>
      </section>
      ) : (
      <section className="info-section">
        <h2>1. Platform Overview</h2>
        <p>
          Capimax RT is a platform under Capimax Group, which includes 12 global companies in the
          United States, United Kingdom, and the United Arab Emirates. The group operates in
          ownership, real estate fund management, blockchain, fintech, and digital assets.
        </p>
        <p>
          The platform provides real estate tokenization via blockchain and smart contracts, enabling
          fractional ownership of properties. Capimax RT operates globally without geographical
          restrictions.
        </p>
        <p>
          It offers dedicated dashboards for owners, sellers, developers, brokers, and liquidity providers,
          as well as property and ownership reports and analytics, ensuring full transparency and
          verifiability of all financial and ownership operations.
        </p>

        <h2>2. Liquidity Provider Definition</h2>
        <p>
          A liquidity provider is a natural person or legal entity that supplies financial liquidity solely to
          support price differences in the Annual Market or a private market created by the liquidity
          provider.
        </p>
        <ul>
          <li>Liquidity providers do not fund direct subscriptions or general project financing.</li>
          <li>Their role is limited to facilitating exits and ensuring liquidity in the Annual Market and private liquidity markets.</li>
          <li>A liquidity provider can be an individual buyer, bank, or specialized investment company.</li>
        </ul>

        <h2>3. Role on the Platform</h2>
        <ul>
          <li><strong>Supporting the Annual Market:</strong> Providing liquidity to ensure owners can buy and sell tokens smoothly in the Annual Market.</li>
          <li><strong>Managing Private Markets:</strong> Enabling the liquidity provider to create a private internal market for tokenized properties and support owner transactions.</li>
          <li><strong>Market Stability:</strong> Ensuring continuous trading and minimizing price differences during owner exits.</li>
          <li><strong>Owner Confidence:</strong> Providing a reliable liquidity source that owners can rely on for buying and selling on the platform.</li>
        </ul>

        <h2>4. Liquidity Provider Benefits</h2>
        <ol>
          <li>
            <strong>Fixed Financial Returns:</strong> Earnings from price differences and market fees when supporting the Annual Market or private markets.
          </li>
          <li>
            <strong>Additional Revenue from Exits and Resales:</strong>
            <ul>
              <li>Earnings from exit fees when owners leave the Annual Market.</li>
              <li>Higher earnings when exits occur through the liquidity provider's private market.</li>
              <li>Profits also generated from resale of tokens in the Annual Market, where new owners purchase these shares.</li>
            </ul>
          </li>
          <li>
            <strong>Ownership Opportunities:</strong> Access to tokenized real estate projects and the ability to monitor internal market activity.
          </li>
          <li>
            <strong>Financial and Legal Security:</strong> All transactions are executed via smart contracts on the blockchain, ensuring capital safety.
          </li>
          <li>
            <strong>Flexible Liquidity Management:</strong> Ability to determine the amount of liquidity provided to the Annual Market or private market and monitor performance.
          </li>
        </ol>

        <h2>5. Business Model &amp; Earnings</h2>
        <p>
          <strong>Providing Liquidity:</strong> The liquidity provider deposits a specific amount of funds to
          support price differences in the Annual Market or a private market.
        </p>
        <h3>Earnings Sources:</h3>
        <ul>
          <li>Price differences and market fees from buy/sell transactions among owners within the supported market.</li>
          <li>Exit fees earned when owners exit the Annual Market.</li>
          <li>Private market fees: Higher fees for exits or sales via the liquidity provider's private market.</li>
          <li>Token resale: Profits when new owners purchase previously sold shares.</li>
        </ul>
        <h3>Funds Withdrawal:</h3>
        <ul>
          <li>The liquidity provider may withdraw part or all of the deposited capital after the support period ends or upon agreement to exit the private market.</li>
          <li>Smart contracts ensure automatic execution of fund withdrawals according to the agreed terms in the Liquidity Provider Agreement.</li>
        </ul>

        <h2>6. Liquidity Provider Agreement</h2>
        <p>A legal agreement between the liquidity provider and Capimax RT that specifies:</p>
        <ul>
          <li>The liquidity amount provided and the conditions for supporting the Annual Market or private market.</li>
          <li>The distribution of returns from price differences, market fees, and exit fees.</li>
          <li>The liquidity provider's rights to withdraw funds and reclaim capital at the end of the support period or agreement.</li>
          <li>Platform obligations to provide accurate information and maintain market transparency.</li>
          <li>Procedures in case of incomplete trading or market fluctuations.</li>
        </ul>

        <h2>7. Dashboard &amp; Reporting</h2>
        <p>Capimax RT provides a comprehensive dashboard for the liquidity provider:</p>
        <ul>
          <li>Monitor all activities in the Annual Market and private market.</li>
          <li>Display performance indicators, price differences, and exit fees.</li>
          <li>Generate full reports covering all transactions, earnings, and traded shares.</li>
          <li>Tools for full transparency and monitoring of all operations in the supported markets.</li>
        </ul>

        <h2>8. Financial Rights &amp; Security</h2>
        <ul>
          <li>All deposited funds and earnings are protected via smart contracts, ensuring automatic execution.</li>
          <li>A digital wallet allows the liquidity provider to manage capital, profits, and withdrawals to bank accounts or cryptocurrencies.</li>
          <li>The platform ensures the stability of the Annual Market and private markets and reduces operational risks.</li>
          <li>The liquidity provider can monitor all financial operations and verify entitlement to the agreed returns.</li>
        </ul>

        <h2>Summary</h2>
        <p>
          The liquidity provider in Capimax RT is essential for supporting liquidity in the Annual
          Market and private liquidity markets, ensuring smooth owner exits, price stability, and
          capital protection. Earnings are generated from:
        </p>
        <ul>
          <li>Price differences and market fees.</li>
          <li>Exit fees for owners.</li>
          <li>Higher fees via the private market.</li>
          <li>Resale of tokens and purchases by new owners.</li>
        </ul>
        <p>
          All details are accessible through a dedicated dashboard and comprehensive reports, ensuring
          full transparency and monitoring of all market activities.
        </p>
      </section>
      )}
    </InfoPageLayout>
  );
};
