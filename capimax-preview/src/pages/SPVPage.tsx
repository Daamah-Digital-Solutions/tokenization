import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const SPVPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'ما هي الشركة ذات الغرض الخاص (SPV) وكيف تحمي الملاك؟' : 'What Is an SPV and How Does It Protect Owners?'}
      subtitle={isAr ? 'فهم هيكل الشركة ذات الغرض الخاص (SPV) بوصفه آلية قانونية للحد من المخاطر' : 'Understanding the SPV structure as a legal and risk-mitigation mechanism'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          لشرح هيكل الشركة ذات الغرض الخاص (SPV) بوصفه آلية قانونية للحد من المخاطر.
        </p>

        <h2>ما هي الشركة ذات الغرض الخاص (SPV)؟</h2>
        <p>
          الشركة ذات الغرض الخاص (SPV) شركة مستقلة قانونيًا تُنشأ لغرض واحد ومحدد، مثل تملّك عقار واحد أو تنفيذ مشروع عقاري واحد.
        </p>

        <h2>لماذا تستخدم كابي مكس RT الشركات ذات الغرض الخاص (SPV)</h2>
        <ul>
          <li>لعزل المخاطر</li>
          <li>لمنع اختلاط الأصول</li>
          <li>لحماية الملاك من الالتزامات غير المرتبطة</li>
          <li>لتمكين إعداد تقارير وحوكمة واضحة</li>
        </ul>

        <h2>كيف تحمي الشركات ذات الغرض الخاص (SPV) الملاك</h2>
        <ul className="check-list">
          <li>تحتفظ الشركة ذات الغرض الخاص (SPV) بالأصول قانونيًا</li>
          <li>الحسابات المالية معزولة ومحصّنة</li>
          <li>تقتصر الالتزامات على المشروع المحدد</li>
          <li>مصالح الملاك محددة تعاقديًا</li>
        </ul>

        <h2>ما الذي يملكه الملاك فعليًا</h2>
        <p>
          يحتفظ الملاك بـ:
        </p>
        <ul>
          <li>حقوق اقتصادية أو تعاقدية في الشركة ذات الغرض الخاص (SPV)</li>
          <li>محددة بموجب اتفاقيات الملكية</li>
          <li>قابلة للنقل وفق قواعد المنصة</li>
        </ul>

        <div className="info-highlight">
          <strong>مهم:</strong> لا يحمل الملاك مباشرةً سند الملكية المسجّل في السجل العقاري للعقار المادي، بل يحملون حقوقًا اقتصادية أو تعاقدية في شركة ذات غرض خاص (SPV)، وليس ملكية مباشرة مسجّلة في السجل العقاري، ما لم يُنص على خلاف ذلك صراحةً في مستندات الطرح.
        </div>

        <h2>اعرف المزيد</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
            ما هو الترميز
          </button>
          <button className="link-button" onClick={() => navigateToPage('/data-room')}>
            غرفة البيانات
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/how-it-works')}>
            كيف تعمل المنصة
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          To explain the SPV structure as a legal and risk-mitigation mechanism.
        </p>

        <h2>What Is an SPV?</h2>
        <p>
          A Special Purpose Vehicle (SPV) is a legally independent company created for a single, specific purpose, such as owning one property or executing one real estate project.
        </p>

        <h2>Why Capimax RT Uses SPVs</h2>
        <ul>
          <li>To isolate risks</li>
          <li>To prevent asset commingling</li>
          <li>To protect owners from unrelated liabilities</li>
          <li>To enable clear reporting and governance</li>
        </ul>

        <h2>How SPVs Protect Owners</h2>
        <ul className="check-list">
          <li>Assets are legally held by the SPV</li>
          <li>Financial accounts are ring-fenced</li>
          <li>Obligations are limited to the specific project</li>
          <li>Owner interests are defined contractually</li>
        </ul>

        <h2>What Owners Actually Own</h2>
        <p>
          Owners hold:
        </p>
        <ul>
          <li>Economic or contractual rights in the SPV</li>
          <li>Defined by ownership agreements</li>
          <li>Transferable under platform rules</li>
        </ul>

        <div className="info-highlight">
          <strong>Important:</strong> Owners do not directly hold the physical property's land registry title. They hold economic or contractual rights in an SPV, not direct land registry ownership, unless explicitly stated in the offering documentation.
        </div>

        <h2>Learn More</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/tokenization')}>
            What is Tokenization
          </button>
          <button className="link-button" onClick={() => navigateToPage('/data-room')}>
            Data Room
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/how-it-works')}>
            How It Works
          </button>
        </div>
      </section>
      )}
    </InfoPageLayout>
  );
};
