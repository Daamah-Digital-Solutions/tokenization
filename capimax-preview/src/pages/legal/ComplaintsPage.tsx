import React from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from '../../components/legal/LegalPageLayout';

export const ComplaintsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const isFr = i18n.language?.startsWith('fr');
  return (
    <LegalPageLayout
      title={isAr ? 'سياسة الشكاوى وتسوية النزاعات' : isFr ? 'Politique de traitement des réclamations et de règlement des litiges' : 'Complaints & Dispute Resolution Policy'}
      lastUpdated={isAr ? 'يناير 2026' : isFr ? 'janvier 2026' : 'January 2026'}
    >
      {isAr ? (
      <section className="legal-section">
        <h2>معالجة الشكاوى</h2>
        <p>
          يجوز للمستخدمين تقديم الشكاوى من خلال قنوات الدعم المخصصة.
        </p>

        <h2>إجراءات المعالجة</h2>
        <ul>
          <li>الإقرار باستلام الشكوى؛</li>
          <li>التحقيق الداخلي؛</li>
          <li>الرد كتابيًا خلال إطار زمني معقول.</li>
        </ul>

        <h2>تسوية النزاعات</h2>
        <p>يجوز تسوية النزاعات من خلال:</p>
        <ul>
          <li>التفاوض؛</li>
          <li>الوساطة؛</li>
          <li>التحكيم أو المحاكم، وفقًا لما هو محدد في الشروط.</li>
        </ul>
      </section>
      ) : isFr ? (
      <section className="legal-section">
        <h2>Traitement des réclamations</h2>
        <p>
          Les utilisateurs peuvent soumettre leurs réclamations par l'intermédiaire des canaux d'assistance prévus à cet effet.
        </p>

        <h2>Procédure de traitement</h2>
        <ul>
          <li>Accusé de réception ;</li>
          <li>Enquête interne ;</li>
          <li>Réponse écrite dans un délai raisonnable.</li>
        </ul>

        <h2>Règlement des litiges</h2>
        <p>Les litiges peuvent être réglés par voie :</p>
        <ul>
          <li>De négociation ;</li>
          <li>De médiation ;</li>
          <li>D'arbitrage ou judiciaire, selon ce que prévoient les Conditions.</li>
        </ul>
      </section>
      ) : (
      <section className="legal-section">
        <h2>Complaints Handling</h2>
        <p>
          Users may submit complaints through designated support channels.
        </p>

        <h2>Resolution Process</h2>
        <ul>
          <li>Acknowledgment of receipt;</li>
          <li>Internal investigation;</li>
          <li>Written response within a reasonable timeframe.</li>
        </ul>

        <h2>Dispute Resolution</h2>
        <p>Disputes may be resolved through:</p>
        <ul>
          <li>Negotiation;</li>
          <li>Mediation;</li>
          <li>Arbitration or courts, as specified in the Terms.</li>
        </ul>
      </section>
      )}
    </LegalPageLayout>
  );
};
