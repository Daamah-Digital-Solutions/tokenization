import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertTriangle, XCircle, Globe, MessageSquare, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useRouter } from '../../../utils/router';
import { OwnerMessagesService } from '../../../services/property-owner/OwnerMessagesService';

/**
 * Where a submitted property stands (client round 3, #23/#24): under review,
 * changes requested (with the requested changes + resubmit), approved and
 * waiting for publication, published, or not approved.
 */

interface Props {
  property: {
    id: string;
    status?: string;
    is_published?: boolean;
    approval_status?: string | null;
    required_changes?: string;
    unread_messages?: number;
  };
}

type Stage = 'published' | 'approved' | 'requires_changes' | 'rejected' | 'pending';

const stageOf = (p: Props['property']): Stage => {
  if (p.is_published) return 'published';
  if (p.approval_status === 'rejected' || p.status === 'delisted') return 'rejected';
  if (p.approval_status === 'requires_changes') return 'requires_changes';
  if (p.approval_status === 'approved') return 'approved';
  return 'pending';
};

const STYLE: Record<Stage, { icon: React.ComponentType<any>; badge: string }> = {
  published: { icon: Globe, badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  approved: { icon: CheckCircle2, badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  requires_changes: { icon: AlertTriangle, badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  rejected: { icon: XCircle, badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  pending: { icon: Clock, badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

export const OwnerSubmissionStatus: React.FC<Props> = ({ property }) => {
  const { t } = useTranslation('owner');
  const { navigate } = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const stage = stageOf(property);
  const Icon = STYLE[stage].icon;

  const resubmit = async () => {
    setBusy(true);
    try {
      await OwnerMessagesService.resubmit(property.id);
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ['properties', 'owner'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', STYLE[stage].badge)}>
          <Icon className="w-3.5 h-3.5" />
          {t(`status.${stage}`)}
        </span>
        <button
          type="button"
          onClick={() => navigate('dashboard', { view: 'messages' })}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {property.unread_messages ? t('status.unread', { count: property.unread_messages }) : t('status.openMessages')}
        </button>
      </div>
      <p className="text-xs text-neutral-600 dark:text-slate-400">{t(`status.descs.${stage}`)}</p>
      {stage === 'requires_changes' && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          {property.required_changes && (
            <>
              <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">{t('status.requiredChanges')}</p>
              <p className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-line">{property.required_changes}</p>
            </>
          )}
          {done ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">{t('status.resubmitted')}</p>
          ) : (
            <button
              type="button"
              onClick={resubmit}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {t('status.resubmit')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerSubmissionStatus;
