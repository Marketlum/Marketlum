'use client';

import Link from 'next/link';
import { AlertTriangle, Info, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ValueStreamFinancialsResponse } from '@marketlum/shared';
import { Button } from '../ui/button';

interface Props {
  financials: ValueStreamFinancialsResponse;
  valueStreamId: string;
}

export function FinancialsEmptyStates({ financials, valueStreamId }: Props) {
  const t = useTranslations('valueStreamFinancials');
  const banners: React.ReactNode[] = [];

  if (financials.presentationCurrency === null) {
    banners.push(
      <div
        key="no-base"
        className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950"
      >
        <Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{t('noBaseValueTitle')}</p>
          <p className="text-muted-foreground">{t('noBaseValueBody')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/exchange-rates">{t('noBaseValueAction')}</Link>
        </Button>
      </div>,
    );
  }

  if (financials.invoiceCount === 0) {
    banners.push(
      <div
        key="no-invoices"
        className="flex items-start gap-3 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-700 dark:bg-sky-950"
      >
        <Info className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{t('noInvoicesTitle')}</p>
          <p className="text-muted-foreground">{t('noInvoicesBody')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/value-streams/${valueStreamId}/invoices`}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('noInvoicesAction')}
          </Link>
        </Button>
      </div>,
    );
  }

  if (financials.notConvertedCount > 0) {
    banners.push(
      <div
        key="not-converted"
        className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950"
      >
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">
            {t('notConvertedTitle', { count: financials.notConvertedCount })}
          </p>
          <p className="text-muted-foreground">{t('notConvertedBody')}</p>
        </div>
      </div>,
    );
  }

  if (banners.length === 0) return null;
  return <div className="space-y-2">{banners}</div>;
}
