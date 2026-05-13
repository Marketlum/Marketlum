'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';

export function ValueStreamLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() ?? '';
  const t = useTranslations('valueStreamBudget');

  const overviewHref = `/admin/value-streams/${params.id}`;
  const budgetHref = `/admin/value-streams/${params.id}/budget`;

  const onBudget = pathname.endsWith('/budget');

  return (
    <div className="space-y-4">
      <nav
        role="tablist"
        className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        <Link
          href={overviewHref}
          role="tab"
          aria-selected={!onBudget}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
            !onBudget && 'bg-background text-foreground shadow-sm',
          )}
        >
          {t('tabOverview')}
        </Link>
        <Link
          href={budgetHref}
          role="tab"
          aria-selected={onBudget}
          className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
            onBudget && 'bg-background text-foreground shadow-sm',
          )}
        >
          {t('tabBudget')}
        </Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
