'use client';

import { useTranslations } from 'next-intl';
import type { RdhyVamMilestoneStatus } from '../shared/vam-performance';

const STYLES: Record<RdhyVamMilestoneStatus, string> = {
  ACHIEVED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  MISSED: 'bg-destructive/15 text-destructive',
  ON_TRACK: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  BEHIND: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  UPCOMING: 'bg-muted text-muted-foreground',
};

export function VamMilestoneStatusBadge({ status }: { status: RdhyVamMilestoneStatus }) {
  const t = useTranslations('plugin.rdhy.vam.performance.statuses');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {t(status)}
    </span>
  );
}
