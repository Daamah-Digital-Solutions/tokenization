import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const PrivacyPolicyPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          تلتزم كابي مكس RT بحماية البيانات الشخصية واحترام خصوصية المستخدمين.
        </p>

        <h2>4.1 البيانات التي يتم جمعها</h2>
        <ul>
          <li>بيانات الهوية (الاسم، رقم الهوية، تاريخ الميلاد)؛</li>
          <li>معلومات الاتصال؛</li>
          <li>بيانات الامتثال (التحقق من هوية العملاء والشركات KYC/KYB)؛</li>
          <li>بيانات المعاملات والاستخدام؛</li>
          <li>البيانات التقنية (عنوان IP، الجهاز، ملفات تعريف الارتباط).</li>
        </ul>

        <h2>4.2 أغراض المعالجة</h2>
        <p>تُعالَج البيانات من أجل:</p>
        <ul>
          <li>إنشاء الحسابات وإدارتها؛</li>
          <li>الوفاء بالتزامات الامتثال؛</li>
          <li>تسهيل عمليات المنصة؛</li>
          <li>تحسين الخدمات والأمان؛</li>
          <li>التواصل مع المستخدمين.</li>
        </ul>

        <h2>4.3 مشاركة البيانات</h2>
        <p>يجوز مشاركة البيانات مع:</p>
        <ul>
          <li>مزوّدي خدمات الامتثال والتحقق من الهوية؛</li>
          <li>شركاء الدفع والتقنية؛</li>
          <li>الجهات القانونية أو التنظيمية عندما يقتضي القانون ذلك.</li>
        </ul>

        <h2>4.4 الاحتفاظ بالبيانات</h2>
        <p>
          لا يُحتفظ بالبيانات الشخصية إلا للمدة اللازمة للوفاء بالالتزامات القانونية والتنظيمية والتشغيلية.
        </p>

        <h2>4.5 حقوق المستخدمين</h2>
        <p>
          يجوز للمستخدمين طلب الوصول إلى بياناتهم الشخصية أو تصحيحها أو حذفها، مع مراعاة القيود القانونية.
        </p>

        <h2>4.6 أمن البيانات</h2>
        <p>
          تُطبَّق تدابير تقنية وتنظيمية مناسبة لحماية البيانات الشخصية.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT is committed to protecting personal data and respecting user privacy.
        </p>

        <h2>4.1 Data Collected</h2>
        <ul>
          <li>Identification data (name, ID, date of birth);</li>
          <li>Contact information;</li>
          <li>Compliance data (KYC/KYB);</li>
          <li>Transaction and usage data;</li>
          <li>Technical data (IP address, device, cookies).</li>
        </ul>

        <h2>4.2 Purpose of Processing</h2>
        <p>Data is processed to:</p>
        <ul>
          <li>Create and manage accounts;</li>
          <li>Fulfill compliance obligations;</li>
          <li>Facilitate platform operations;</li>
          <li>Improve services and security;</li>
          <li>Communicate with users.</li>
        </ul>

        <h2>4.3 Data Sharing</h2>
        <p>Data may be shared with:</p>
        <ul>
          <li>Compliance and KYC providers;</li>
          <li>Payment and technology partners;</li>
          <li>Legal or regulatory authorities when required by law.</li>
        </ul>

        <h2>4.4 Data Retention</h2>
        <p>
          Personal data is retained only for as long as necessary to meet legal, regulatory, and operational obligations.
        </p>

        <h2>4.5 User Rights</h2>
        <p>
          Users may request access, correction, or deletion of personal data, subject to legal limitations.
        </p>

        <h2>4.6 Data Security</h2>
        <p>
          Appropriate technical and organizational measures are implemented to safeguard personal data.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
