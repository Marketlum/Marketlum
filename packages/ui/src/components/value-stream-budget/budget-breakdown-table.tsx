'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ValueStreamBudgetResponse } from '@marketlum/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../../lib/utils';

interface Props {
  budget: ValueStreamBudgetResponse;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function cellClass(value: string | null): string {
  if (value === null) return 'text-muted-foreground';
  const n = Number(value);
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-red-600';
  return '';
}

function fmt(value: string | null): string {
  return value ?? '—';
}

export function BudgetBreakdownTable({ budget }: Props) {
  const t = useTranslations('valueStreamBudget');
  const [view, setView] = useState<'months' | 'quarters'>('months');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t('breakdown')}</CardTitle>
        <Tabs value={view} onValueChange={(v) => setView(v as 'months' | 'quarters')}>
          <TabsList>
            <TabsTrigger value="months">{t('viewMonths')}</TabsTrigger>
            <TabsTrigger value="quarters">{t('viewQuarters')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <Tabs value={view} className="w-full">
          <TabsContent value="months">
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24"> </TableHead>
                    {budget.byMonth.map((m, i) => (
                      <TableHead key={m.month} className="text-right">
                        {MONTH_LABELS[i]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-emerald-600">{t('revenue')}</TableCell>
                    {budget.byMonth.map((m) => (
                      <TableCell key={m.month} className={cn('text-right tabular-nums', cellClass(m.revenue))}>
                        {fmt(m.revenue)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-red-600">{t('expense')}</TableCell>
                    {budget.byMonth.map((m) => (
                      <TableCell key={m.month} className={cn('text-right tabular-nums text-red-600')}>
                        {m.expense === null ? '—' : `−${m.expense}`}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">{t('net')}</TableCell>
                    {budget.byMonth.map((m) => (
                      <TableCell key={m.month} className={cn('text-right tabular-nums font-semibold', cellClass(m.net))}>
                        {fmt(m.net)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="quarters">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32"> </TableHead>
                  {budget.byQuarter.map((q) => (
                    <TableHead key={q.quarter} className="text-right">
                      {q.quarter.replace(`${budget.year}-`, '')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-emerald-600">{t('revenue')}</TableCell>
                  {budget.byQuarter.map((q) => (
                    <TableCell key={q.quarter} className={cn('text-right tabular-nums', cellClass(q.revenue))}>
                      {fmt(q.revenue)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-red-600">{t('expense')}</TableCell>
                  {budget.byQuarter.map((q) => (
                    <TableCell key={q.quarter} className="text-right tabular-nums text-red-600">
                      {q.expense === null ? '—' : `−${q.expense}`}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">{t('net')}</TableCell>
                  {budget.byQuarter.map((q) => (
                    <TableCell key={q.quarter} className={cn('text-right tabular-nums font-semibold', cellClass(q.net))}>
                      {fmt(q.net)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
