import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../../utils/router';
import { QuickActions, type QuickAction } from './QuickActions';

/**
 * Quick links for a broker or liquidity provider to the shares they own
 * (an LP buys shares from investors): My Properties, certificates, reports and
 * the secondary market open inside their own dashboard (DashboardPage routes
 * these views to the investor panel for both roles).
 */
export const HoldingShortcuts: React.FC<{ columns?: number; myPropertiesView?: string }> = ({
  columns = 4,
  myPropertiesView = 'my-properties', // the LP has its own "My assets" view
}) => {
  const { t } = useTranslation('partners');
  const { navigate } = useRouter();
  const open = (view: string) => () => navigate('dashboard', { view });
  const actions: QuickAction[] = [
    { id: 'my-properties', label: t('holdings.myProperties'), icon: '🏠', description: t('holdings.myPropertiesDesc'), variant: 'primary', onClick: open(myPropertiesView) },
    { id: 'certificates', label: t('holdings.certificates'), icon: '🏅', description: t('holdings.certificatesDesc'), onClick: open('certificates') },
    { id: 'reports', label: t('holdings.reports'), icon: '📊', description: t('holdings.reportsDesc'), onClick: open('reports') },
    { id: 'marketplace', label: t('holdings.market'), icon: '🏪', description: t('holdings.marketDesc'), onClick: open('marketplace') },
  ];
  return <QuickActions actions={actions} title={t('holdings.title')} columns={columns} />;
};

export default HoldingShortcuts;
