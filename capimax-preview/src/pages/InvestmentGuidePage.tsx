import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const InvestmentGuidePage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <InfoPageLayout
      title={isAr ? 'دليل التملّك' : isFr ? 'Guide de propriété' : 'Ownership Guide'}
      subtitle={isAr ? 'منصة كابي مكس RT – التملّك العقاري المرمّز' : isFr ? 'Plateforme Capi Max RT – Propriété immobilière tokenisée' : 'Capi Max RT Platform – Tokenized Real Estate Ownership'}
    >
      {isAr ? (
      <section className="info-section">
        <h2>المرحلة 1: التسجيل والتحقق</h2>

        <h3>1) إنشاء الحساب</h3>
        <p><strong>إجراءات المالك:</strong></p>
        <ul>
          <li>إنشاء حساب مستخدم على المنصة</li>
          <li>
            إدخال المعلومات الأساسية:
            <ul>
              <li>الاسم القانوني</li>
              <li>البريد الإلكتروني</li>
              <li>رقم الهاتف</li>
              <li>الدولة</li>
            </ul>
          </li>
        </ul>

        <h3>2) التحقق والامتثال (التحقق من الهوية / مكافحة غسل الأموال)</h3>
        <p>لضمان الامتثال وحماية المالك:</p>
        <ul>
          <li>رفع مستندات الهوية</li>
          <li>إثبات محل الإقامة</li>
          <li>التحقق من مصدر الأموال</li>
          <li>تحديد نوع المالك (فرد / شركة)</li>
        </ul>
        <p><strong>ما يحدث بعد التحقق:</strong></p>
        <ul>
          <li>تفعيل الحساب لأغراض التملّك</li>
          <li>وصول كامل إلى المنصة</li>
          <li>ربط الحساب بالإطار التنظيمي والقانوني</li>
        </ul>

        <h2>المرحلة 2: تمويل الحساب</h2>
        <h3>وسائل التمويل:</h3>
        <ul>
          <li>التحويل البنكي</li>
          <li>العملات المشفّرة المعتمدة</li>
          <li>المحافظ الرقمية المتوافقة</li>
        </ul>
        <h3>الإجراء الفني:</h3>
        <ul>
          <li>تسجيل الأموال في حساب المالك</li>
          <li>ربط الأموال بمحفظة التملّك</li>
          <li>منع استخدام الأموال خارج الأطر المصرّح بها</li>
        </ul>

        <h2>المرحلة 3: اختيار استراتيجية التملّك</h2>
        <p>
          توفّر المنصة 3 استراتيجيات تملّك واضحة، ويختار المالك إحداها وفقًا لهدفه:
        </p>
        <h3>1) التملّك المُدرّ للدخل</h3>
        <ul>
          <li>عقارات جاهزة للتأجير</li>
          <li>عوائد دورية منتظمة</li>
          <li>مخاطر أقل</li>
          <li>توزيع آلي للعوائد</li>
          <li>مناسب للملاك الباحثين عن دخل مستقر</li>
        </ul>
        <h3>2) التملّك التطويري</h3>
        <ul>
          <li>عقارات قيد التطوير</li>
          <li>عوائد أعلى على المدى المتوسط</li>
          <li>مرتبط باكتمال المشروع</li>
          <li>أرباح من البيع أو التشغيل</li>
          <li>مناسب للملاك الذين يقبلون مخاطر أعلى مقابل عوائد أعلى</li>
        </ul>
        <h3>3) التملّك بالأقساط / على مراحل</h3>
        <ul>
          <li>الدخول بمبالغ أصغر</li>
          <li>الدفع على مراحل</li>
          <li>تراكم تدريجي للحقوق</li>
          <li>التزام مرن</li>
          <li>مناسب للملاك على المدى الطويل أو ذوي السيولة المحدودة</li>
        </ul>

        <h2>المرحلة 4: شراء الحصص</h2>
        <h3>خطوات الشراء:</h3>
        <ul>
          <li>اختيار العقار</li>
          <li>تحديد عدد الحصص</li>
          <li>
            مراجعة:
            <ul>
              <li>العائد المتوقع</li>
              <li>الحقوق التي تمثّلها</li>
              <li>مدة الملكية</li>
            </ul>
          </li>
          <li>تأكيد الشراء</li>
        </ul>
        <h3>ما يحدث من الناحية الفنية:</h3>
        <ul>
          <li>تنفيذ المعاملة عبر العقد الذكي</li>
          <li>خصم الرصيد</li>
          <li>تسجيل الملكية الرقمية</li>
        </ul>

        <h2>المرحلة 5: الحصص ولوحة التحكم</h2>
        <h3>تحويل الحصص:</h3>
        <ul>
          <li>تُرسل الحصص مباشرة إلى محفظتك</li>
          <li>تمثّل كل حصة نصيبًا موثّقًا</li>
        </ul>
        <h3>تعرض لوحة التحكم:</h3>
        <ul>
          <li>عدد الحصص المملوكة</li>
          <li>قيمة الملكية</li>
          <li>العوائد المتراكمة</li>
          <li>سجل المعاملات</li>
          <li>المستندات القانونية المرتبطة</li>
        </ul>

        <h2>المرحلة 6: توزيع العوائد</h2>
        <h3>كيفية احتساب العوائد:</h3>
        <p>بناءً على:</p>
        <ul>
          <li>عدد الحصص</li>
          <li>أداء العقار</li>
          <li>نوع الملكية</li>
        </ul>
        <h3>آلية التوزيع:</h3>
        <ul>
          <li>آليًا عبر العقد الذكي</li>
          <li>مباشرة إلى محفظة المالك</li>
          <li>مسجّلة على البلوك تشين</li>
        </ul>

        <h2>المرحلة 7: متابعة الأسعار</h2>
        <p>يمكن للمالك:</p>
        <ul>
          <li>متابعة سعر الحصة</li>
          <li>مراقبة الأداء التاريخي</li>
          <li>مقارنة العائد المتوقع بالعائد الفعلي</li>
          <li>الاطلاع على التقارير الدورية</li>
        </ul>

        <h2>المرحلة 8: سحب العوائد</h2>
        <h3>خيارات السحب:</h3>
        <ul>
          <li>التحويل إلى المحفظة الرقمية</li>
          <li>إعادة استثمار العوائد</li>
          <li>التحويل البنكي (إن كان متاحًا)</li>
        </ul>
        <h3>الضوابط:</h3>
        <ul>
          <li>وفقًا لشروط العقار</li>
          <li>وفقًا لدورة التوزيع</li>
          <li>الامتثال للأنظمة القانونية</li>
        </ul>

        <h2>المرحلة 9: التخارج</h2>
        <p>توفّر المنصة عدة خيارات للتخارج:</p>
        <ol>
          <li>
            <strong>بيع الحصص داخل المنصة</strong>
            <ul>
              <li>التداول الداخلي</li>
              <li>سيولة مرنة</li>
            </ul>
          </li>
          <li>
            <strong>التخارج عند بيع العقار</strong>
            <ul>
              <li>التوزيع النهائي للأرباح</li>
              <li>حرق الرموز الرقمية</li>
            </ul>
          </li>
          <li>
            <strong>نقل الملكية إلى مالك آخر</strong>
            <ul>
              <li>عبر العقد الذكي</li>
              <li>تحديث آلي للسجل</li>
            </ul>
          </li>
        </ol>
        <h3>ما يحدث بعد التخارج:</h3>
        <ul>
          <li>التسوية الكاملة للحقوق</li>
          <li>تسجيل المعاملة النهائية</li>
          <li>تقرير ختامي للمالك</li>
        </ul>

        <h2>ملخص دليل التملّك</h2>
        <p>يوفّر هذا النظام:</p>
        <ul>
          <li>شفافية كاملة</li>
          <li>حماية قانونية</li>
          <li>شفافية تقنية</li>
          <li>عوائد منظّمة</li>
          <li>خيارات تخارج مرنة</li>
          <li>امتثال مدمج</li>
        </ul>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <h2>Phase 1 : inscription et vérification</h2>

        <h3>1) Création du compte</h3>
        <p><strong>Actions du propriétaire :</strong></p>
        <ul>
          <li>Créer un compte utilisateur sur la plateforme</li>
          <li>
            Saisir les informations de base :
            <ul>
              <li>Nom légal</li>
              <li>Adresse e-mail</li>
              <li>Numéro de téléphone</li>
              <li>Pays</li>
            </ul>
          </li>
        </ul>

        <h3>2) Vérification et conformité (KYC / AML)</h3>
        <p>Pour garantir la conformité et la protection du propriétaire :</p>
        <ul>
          <li>Téléverser les pièces d'identité</li>
          <li>Justificatif de domicile</li>
          <li>Vérifier l'origine des fonds</li>
          <li>Préciser le type de propriétaire (particulier / société)</li>
        </ul>
        <p><strong>Ce qui se passe après la vérification :</strong></p>
        <ul>
          <li>Activation du compte à des fins d'accession à la propriété</li>
          <li>Accès complet à la plateforme</li>
          <li>Rattachement du compte au cadre réglementaire et juridique</li>
        </ul>

        <h2>Phase 2 : alimentation du compte</h2>
        <h3>Moyens d'alimentation :</h3>
        <ul>
          <li>Virement bancaire</li>
          <li>Cryptomonnaies approuvées</li>
          <li>Portefeuilles numériques compatibles</li>
        </ul>
        <h3>Processus technique :</h3>
        <ul>
          <li>Enregistrement des fonds sur le compte du propriétaire</li>
          <li>Rattachement des fonds au portefeuille de propriété</li>
          <li>Interdiction d'utiliser les fonds en dehors des cadres autorisés</li>
        </ul>

        <h2>Phase 3 : choix d'une stratégie de propriété</h2>
        <p>
          La plateforme propose 3 stratégies de propriété claires. Le propriétaire en choisit une selon
          son objectif :
        </p>
        <h3>1) Propriété génératrice de revenus</h3>
        <ul>
          <li>Biens prêts à la location</li>
          <li>Rendements périodiques réguliers</li>
          <li>Risque plus faible</li>
          <li>Distribution automatique des rendements</li>
          <li>Adaptée aux propriétaires recherchant un revenu stable</li>
        </ul>
        <h3>2) Propriété en développement</h3>
        <ul>
          <li>Biens en cours de développement</li>
          <li>Rendements plus élevés à moyen terme</li>
          <li>Dépend de l'achèvement du projet</li>
          <li>Bénéfices issus de la vente ou de l'exploitation</li>
          <li>Adaptée aux propriétaires acceptant un risque plus élevé en contrepartie de rendements plus élevés</li>
        </ul>
        <h3>3) Propriété par échéances / progressive</h3>
        <ul>
          <li>Entrée avec des montants plus faibles</li>
          <li>Paiement par étapes</li>
          <li>Acquisition progressive des droits</li>
          <li>Engagement flexible</li>
          <li>Adaptée aux propriétaires à long terme ou disposant de liquidités limitées</li>
        </ul>

        <h2>Phase 4 : achat de jetons</h2>
        <h3>Étapes de l'achat :</h3>
        <ul>
          <li>Sélectionner le bien</li>
          <li>Indiquer le nombre de jetons</li>
          <li>
            Vérifier :
            <ul>
              <li>Le rendement attendu</li>
              <li>Les droits représentés</li>
              <li>La durée de détention</li>
            </ul>
          </li>
          <li>Confirmer l'achat</li>
        </ul>
        <h3>Ce qui se passe techniquement :</h3>
        <ul>
          <li>Transaction exécutée via un contrat intelligent</li>
          <li>Débit du solde</li>
          <li>Enregistrement de la propriété numérique</li>
        </ul>

        <h2>Phase 5 : jetons et tableau de bord</h2>
        <h3>Transfert des jetons :</h3>
        <ul>
          <li>Jetons envoyés directement dans votre portefeuille</li>
          <li>Chaque jeton représente une part documentée</li>
        </ul>
        <h3>Le tableau de bord affiche :</h3>
        <ul>
          <li>Le nombre de jetons détenus</li>
          <li>La valeur de la propriété</li>
          <li>Les rendements cumulés</li>
          <li>L'historique des transactions</li>
          <li>Les documents juridiques associés</li>
        </ul>

        <h2>Phase 6 : distribution des rendements</h2>
        <h3>Calcul des rendements :</h3>
        <p>En fonction de :</p>
        <ul>
          <li>Nombre de jetons</li>
          <li>Performance du bien</li>
          <li>Type de propriété</li>
        </ul>
        <h3>Mécanisme de distribution :</h3>
        <ul>
          <li>Automatique via un contrat intelligent</li>
          <li>Directement dans le portefeuille du propriétaire</li>
          <li>Enregistrée sur la blockchain</li>
        </ul>

        <h2>Phase 7 : suivi des prix</h2>
        <p>Le propriétaire peut :</p>
        <ul>
          <li>Suivre le prix du jeton</li>
          <li>Suivre la performance historique</li>
          <li>Comparer le rendement attendu et le rendement réel</li>
          <li>Accéder aux rapports périodiques</li>
        </ul>

        <h2>Phase 8 : retrait des rendements</h2>
        <h3>Options de retrait :</h3>
        <ul>
          <li>Transfert vers le portefeuille numérique</li>
          <li>Réinvestissement des rendements</li>
          <li>Virement bancaire (si disponible)</li>
        </ul>
        <h3>Encadrement :</h3>
        <ul>
          <li>Selon les conditions du bien</li>
          <li>Selon le cycle de distribution</li>
          <li>Dans le respect de la réglementation</li>
        </ul>

        <h2>Phase 9 : sortie</h2>
        <p>La plateforme propose plusieurs options de sortie :</p>
        <ol>
          <li>
            <strong>Vendre des jetons au sein de la plateforme</strong>
            <ul>
              <li>Échanges internes</li>
              <li>Liquidité flexible</li>
            </ul>
          </li>
          <li>
            <strong>Sortie lors de la vente du bien</strong>
            <ul>
              <li>Distribution finale des bénéfices</li>
              <li>Destruction (burn) des jetons</li>
            </ul>
          </li>
          <li>
            <strong>Transférer la propriété à un autre propriétaire</strong>
            <ul>
              <li>Via un contrat intelligent</li>
              <li>Mise à jour automatique des registres</li>
            </ul>
          </li>
        </ol>
        <h3>Ce qui se passe après la sortie :</h3>
        <ul>
          <li>Règlement complet des droits</li>
          <li>Enregistrement de la transaction finale</li>
          <li>Rapport de clôture pour le propriétaire</li>
        </ul>

        <h2>Résumé du guide de propriété</h2>
        <p>Ce système offre :</p>
        <ul>
          <li>Une transparence totale</li>
          <li>Une protection juridique</li>
          <li>Une transparence technique</li>
          <li>Des rendements structurés</li>
          <li>Des options de sortie flexibles</li>
          <li>Une conformité intégrée</li>
        </ul>
      </section>
      ) : (
      <section className="info-section">
        <h2>Phase 1: Registration &amp; Verification</h2>

        <h3>1) Account Creation</h3>
        <p><strong>Owner Actions:</strong></p>
        <ul>
          <li>Create a user account on the platform</li>
          <li>
            Enter basic information:
            <ul>
              <li>Legal name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Country</li>
            </ul>
          </li>
        </ul>

        <h3>2) Verification &amp; Compliance (KYC / AML)</h3>
        <p>To ensure compliance and owner protection:</p>
        <ul>
          <li>Upload identity documents</li>
          <li>Proof of residence</li>
          <li>Verify source of funds</li>
          <li>Specify owner type (Individual / Company)</li>
        </ul>
        <p><strong>What happens after verification:</strong></p>
        <ul>
          <li>Activate account for ownership purposes</li>
          <li>Full access to the platform</li>
          <li>Link account to regulatory and legal framework</li>
        </ul>

        <h2>Phase 2: Funding the Account</h2>
        <h3>Funding Methods:</h3>
        <ul>
          <li>Bank transfer</li>
          <li>Approved cryptocurrencies</li>
          <li>Compatible digital wallets</li>
        </ul>
        <h3>Technical Process:</h3>
        <ul>
          <li>Register funds in the owner's account</li>
          <li>Link funds to ownership wallet</li>
          <li>Prevent use of funds outside authorized frameworks</li>
        </ul>

        <h2>Phase 3: Choosing an Ownership Strategy</h2>
        <p>
          The platform offers 3 clear ownership strategies. The owner selects one according to
          their objective:
        </p>
        <h3>1) Income-Generating Ownership</h3>
        <ul>
          <li>Ready-to-rent properties</li>
          <li>Regular periodic yields</li>
          <li>Lower risk</li>
          <li>Automatic yield distribution</li>
          <li>Suitable for owners seeking stable income</li>
        </ul>
        <h3>2) Development Ownership</h3>
        <ul>
          <li>Properties under development</li>
          <li>Higher returns in the medium term</li>
          <li>Dependent on project completion</li>
          <li>Profits from sale or operation</li>
          <li>Suitable for owners accepting higher risk for higher returns</li>
        </ul>
        <h3>3) Installment / Phased Ownership</h3>
        <ul>
          <li>Enter with smaller amounts</li>
          <li>Payment in stages</li>
          <li>Gradual rights accumulation</li>
          <li>Flexible commitment</li>
          <li>Suitable for long-term owners or those with limited liquidity</li>
        </ul>

        <h2>Phase 4: Token Purchase</h2>
        <h3>Purchase Steps:</h3>
        <ul>
          <li>Select the property</li>
          <li>Specify the number of tokens</li>
          <li>
            Review:
            <ul>
              <li>Expected yield</li>
              <li>Rights represented</li>
              <li>Ownership duration</li>
            </ul>
          </li>
          <li>Confirm purchase</li>
        </ul>
        <h3>What Happens Technically:</h3>
        <ul>
          <li>Transaction executed via smart contract</li>
          <li>Deduct balance</li>
          <li>Register digital ownership</li>
        </ul>

        <h2>Phase 5: Tokens &amp; Dashboard</h2>
        <h3>Token Transfer:</h3>
        <ul>
          <li>Tokens sent directly to your wallet</li>
          <li>Each token represents a documented share</li>
        </ul>
        <h3>Dashboard Shows:</h3>
        <ul>
          <li>Number of tokens owned</li>
          <li>Ownership value</li>
          <li>Accumulated yields</li>
          <li>Transaction history</li>
          <li>Linked legal documents</li>
        </ul>

        <h2>Phase 6: Yield Distribution</h2>
        <h3>How Yields Are Calculated:</h3>
        <p>Based on:</p>
        <ul>
          <li>Number of tokens</li>
          <li>Property performance</li>
          <li>Type of ownership</li>
        </ul>
        <h3>Distribution Mechanism:</h3>
        <ul>
          <li>Automatic via smart contract</li>
          <li>Directly to owner wallet</li>
          <li>Recorded on blockchain</li>
        </ul>

        <h2>Phase 7: Price Tracking</h2>
        <p>Owner Can:</p>
        <ul>
          <li>Track token price</li>
          <li>Monitor historical performance</li>
          <li>Compare expected vs actual yield</li>
          <li>Access periodic reports</li>
        </ul>

        <h2>Phase 8: Yield Withdrawal</h2>
        <h3>Withdrawal Options:</h3>
        <ul>
          <li>Transfer to digital wallet</li>
          <li>Reinvest yields</li>
          <li>Bank transfer (if available)</li>
        </ul>
        <h3>Controls:</h3>
        <ul>
          <li>According to property terms</li>
          <li>According to distribution cycle</li>
          <li>Compliance with legal regulations</li>
        </ul>

        <h2>Phase 9: Exit</h2>
        <p>The platform provides several exit options:</p>
        <ol>
          <li>
            <strong>Sell tokens within the platform</strong>
            <ul>
              <li>Internal trading</li>
              <li>Flexible liquidity</li>
            </ul>
          </li>
          <li>
            <strong>Exit upon property sale</strong>
            <ul>
              <li>Final profit distribution</li>
              <li>Token burn</li>
            </ul>
          </li>
          <li>
            <strong>Transfer ownership to another owner</strong>
            <ul>
              <li>Via smart contract</li>
              <li>Automatic record update</li>
            </ul>
          </li>
        </ol>
        <h3>What Happens After Exit:</h3>
        <ul>
          <li>Complete settlement of rights</li>
          <li>Final transaction recorded</li>
          <li>Closing report for the owner</li>
        </ul>

        <h2>Ownership Guide Summary</h2>
        <p>This system provides:</p>
        <ul>
          <li>Full transparency</li>
          <li>Legal protection</li>
          <li>Technical transparency</li>
          <li>Structured yields</li>
          <li>Flexible exit options</li>
          <li>Embedded compliance</li>
        </ul>
      </section>
      )}
    </InfoPageLayout>
  );
};
