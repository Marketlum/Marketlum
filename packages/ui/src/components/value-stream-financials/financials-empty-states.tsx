'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { FinancialsView } from './financials-view';

export interface FinancialsBannerContent {
  title: string;
  body: string;
  action?: React.ReactNode;
}

interface Props {
  financials: FinancialsView;
  /** Shown when no reporting currency is configured (`currencyName === null`). */
  missingCurrency: FinancialsBannerContent;
  /** Shown when no invoices exist in the period. */
  noInvoices: FinancialsBannerContent;
  /** Shown when notConvertedCount > 0; the caller interpolates the count. */
  notConverted: FinancialsBannerContent;
}

function Banner({
  content,
  tone,
  icon,
}: {
  content: FinancialsBannerContent;
  tone: 'amber' | 'sky';
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950'
      : 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950';
  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 text-sm ${toneClass}`}>
      {icon}
      <div className="flex-1">
        <p className="font-medium">{content.title}</p>
        <p className="text-muted-foreground">{content.body}</p>
      </div>
      {content.action}
    </div>
  );
}

export function FinancialsEmptyStates({ financials, missingCurrency, noInvoices, notConverted }: Props) {
  const banners: React.ReactNode[] = [];

  if (financials.currencyName === null) {
    banners.push(
      <Banner
        key="no-currency"
        content={missingCurrency}
        tone="amber"
        icon={<Info className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />}
      />,
    );
  }

  if (financials.invoiceCount === 0) {
    banners.push(
      <Banner
        key="no-invoices"
        content={noInvoices}
        tone="sky"
        icon={<Info className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />}
      />,
    );
  }

  if (financials.notConvertedCount > 0) {
    banners.push(
      <Banner
        key="not-converted"
        content={notConverted}
        tone="amber"
        icon={<AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />}
      />,
    );
  }

  if (banners.length === 0) return null;
  return <div className="space-y-2">{banners}</div>;
}
