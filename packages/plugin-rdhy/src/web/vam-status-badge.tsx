'use client';

import { useTranslations } from 'next-intl';
import type { RdhyVamStatus } from '../shared/vam-schemas';

const STYLES: Record<RdhyVamStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  COMPLETED: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  TERMINATED: 'bg-destructive/15 text-destructive',
};

export function VamStatusBadge({ status }: { status: RdhyVamStatus }) {
  const t = useTranslations('plugin.rdhy.vam.status');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {t(status)}
    </span>
  );
}
