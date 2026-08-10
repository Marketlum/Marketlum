'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ActivityDataTable } from '../../components/audit/activity-data-table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';

export function ActivityPage() {
  const t = useTranslations();

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{t('common.home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('audit.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight md:text-3xl">
        {t('audit.title')}
      </h1>
      <p className="mb-4 md:mb-6 text-sm text-muted-foreground">{t('audit.description')}</p>
      {/* useSearchParams (deep-linkable filters) requires a Suspense boundary. */}
      <Suspense>
        <ActivityDataTable />
      </Suspense>
    </div>
  );
}
