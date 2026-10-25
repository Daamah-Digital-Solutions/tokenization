import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const DataRoomPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'غرفة البيانات ومركز المستندات' : 'Data Room & Documentation Hub'}
      subtitle={isAr ? 'تجسيد لالتزام كابي مكس RT بالشفافية وحماية الملاك' : "Demonstrating Capimax RT's commitment to transparency and owner protection"}
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
