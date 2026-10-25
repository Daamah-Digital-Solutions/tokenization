import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoPageLayout } from '../components/info/InfoPageLayout';

export const SecondaryMarketPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigateToPage = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <InfoPageLayout
      title={isAr ? 'السوق الثانوية وخيارات التخارج' : 'Secondary Market & Exit Options'}
      subtitle={isAr ? 'فهم آليات التخارج بشفافية ودون ضمانات مضلّلة' : 'Understanding exit mechanisms transparently and without misleading assurances'}
    >
      {isAr ? (
      <section className="info-section">
        <p className="info-intro">
          يشرح هذا القسم آليات التخارج بشفافية ودون ضمانات مضلّلة.
        </p>

        <h2>السوق الثانوية</h2>
        <p>
          تتيح السوق الثانوية للملاك:
        </p>
        <ul>
          <li>عرض وحداتهم للبيع</li>
          <li>شراء وحدات من ملاك آخرين</li>
          <li>التداول بناءً على العرض والطلب</li>
        </ul>

        <h2>المبادئ الأساسية</h2>
        <ul className="cross-list">
          <li>السيولة غير مضمونة</li>
          <li>قد تتقلب الأسعار</li>
          <li>تخضع عمليات التداول لفحوصات الامتثال</li>
        </ul>

        <h2>مزوّد السيولة (اختياري)</h2>
        <p>
          خيار إضافي للتخارج يعمل وفق شروط محددة:
        </p>
        <ul>
          <li>خيار إضافي للتخارج</li>
          <li>يعمل ضمن حدود وقواعد تسعير محددة</li>
          <li>قد ينطوي على خصومات أو فروق أسعار</li>
          <li>لا يُعدّ استردادًا مضمونًا</li>
        </ul>

        <div className="info-warning">
          <strong>مهم:</strong> لا تضمن السوق الثانوية السيولة. وتعتمد القدرة على بيع الوحدات على طلب السوق والتسعير ومتطلبات الامتثال. ويعمل مزوّدو السيولة، إن وُجدوا، وفق شروطهم وأحكامهم الخاصة ولا يضمنون التخارج.
        </div>

        <h2>فهم الفرق</h2>
        <div className="info-highlight">
          <p><strong>السوق الثانوية:</strong> تداول بين الملاك مباشرةً بناءً على العرض والطلب.</p>
          <p><strong>مزوّد السيولة:</strong> طرف ثالث اختياري يوفّر سيولة مشروطة وفق شروط محددة مسبقًا.</p>
        </div>

        <h2>صفحات ذات صلة</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/marketplace')}>
            الانتقال إلى السوق
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            دليل الشريك المالك
          </button>
          <button className="link-button-outline" onClick={() => navigateToPage('/risks')}>
            إفصاحات المخاطر
          </button>
        </div>
      </section>
      ) : (
      <section className="info-section">
        <p className="info-intro">
          This section explains exit mechanisms transparently and without misleading assurances.
        </p>

        <h2>Secondary Market</h2>
        <p>
          The secondary market allows owners to:
        </p>
        <ul>
          <li>List their units for sale</li>
          <li>Purchase units from other owners</li>
          <li>Trade based on supply and demand</li>
        </ul>

        <h2>Key Principles</h2>
        <ul className="cross-list">
          <li>Liquidity is not guaranteed</li>
          <li>Prices may fluctuate</li>
          <li>Trades are subject to compliance checks</li>
        </ul>

        <h2>Liquidity Provider (Optional)</h2>
        <p>
          An additional exit option that operates under specific terms:
        </p>
        <ul>
          <li>An additional exit option</li>
          <li>Operates under defined limits and pricing rules</li>
          <li>May involve discounts or spreads</li>
          <li>Does not constitute a guaranteed redemption</li>
        </ul>

        <div className="info-warning">
          <strong>Important:</strong> The secondary market does not guarantee liquidity. The ability to sell units depends on market demand, pricing, and compliance requirements. Liquidity providers, if available, operate under their own terms and conditions and do not guarantee exits.
        </div>

        <h2>Understanding the Difference</h2>
        <div className="info-highlight">
          <p><strong>Secondary Market:</strong> Owner-to-owner trading based on supply and demand.</p>
          <p><strong>Liquidity Provider:</strong> An optional third party offering conditional liquidity under predefined terms.</p>
        </div>

        <h2>Related Pages</h2>
        <div>
          <button className="link-button" onClick={() => navigateToPage('/marketplace')}>
            Go to Marketplace
          </button>
          <button className="link-button" onClick={() => navigateToPage('/investor-guide')}>
            Co-Owner Guide
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
