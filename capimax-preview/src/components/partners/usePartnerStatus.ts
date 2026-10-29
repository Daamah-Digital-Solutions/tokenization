import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRouter } from '../../utils/router';
import { PartnerKind, PartnerService } from '../../services/partners/PartnerService';

/** The signed-in account's status for one partner programme (null while signed out). */
export function usePartnerStatus(kind: PartnerKind) {
  const { state } = useAuth();
  const userId = state.user?.id;
  return useQuery({
    queryKey: ['partner-status', kind, userId],
    queryFn: () => PartnerService.status(kind),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/** Switch the account to its partner role and open that dashboard. */
export function useOpenPartnerDashboard() {
  const { state, refreshUser } = useAuth();
  const { navigate } = useRouter();
  const { error: showError } = useNotifications();
  const { t } = useTranslation('partners');

  return async (kind: PartnerKind) => {
    try {
      await PartnerService.activate(kind, state.user?.role);
      await refreshUser();
      navigate('dashboard', { view: 'overview' });
    } catch (err: any) {
      showError(t('join.gate.switchFailed'), err?.message || '');
    }
  };
}

export function formatDate(value: string | null | undefined, lang: string): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
}
