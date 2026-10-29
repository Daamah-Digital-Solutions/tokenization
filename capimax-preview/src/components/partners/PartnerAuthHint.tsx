import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../../utils/router';

/**
 * Under the sign-in / register forms (client round 4 follow-up): the way to
 * the broker and liquidity-provider programmes for people who come to join.
 */
export const PartnerAuthHint: React.FC = () => {
  const { t } = useTranslation('partners');
  const { navigate } = useRouter();
  const link = 'font-semibold text-emerald-600 dark:text-emerald-400 hover:underline';

  return (
    <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
      {t('join.authHint')}{' '}
      <button type="button" onClick={() => navigate('broker-program')} className={link}>
        {t('join.authHintBroker')}
      </button>
      {' · '}
      <button type="button" onClick={() => navigate('liquidity-provider')} className={link}>
        {t('join.authHintLp')}
      </button>
    </p>
  );
};

export default PartnerAuthHint;
