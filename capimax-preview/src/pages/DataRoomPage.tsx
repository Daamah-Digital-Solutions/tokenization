import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const DataRoomPage: React.FC = () => {
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
      title={isAr ? 'غرفة البيانات ومركز المستندات' : isFr ? 'Salle de données et centre de documentation' : 'Data Room & Documentation Hub'}
      subtitle={isAr ? 'تجسيد لالتزام كابي مكس RT بالشفافية وحماية الملاك' : isFr ? "L'illustration de l'engagement de Capimax RT en faveur de la transparence et de la protection des propriétaires" : "Demonstrating Capimax RT's commitment to transparency and owner protection"}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          يتضمن كل أصل مدرج غرفة بيانات رقمية آمنة تحتوي على جميع المستندات ذات الصلة لدعم اتخاذ قرارات تملّك مستنيرة.
        </p>

        <h2>محتويات غرفة البيانات</h2>
        <p>
          يتضمن كل أصل مدرج غرفة بيانات رقمية آمنة تحتوي على:
        </p>
        <ul>
          <li>مستندات الملكية وسندات الملكية</li>
          <li>مستندات تأسيس الشركة ذات الغرض الخاص (SPV) وحوكمتها</li>
          <li>تقارير تقييم مستقلة</li>
          <li>وثائق التأمين</li>
          <li>اتفاقيات إدارة العقارات</li>
          <li>تقارير مالية وتشغيلية دورية</li>
          <li>كشوف التوزيعات</li>
          <li>سجل الأحداث الجوهرية</li>
        </ul>

        <h2>مزايا غرفة البيانات</h2>
        <ul className="check-list">
          <li>بحث وتصنيف متقدّم</li>
          <li>إدارة الإصدارات وسجل التدقيق</li>
          <li>صلاحيات وصول حسب الدور</li>
          <li>عرض وتنزيل آمن</li>
        </ul>

        <h2>لماذا يهم ذلك</h2>
        <p>
          الشفافية:
        </p>
        <ul>
          <li>تعزّز ثقة الملاك</li>
          <li>تقلّل عدم تكافؤ المعلومات</li>
          <li>تحدّ من النزاعات</li>
          <li>تدعم اتخاذ قرارات مستنيرة</li>
        </ul>

        <div className="info-highlight">
          <strong>الوصول:</strong> يحصل الملاك الموثّقون على حق الوصول إلى غرفة البيانات لكل عقار يدرسونه أو اشتروه. ويخضع الوصول إلى المستندات لقواعد المنصة ومتطلبات الامتثال.
        </div>

        <h2>صفحات ذات صلة</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            ما هي الشركة ذات الغرض الخاص (SPV)
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            دليل الشريك المالك
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/properties')}>
            تصفّح العقارات
          </button>
        </div>
      </section>
      ) : isFr ? (
      <section className="info-section">
        <p className="info-intro">
          Chaque actif proposé dispose d'une salle de données numérique sécurisée contenant toute la documentation pertinente pour vous aider à prendre des décisions de propriété éclairées.
        </p>

        <h2>Contenu de la salle de données</h2>
        <p>
          Chaque actif proposé dispose d'une salle de données numérique sécurisée contenant :
        </p>
        <ul>
          <li>Les documents de propriété et les titres</li>
          <li>Les documents de constitution et de gouvernance de la SPV</li>
          <li>Des rapports d'évaluation indépendants</li>
          <li>Les polices d'assurance</li>
          <li>Les contrats de gestion du bien</li>
          <li>Des rapports financiers et opérationnels périodiques</li>
          <li>Les relevés de distribution</li>
          <li>Le registre des événements importants</li>
        </ul>

        <h2>Fonctionnalités de la salle de données</h2>
        <ul className="check-list">
          <li>Recherche et classement avancés</li>
          <li>Gestion des versions et piste d'audit</li>
          <li>Droits d'accès selon le rôle</li>
          <li>Consultation et téléchargement sécurisés</li>
        </ul>

        <h2>Pourquoi c'est important</h2>
        <p>
          La transparence :
        </p>
        <ul>
          <li>Renforce la confiance des propriétaires</li>
          <li>Réduit l'asymétrie d'information</li>
          <li>Limite les litiges</li>
          <li>Favorise des décisions éclairées</li>
        </ul>

        <div className="info-highlight">
          <strong>Accès :</strong> Les propriétaires vérifiés ont accès à la salle de données de chaque bien qu'ils envisagent ou qu'ils ont acheté. L'accès à la documentation est soumis aux règles de la plateforme et aux exigences de conformité.
        </div>

        <h2>Pages associées</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            Qu'est-ce qu'une SPV
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            Guide du copropriétaire
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/properties')}>
            Parcourir les biens
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          Each listed asset includes a secure digital data room containing all relevant documentation to support informed ownership decisions.
        </p>

        <h2>Contents of the Data Room</h2>
        <p>
          Each listed asset includes a secure digital data room containing:
        </p>
        <ul>
          <li>Ownership and title documentation</li>
          <li>SPV incorporation and governance documents</li>
          <li>Independent valuation reports</li>
          <li>Insurance policies</li>
          <li>Property management agreements</li>
          <li>Periodic financial and operational reports</li>
          <li>Distribution statements</li>
          <li>Material events log</li>
        </ul>

        <h2>Data Room Features</h2>
        <ul className="check-list">
          <li>Advanced search and categorization</li>
          <li>Version control and audit trail</li>
          <li>Role-based access permissions</li>
          <li>Secure viewing and download</li>
        </ul>

        <h2>Why This Matters</h2>
        <p>
          Transparency:
        </p>
        <ul>
          <li>Enhances owner confidence</li>
          <li>Reduces information asymmetry</li>
          <li>Mitigates disputes</li>
          <li>Supports informed decision-making</li>
        </ul>

        <div className="info-highlight">
          <strong>Access:</strong> Verified owners gain access to the Data Room for each property they are considering or have purchased. Documentation access is subject to platform rules and compliance requirements.
        </div>

        <h2>Related Pages</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            Co-Owner Guide
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/properties')}>
            Browse Properties
          </button>
        </div>
      </section>
      )}
    </InfoPageLayout>
  );
};
