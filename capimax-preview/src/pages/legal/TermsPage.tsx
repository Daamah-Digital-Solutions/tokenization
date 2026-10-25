import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const TermsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'شروط وأحكام الاستخدام' : 'Terms and Conditions of Use'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <h2>5.1 نطاق الخدمة</h2>
        <p>
          توفّر كابي مكس RT أدوات رقمية لتسهيل إدارة التملّك المرمّز.
        </p>

        <h2>5.2 التزامات المستخدم</h2>
        <p>يجب على المستخدمين:</p>
        <ul>
          <li>تقديم معلومات دقيقة؛</li>
          <li>الامتثال للقوانين وسياسات المنصة؛</li>
          <li>الامتناع عن إساءة الاستخدام أو القيام بأنشطة غير مصرّح بها.</li>
        </ul>

        <h2>5.3 الإقرار بشأن التملّك</h2>
        <p>يُقرّ المستخدمون بما يلي:</p>
        <ul>
          <li>أن تملّك العقارات المرمّزة ينطوي على طابع مضاربي؛</li>
          <li>أنه لا توجد أي عوائد أو سيولة مضمونة؛</li>
          <li>أن معلومات المنصة لا تُشكّل مشورة.</li>
        </ul>

        <h2>5.4 الرسوم</h2>
        <p>
          قد تشمل الرسوم رسوم الإدراج ورسوم الإدارة ورسوم التداول ورسوم الخدمات الاختيارية، وفقًا لما يُفصَح عنه قبل إجراء المعاملات.
        </p>

        <h2>5.5 التعليق والإنهاء</h2>
        <p>يجوز لكابي مكس RT تعليق الحسابات أو إنهاؤها بسبب:</p>
        <ul>
          <li>مخالفات الامتثال؛</li>
          <li>الاحتيال أو إساءة الاستخدام؛</li>
          <li>المتطلبات القانونية أو التنظيمية.</li>
        </ul>

        <h2>5.6 تحديد المسؤولية</h2>
        <p>
          إلى أقصى حد يسمح به القانون، لا تتحمّل كابي مكس RT المسؤولية عن أي خسائر غير مباشرة أو عرضية أو تبعية.
        </p>

        <h2>5.7 القانون الحاكم</h2>
        <p>
          تخضع هذه الشروط لقوانين الولاية القضائية المعمول بها التي تحدّدها المنصة.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <h2>5.1 Scope of Service</h2>
        <p>
          Capimax RT provides digital tools to facilitate tokenized ownership administration.
        </p>

        <h2>5.2 User Obligations</h2>
        <p>Users must:</p>
        <ul>
          <li>Provide accurate information;</li>
          <li>Comply with laws and platform policies;</li>
          <li>Refrain from misuse or unauthorized activities.</li>
        </ul>

        <h2>5.3 Ownership Acknowledgment</h2>
        <p>Users acknowledge that:</p>
        <ul>
          <li>Tokenized real estate ownership is speculative;</li>
          <li>No returns or liquidity are guaranteed;</li>
          <li>Platform information does not constitute advice.</li>
        </ul>

        <h2>5.4 Fees</h2>
        <p>
          Fees may include listing fees, management fees, trading fees, and optional service fees, as disclosed prior to transactions.
        </p>

        <h2>5.5 Suspension & Termination</h2>
        <p>Capimax RT may suspend or terminate accounts for:</p>
        <ul>
          <li>Compliance violations;</li>
          <li>Fraud or misuse;</li>
          <li>Legal or regulatory requirements.</li>
        </ul>

        <h2>5.6 Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Capimax RT shall not be liable for indirect, incidental, or consequential losses.
        </p>

        <h2>5.7 Governing Law</h2>
        <p>
          These Terms are governed by the laws of the applicable jurisdiction specified by the platform.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
