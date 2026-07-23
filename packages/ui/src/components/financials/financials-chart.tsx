'use client';

import type { DashboardTimeSeriesPoint } from '@marketlum/shared';
import { RevenueExpensesChart } from '../dashboard/revenue-expenses-chart';
import { MONTH_LABELS } from '../../lib/figures';
import type { FinancialsView } from './financials-view';

interface Props {
  financials: FinancialsView;
}

/** Monthly revenue/expenses bar chart for the financials tabs, reusing the
 * dashboard chart. Null amounts (no reporting currency) render as zero. */
export function FinancialsChart({ financials }: Props) {
  const data: DashboardTimeSeriesPoint[] = financials.byMonth.map((m, i) => ({
    period: MONTH_LABELS[i],
    revenue: m.revenue ?? '0',
    expenses: m.expense ?? '0',
  }));

  return <RevenueExpensesChart data={data} />;
}
