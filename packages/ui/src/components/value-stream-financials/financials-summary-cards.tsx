'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { formatFigure, netClass } from '../../lib/figures';
import type { FinancialsView } from './financials-view';

interface Props {
  financials: FinancialsView;
}

type Period = 'monthly' | 'quarterly' | 'annual';

export function FinancialsSummaryCards({ financials }: Props) {
  const t = useTranslations('valueStreamFinancials');
  const currency = financials.currencyName ?? '';

  const periods: Period[] = ['monthly', 'quarterly', 'annual'];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {periods.map((period) => (
        <Card key={period}>
          <CardHeader>
            <CardTitle className="text-base">{t(period)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{t('revenue')}</span>
              <span className="text-emerald-600 font-medium tabular-nums">
                {formatFigure(financials.summary.revenue[period], currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{t('expense')}</span>
              <span className="text-red-600 font-medium tabular-nums">
                {financials.summary.expense[period] === null
                  ? '—'
                  : `−${financials.summary.expense[period]} ${currency}`}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t pt-1.5">
              <span className="text-xs font-semibold">{t('net')}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  netClass(financials.summary.net[period]),
                )}
              >
                {formatFigure(financials.summary.net[period], currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
