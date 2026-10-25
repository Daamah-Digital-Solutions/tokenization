import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const DisclaimerPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <LegalPageLayout
      title={isAr ? 'إخلاء مسؤولية المنصة' : 'Platform Disclaimer'}
      lastUpdated={isAr ? 'يناير 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <p className="legal-intro">
          كابي مكس RT منصة قائمة على التقنية، صُمّمت لتسهيل هيكلة فرص التملّك العقاري المرمّز وعرضها وإدارتها من خلال الشركات ذات الغرض الخاص (SPV).
        </p>

        <h2>لا تقوم كابي مكس RT بما يلي:</h2>
        <ul>
          <li>العمل بصفة بنك أو وسيط/متداول في الأوراق المالية أو مستشار مالي أو أمين (وكيل ائتماني) أو جهة حفظ؛</li>
          <li>تقديم أي مشورة مالية أو قانونية أو ضريبية أو استثمارية؛</li>
          <li>ضمان العوائد أو السيولة أو الحفاظ على رأس المال.</li>
        </ul>

        <p>
          تُقدَّم جميع المعلومات المتاحة على المنصة لأغراض إعلامية فقط، وتستند إلى بيانات مقدّمة من مالكي الأصول والمطوّرين والشركات ذات الغرض الخاص (SPV) ومزوّدي الخدمات من الأطراف الثالثة. ورغم بذل جهود معقولة لضمان دقة هذه المعلومات واكتمالها وحداثتها، لا تقدّم كابي مكس RT أي إقرارات أو ضمانات من أي نوع، صريحة كانت أو ضمنية، بشأن موثوقية هذه المعلومات أو دقتها.
        </p>

        <h2>يتحمّل الملاك وحدهم مسؤولية:</h2>
        <ul>
          <li>إجراء العناية الواجبة المستقلة الخاصة بهم؛</li>
          <li>استشارة مستشارين مهنيين مرخّصين؛</li>
          <li>تقييم مدى الملاءمة والمخاطر والآثار القانونية.</li>
        </ul>

        <p className="legal-emphasis">
          يُعدّ استخدام المنصة قبولًا لإخلاء المسؤولية هذا ولجميع المستندات القانونية المرتبطة به.
        </p>
      </section>
      ) : (
      <section className="legal-section">
        <p className="legal-intro">
          Capimax RT is a technology-based platform designed to facilitate the structuring, presentation, and administration of tokenized real estate ownership opportunities through Special Purpose Vehicles (SPVs).
        </p>

        <h2>Capimax RT does not:</h2>
        <ul>
          <li>Act as a bank, broker-dealer, financial adviser, fiduciary, or custodian;</li>
          <li>Provide financial, legal, tax, or investment advice;</li>
          <li>Guarantee returns, liquidity, or capital preservation.</li>
        </ul>

        <p>
          All information made available on the platform is provided for informational purposes only and is based on data supplied by asset owners, developers, SPVs, and third-party service providers. While reasonable efforts are made to ensure accuracy, completeness, and timeliness, Capimax RT makes no representations or warranties of any kind, express or implied, regarding the reliability or accuracy of such information.
        </p>

        <h2>Owners are solely responsible for:</h2>
        <ul>
          <li>Conducting their own independent due diligence;</li>
          <li>Consulting licensed professional advisers;</li>
          <li>Assessing suitability, risks, and legal implications.</li>
        </ul>

        <p className="legal-emphasis">
          Use of the platform constitutes acceptance of this Disclaimer and all associated legal documents.
        </p>
      </section>
      )}
    </LegalPageLayout>
  );
};
