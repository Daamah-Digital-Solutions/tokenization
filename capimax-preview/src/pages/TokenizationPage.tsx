import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const TokenizationPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'ما هو ترميز العقارات؟' : 'What Is Real Estate Tokenization?'}
      subtitle={isAr ? 'شرح تعليمي بلغة بسيطة وغير تقنية' : 'An educational explanation in plain, non-technical language'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          يقدّم هذا القسم شرحًا تعليميًا لترميز العقارات بلغة بسيطة وغير تقنية لعموم المستخدمين.
        </p>

        <h2>التعريف</h2>
        <p>
          ترميز العقارات هو أسلوب لتمثيل حقوق المشاركة الاقتصادية في أصل عقاري تمثيلًا رقميًا من خلال وحدات ملكية منظّمة، بما يتيح لعدة ملاك المشاركة في أصل واحد دون تملّك مباشر للعقار المادي.
        </p>

        <h2>ما الذي يتيحه الترميز</h2>
        <ul className="check-list">
          <li>إتاحة الملكية الجزئية</li>
          <li>حدود دخول أقل من حيث رأس المال</li>
          <li>مشاركة أوسع للملاك</li>
          <li>تحسين الشفافية وحفظ السجلات</li>
          <li>تداول منظّم في السوق الثانوية</li>
        </ul>

        <h2>ما لا يعنيه الترميز</h2>
        <ul className="cross-list">
          <li>لا يضمن الأرباح أو الدخل</li>
          <li>لا يلغي مخاطر التملّك</li>
          <li>لا يمنح تلقائيًا ملكية مسجّلة في السجل العقاري</li>
          <li>لا يضمن السيولة الفورية</li>
        </ul>

        <h2>لماذا الترميز عبر كابي مكس RT</h2>
        <p>
          تطبّق كابي مكس RT الترميز حصرًا ضمن:
        </p>
        <ul>
          <li>شركات ذات غرض خاص (SPV) مؤسسة قانونيًا</li>
          <li>حقوق تعاقدية محددة بوضوح</li>
          <li>توثيق وإفصاحات كاملة</li>
          <li>امتثال وحوكمة منظّمين</li>
        </ul>

        <div className="info-warning">
          لا يلغي الترميز مخاطر التملّك. ينطوي كل تملّك عقاري على مخاطر، بما في ذلك احتمال خسارة رأس المال. يُرجى مراجعة إفصاحات المخاطر لدينا قبل الشراء.
        </div>

        <h2>اعرف المزيد</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            ما هي الشركة ذات الغرض الخاص (SPV)
          </button>
          <button className="link-button" onClick={() => navigateToPage('/how-it-works')}>
            كيف تعمل المنصة
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            إفصاحات المخاطر
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          This section provides an educational explanation of real estate tokenization in plain, non-technical language for general users.
        </p>

        <h2>Definition</h2>
        <p>
          Real estate tokenization is a method of digitally representing economic participation rights in a real estate asset through structured ownership units, allowing multiple owners to participate in a single asset without direct ownership of the physical property.
        </p>

        <h2>What Tokenization Enables</h2>
        <ul className="check-list">
          <li>Fractional ownership access</li>
          <li>Lower capital entry thresholds</li>
          <li>Broader owner participation</li>
          <li>Improved transparency and record-keeping</li>
          <li>Organized secondary market trading</li>
        </ul>

        <h2>What Tokenization Does NOT Mean</h2>
        <ul className="cross-list">
          <li>It does not guarantee profits or income</li>
          <li>It does not eliminate ownership risk</li>
          <li>It does not automatically confer land registry ownership</li>
          <li>It does not ensure immediate liquidity</li>
        </ul>

        <h2>Why Tokenization via Capimax RT</h2>
        <p>
          Capimax RT applies tokenization only within:
        </p>
        <ul>
          <li>Legally established SPVs</li>
          <li>Clearly defined contractual rights</li>
          <li>Full documentation and disclosures</li>
          <li>Structured compliance and governance</li>
        </ul>

        <div className="info-warning">
          Tokenization does not eliminate ownership risks. All real estate ownership involves risk, including the potential loss of principal. Please review our Risk Disclosures before buying.
        </div>

        <h2>Learn More</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/spv')}>
            What is SPV
          </button>
          <button className="link-button" onClick={() => navigateToPage('/how-it-works')}>
            How It Works
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            Risk Disclosures
          </button>
        </div>
      </section>
      )}
    </InfoPageLayout>
  );
};
