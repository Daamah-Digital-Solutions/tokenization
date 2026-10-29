import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const BrokerGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل الوسيط' : isFr ? 'Guide du courtier' : 'Broker Guide'}
      subtitle={isAr ? 'منصة كابي مكس RT – دليل الوسيط' : isFr ? 'Plateforme Capimax RT – Guide du courtier' : 'Capimax RT Platform – Broker Guide'}
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
          تخضع العقارات المدرجة على المنصة لتحقق دقيق من قِبل متخصصين في إدارة العقارات وشركات
          تقييم عالمية معتمدة، وتشمل:
        </p>
        <ul>
          <li>عقارات جاهزة للتأجير ذات عوائد.</li>
          <li>مشاريع تطويرية جارية عبر أربع جولات للمشروع.</li>
          <li>عقارات قيد الإنشاء بخطط أقساط.</li>
        </ul>
        <p>
          توفّر المنصة لوحات تحكم مخصصة للملاك والبائعين والمطوّرين والوسطاء، إلى جانب تقارير
          وتحليلات عن العقارات والحصص المملوكة، وتضمن الشفافية الكاملة والتحقق من جميع العمليات
          المالية وعمليات الملكية. وتتوفر سوق تخارج سنوية للملاك، مع مزوّد سيولة قريبًا للتخارج
          الفوري. كما تدعم المنصة خيارات متعددة للدفع والسحب، بما في ذلك العملات التقليدية والعملات
          المشفّرة.
        </p>

        <h2>2. مزايا الوسيط وفوائده</h2>
        <ol>
          <li>
            <strong>عمولات من إحالة العقارات/المشاريع:</strong> يحصل الوسيط على عمولة عن كل عقار أو مشروع يُحيله إلى
            المنصة ويجري ترميزه وطرحه للملكية الجزئية.
          </li>
          <li>
            <strong>عمولات من إحالة المشترين:</strong> يحصل الوسيط على عمولة عن كل مشترٍ جديد يسجّل ويشارك في
            الاكتتابات عبر رمز الإحالة الخاص بالوسيط.
          </li>
          <li>
            <strong>مزايا إضافية:</strong>
            <ul>
              <li>لوحة تحكم شاملة لمتابعة جميع المشاريع والعقارات المُحالة.</li>
              <li>متابعة جميع المشترين المُحالين، بما في ذلك بياناتهم ومستنداتهم.</li>
              <li>الوصول إلى البيانات المالية وبيانات الملكية لجميع المشاريع والمشترين.</li>
              <li>محفظة رقمية لسحب العمولات والأرباح عبر الحساب البنكي أو العملات المشفّرة.</li>
              <li>إمكانية العمل مع مشترين بأحجام رؤوس أموال مختلفة (منخفضة، متوسطة، مرتفعة).</li>
            </ul>
          </li>
        </ol>

        <h2>3. ترميز العقارات</h2>
        <ul>
          <li>تحويل العقارات إلى وحدات رقمية (رموز رقمية) تمثّل حصصًا جزئية.</li>
          <li>يتيح للوسيط الفهم الكامل لآليات الاكتتاب والبيع والتخارج والفوائد العائدة على جميع الأطراف (البائع، المطوّر، المشتري).</li>
          <li>تضمن العقود الذكية التنفيذ الآلي لجميع الشروط القانونية والمالية.</li>
        </ul>

        <h2>4. الملكية الجزئية</h2>
        <ul>
          <li>تمكّن المشترين من تملّك حصص جزئية، بما يخفض عوائق الدخول ويوزّع المخاطر.</li>
          <li>تمنح الوسطاء فرصة توجيه المشترين بأحجام رؤوس أموال مختلفة.</li>
          <li>تدعم المشاركة في مشاريع متنوعة بأمان وشفافية.</li>
        </ul>

        <h2>5. البلوك تشين والعقود الذكية</h2>
        <ul>
          <li><strong>البلوك تشين:</strong> سجل آمن وشفاف لجميع عمليات العقارات والمشاريع.</li>
          <li><strong>العقود الذكية:</strong> تنفّذ تلقائيًا جميع الشروط القانونية والمالية، بما في ذلك الاكتتابات والتحصيلات والتوزيعات.</li>
          <li><strong>المزايا للوسطاء:</strong> تضمن الشفافية والأمان في جميع عمليات إحالة المشترين والمشاريع.</li>
        </ul>

        <h2>6. فوائد الترميز والملكية الجزئية لجميع الأطراف</h2>
        <ul>
          <li><strong>البائعون:</strong> بيع العقار كليًا أو جزئيًا، وجمع رأس المال بسرعة، والاحتفاظ بالإدارة، والحفاظ على تدفق الدخل.</li>
          <li><strong>المطوّرون:</strong> جمع رأس المال للمشاريع الجارية والجديدة، والبيع جزئيًا أو كليًا، والاحتفاظ بالحصص وإدارة المشاريع.</li>
          <li><strong>المشترون:</strong> المشاركة برأس مال منخفض أو متوسط، والوصول إلى عقارات متنوعة، والحصول على العوائد المتوقعة، والتمتع بالحماية القانونية والمالية عبر العقود الذكية.</li>
        </ul>

        <h2>7. اتفاقية الوسيط</h2>
        <p>اتفاقية قانونية بين الوسيط وكابي مكس RT تحدّد:</p>
        <ul>
          <li>العمولات من إحالة العقارات أو المشاريع.</li>
          <li>العمولات من إحالة المشترين عبر رمز الوسيط الخاص.</li>
          <li>الالتزامات القانونية والمالية تجاه البائعين والمطوّرين والمشترين.</li>
          <li>آلية سحب الأرباح عبر المحفظة الرقمية أو الحساب البنكي.</li>
          <li>الامتثال للقوانين واللوائح المحلية والدولية المنظِّمة للوساطة.</li>
        </ul>

        <h2>8. مسؤوليات الوسيط والمنصة</h2>
        <h3>مسؤوليات الوسيط:</h3>
        <ul>
          <li>إحالة المشترين والعملاء باحترافية وشفافية.</li>
          <li>الامتثال لأنظمة الوساطة المحلية والدولية.</li>
          <li>متابعة جميع المشاريع والمشترين المُحالين وضمان دقة البيانات.</li>
          <li>الالتزام بشروط الاتفاقية المتعلقة بالعمولات وعمليات السحب.</li>
        </ul>
        <h3>مسؤوليات المنصة:</h3>
        <ul>
          <li>إدارة جميع العمليات القانونية والمالية للمشاريع عبر البلوك تشين والعقود الذكية.</li>
          <li>التحقق من مستندات وبيانات المشترين والمطوّرين.</li>
          <li>دفع العمولات للوسطاء عبر المحفظة الرقمية أو الحساب البنكي.</li>
          <li>توفير لوحة تحكم شاملة وأدوات تمكّن الوسطاء من إدارة المشاريع والمشترين ومتابعتهم بشفافية.</li>
        </ul>

        <h2>9. لوحة تحكم الوسيط</h2>
        <ul>
          <li>متابعة جميع المشاريع والعقارات المُحالة.</li>
          <li>مراقبة جميع المشترين المُحالين لكل مشروع أو عقار.</li>
          <li>الوصول إلى جميع المستندات والبيانات المالية وبيانات الملكية.</li>
          <li>متابعة العمولات والأرباح وسحبها بسهولة.</li>
          <li>أدوات تحليلية لتقييم أداء المشاريع وحصص المشترين.</li>
        </ul>
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
          Les biens proposés sur la plateforme sont rigoureusement vérifiés par des spécialistes de la gestion immobilière et
          des sociétés d'évaluation internationales agréées, notamment :
        </p>
        <ul>
          <li>Des biens prêts à la location, générant des rendements.</li>
          <li>Des projets de développement en cours, répartis en quatre tours de financement.</li>
          <li>Des biens en construction avec des plans de paiement échelonné.</li>
        </ul>
        <p>
          La plateforme met à disposition des tableaux de bord dédiés aux propriétaires, vendeurs, promoteurs et courtiers, ainsi
          que des rapports et analyses sur les biens et les parts détenues. Elle garantit une transparence totale et la
          vérification de toutes les opérations financières et de propriété. Un marché de sortie annuel est ouvert aux
          propriétaires, et un fournisseur de liquidité permettant des sorties instantanées arrive bientôt. De multiples options de
          paiement et de retrait sont prises en charge, y compris les devises traditionnelles et les cryptomonnaies.
        </p>

        <h2>2. Fonctionnalités et avantages pour le courtier</h2>
        <ol>
          <li>
            <strong>Commissions sur les apports de biens/projets :</strong> le courtier perçoit une commission pour chaque bien ou projet apporté à la
            plateforme qui est tokenisé et proposé en propriété fractionnée.
          </li>
          <li>
            <strong>Commissions sur les apports d'acheteurs :</strong> le courtier perçoit une commission pour chaque nouvel acheteur qui s'inscrit et
            participe aux souscriptions via le code de parrainage unique du courtier.
          </li>
          <li>
            <strong>Avantages supplémentaires :</strong>
            <ul>
              <li>Un tableau de bord complet pour suivre tous les projets et biens apportés.</li>
              <li>Le suivi de tous les acheteurs apportés, y compris leurs données et leurs documents.</li>
              <li>L'accès aux données financières et de propriété de tous les projets et acheteurs.</li>
              <li>Un portefeuille numérique pour retirer commissions et gains par compte bancaire ou en cryptomonnaie.</li>
              <li>La possibilité de travailler avec des acheteurs de capacités financières différentes (faible, moyenne, élevée).</li>
            </ul>
          </li>
        </ol>

        <h2>3. Tokenisation immobilière</h2>
        <ul>
          <li>Conversion des biens en unités numériques (jetons) représentant des parts fractionnées.</li>
          <li>Permet au courtier de bien comprendre les mécanismes de souscription, de vente et de sortie ainsi que les avantages pour toutes les parties (vendeur, promoteur, acheteur).</li>
          <li>Les contrats intelligents garantissent l'exécution automatique de toutes les conditions juridiques et financières.</li>
        </ul>

        <h2>4. Propriété fractionnée</h2>
        <ul>
          <li>Permet aux acheteurs d'acquérir des parts fractionnées, ce qui abaisse le seuil d'entrée et répartit les risques.</li>
          <li>Offre aux courtiers la possibilité d'accompagner des acheteurs de capacités financières différentes.</li>
          <li>Favorise la participation à divers projets en toute sécurité et en toute transparence.</li>
        </ul>

        <h2>5. Blockchain et contrats intelligents</h2>
        <ul>
          <li><strong>Blockchain :</strong> registre sécurisé et transparent pour toutes les opérations liées aux biens et aux projets.</li>
          <li><strong>Contrats intelligents :</strong> appliquent automatiquement toutes les conditions juridiques et financières, y compris les souscriptions, les encaissements et les distributions.</li>
          <li><strong>Avantages pour les courtiers :</strong> garantissent la transparence et la sécurité de toutes les opérations d'apport d'acheteurs et de projets.</li>
        </ul>

        <h2>6. Avantages de la tokenisation et de la propriété fractionnée pour toutes les parties</h2>
        <ul>
          <li><strong>Vendeurs :</strong> vendre un bien en totalité ou en partie, lever des capitaux rapidement, conserver la gestion et maintenir un flux de revenus.</li>
          <li><strong>Promoteurs :</strong> lever des capitaux pour des projets en cours et nouveaux, vendre en partie ou en totalité, conserver des parts et gérer les projets.</li>
          <li><strong>Acheteurs :</strong> participer avec un capital faible ou moyen, accéder à des biens diversifiés, percevoir les rendements attendus et bénéficier d'une protection juridique et financière grâce aux contrats intelligents.</li>
        </ul>

        <h2>7. Contrat de courtier</h2>
        <p>Accord juridique entre le courtier et Capimax RT précisant :</p>
        <ul>
          <li>Les commissions sur les apports de biens ou de projets.</li>
          <li>Les commissions sur les apports d'acheteurs via le code unique du courtier.</li>
          <li>Les obligations juridiques et financières envers les vendeurs, les promoteurs et les acheteurs.</li>
          <li>Le mécanisme de retrait des gains via le portefeuille numérique ou un compte bancaire.</li>
          <li>Le respect des lois et réglementations locales et internationales applicables au courtage.</li>
        </ul>

        <h2>8. Responsabilités du courtier et de la plateforme</h2>
        <h3>Responsabilités du courtier :</h3>
        <ul>
          <li>Apporter des acheteurs et des clients de manière professionnelle et transparente.</li>
          <li>Respecter les réglementations locales et internationales en matière de courtage.</li>
          <li>Suivre tous les projets et acheteurs apportés, en veillant à l'exactitude des données.</li>
          <li>Respecter les termes du contrat relatifs aux commissions et aux retraits.</li>
        </ul>
        <h3>Responsabilités de la plateforme :</h3>
        <ul>
          <li>Gérer toutes les opérations juridiques et financières des projets via la blockchain et les contrats intelligents.</li>
          <li>Vérifier les documents et les données des acheteurs et des promoteurs.</li>
          <li>Verser les commissions aux courtiers via le portefeuille numérique ou un compte bancaire.</li>
          <li>Fournir aux courtiers un tableau de bord et des outils complets pour gérer et suivre les projets et les acheteurs en toute transparence.</li>
        </ul>

        <h2>9. Tableau de bord du courtier</h2>
        <ul>
          <li>Suivre tous les projets et biens apportés.</li>
          <li>Suivre tous les acheteurs apportés, par projet ou par bien.</li>
          <li>Accéder à tous les documents et aux données financières et de propriété.</li>
          <li>Suivre les commissions et les gains, et les retirer facilement.</li>
          <li>Des outils d'analyse pour évaluer la performance des projets et les parts des acheteurs.</li>
        </ul>
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
          The platform provides real estate tokenization via blockchain and smart contracts, allowing
          fractional ownership of properties. Capimax RT operates globally without geographical
          restrictions.
        </p>
        <p>
          Properties listed on the platform are carefully verified by real estate management specialists and
          accredited global evaluation companies, including:
        </p>
        <ul>
          <li>Ready-to-rent properties with yields.</li>
          <li>Development projects in progress via four project rounds.</li>
          <li>Under-construction properties with installment plans.</li>
        </ul>
        <p>
          The platform provides dedicated dashboards for owners, sellers, developers, and brokers, as
          well as reports and analytics for properties and owned shares. It ensures full transparency and
          verification of all financial and ownership operations. An annual exit market is available for
          owners, with a liquidity provider coming soon for instant exits. Multiple payment and
          withdrawal options are supported, including traditional currencies and cryptocurrencies.
        </p>

        <h2>2. Broker Features &amp; Benefits</h2>
        <ol>
          <li>
            <strong>Commissions from property/project referrals:</strong> The broker earns a commission for every property or project referred to the
            platform that is tokenized and offered for fractional ownership.
          </li>
          <li>
            <strong>Commissions from buyer referrals:</strong> The broker earns a commission for every new buyer who registers and
            participates in subscriptions via the broker's unique referral code.
          </li>
          <li>
            <strong>Additional Benefits:</strong>
            <ul>
              <li>A comprehensive dashboard to track all referred projects and properties.</li>
              <li>Monitoring all buyers referred, including their data and documentation.</li>
              <li>Access to financial and ownership data for all projects and buyers.</li>
              <li>Digital wallet to withdraw commissions and earnings via bank account or cryptocurrency.</li>
              <li>Ability to work with buyers of different capital sizes (low, medium, high).</li>
            </ul>
          </li>
        </ol>

        <h2>3. Real Estate Tokenization</h2>
        <ul>
          <li>Conversion of properties into digital units (Tokens) representing fractional shares.</li>
          <li>Allows the broker to fully understand subscription, sales, and exit mechanisms and the benefits for all parties (seller, developer, buyer).</li>
          <li>Smart contracts guarantee automatic execution of all legal and financial terms.</li>
        </ul>

        <h2>4. Fractional Ownership</h2>
        <ul>
          <li>Enables buyers to acquire fractional shares, lowering entry barriers and distributing risks.</li>
          <li>Provides brokers the opportunity to guide buyers with different capital sizes.</li>
          <li>Supports participation across various projects securely and transparently.</li>
        </ul>

        <h2>5. Blockchain &amp; Smart Contracts</h2>
        <ul>
          <li><strong>Blockchain:</strong> Secure and transparent ledger for all property and project operations.</li>
          <li><strong>Smart Contracts:</strong> Automatically enforce all legal and financial conditions, including subscriptions, collections, and distributions.</li>
          <li><strong>Benefits for Brokers:</strong> Ensures transparency and security for all buyer and project referral operations.</li>
        </ul>

        <h2>6. Benefits of Tokenization &amp; Fractional Ownership for All Parties</h2>
        <ul>
          <li><strong>Sellers:</strong> Sell property fully or partially, raise capital quickly, retain management, and maintain income flow.</li>
          <li><strong>Developers:</strong> Raise capital for ongoing and new projects, sell partially or fully, retain shares and manage projects.</li>
          <li><strong>Buyers:</strong> Participate with low or medium capital, access diverse properties, receive expected returns, and enjoy legal and financial protection via smart contracts.</li>
        </ul>

        <h2>7. Broker Agreement</h2>
        <p>Legal agreement between the broker and Capimax RT outlining:</p>
        <ul>
          <li>Commissions from property or project referrals.</li>
          <li>Commissions from buyer referrals via the broker's unique code.</li>
          <li>Legal and financial obligations toward sellers, developers, and buyers.</li>
          <li>Mechanism for withdrawing earnings via digital wallet or bank account.</li>
          <li>Compliance with local and international laws and regulations for brokerage.</li>
        </ul>

        <h2>8. Broker &amp; Platform Responsibilities</h2>
        <h3>Broker Responsibilities:</h3>
        <ul>
          <li>Refer buyers and clients professionally and transparently.</li>
          <li>Comply with local and international brokerage regulations.</li>
          <li>Track all referred projects and buyers, ensuring data accuracy.</li>
          <li>Adhere to agreement terms regarding commissions and withdrawals.</li>
        </ul>
        <h3>Platform Responsibilities:</h3>
        <ul>
          <li>Manage all legal and financial operations for projects via blockchain and smart contracts.</li>
          <li>Verify documentation and data for buyers and developers.</li>
          <li>Pay commissions to brokers through the digital wallet or bank account.</li>
          <li>Provide a comprehensive dashboard and tools for brokers to manage and track projects and buyers transparently.</li>
        </ul>

        <h2>9. Broker Dashboard</h2>
        <ul>
          <li>Track all referred projects and properties.</li>
          <li>Monitor all referred buyers per project or property.</li>
          <li>Access all documents and financial/ownership data.</li>
          <li>Track commissions and earnings and withdraw easily.</li>
          <li>Analytical tools to evaluate project performance and buyer shares.</li>
        </ul>
      </section>
      )}
    </InfoPageLayout>
  );
};
