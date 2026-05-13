'use client';

import { useTranslations } from 'next-intl';
import type { ValueStreamBudgetResponse } from '@marketlum/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface Props {
  budget: ValueStreamBudgetResponse;
}

type Period = 'monthly' | 'quarterly' | 'annual';

function formatFigure(value: string | null, currency: string): string {
  if (value === null) return '—';
  return `${value} ${currency}`;
}

function netClass(value: string | null): string {
  if (value === null) return '';
  const n = Number(value);
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-red-600';
  return '';
}

export function BudgetSummaryCards({ budget }: Props) {
  const t = useTranslations('valueStreamBudget');
  const currency = budget.baseValue?.name ?? '';

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
                {formatFigure(budget.summary.revenue[period], currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{t('expense')}</span>
              <span className="text-red-600 font-medium tabular-nums">
                {budget.summary.expense[period] === null
                  ? '—'
                  : `−${budget.summary.expense[period]} ${currency}`}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t pt-1.5">
              <span className="text-xs font-semibold">{t('net')}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  netClass(budget.summary.net[period]),
                )}
              >
                {formatFigure(budget.summary.net[period], currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
