'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { cellClass, fmt } from '../../lib/figures';
import type { FinancialsView } from './financials-view';

interface Props {
  financials: FinancialsView;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function FinancialsBreakdownTable({ financials }: Props) {
  const t = useTranslations('financials');
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
                    {financials.byMonth.map((m, i) => (
                      <TableHead key={m.month} className="text-right">
                        {MONTH_LABELS[i]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-emerald-600">{t('revenue')}</TableCell>
                    {financials.byMonth.map((m) => (
                      <TableCell key={m.month} className={cn('text-right tabular-nums', cellClass(m.revenue))}>
                        {fmt(m.revenue)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-red-600">{t('expense')}</TableCell>
                    {financials.byMonth.map((m) => (
                      <TableCell key={m.month} className={cn('text-right tabular-nums text-red-600')}>
                        {m.expense === null ? '—' : `−${m.expense}`}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">{t('net')}</TableCell>
                    {financials.byMonth.map((m) => (
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
                  {financials.byQuarter.map((q) => (
                    <TableHead key={q.quarter} className="text-right">
                      {q.quarter.replace(`${financials.year}-`, '')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-emerald-600">{t('revenue')}</TableCell>
                  {financials.byQuarter.map((q) => (
                    <TableCell key={q.quarter} className={cn('text-right tabular-nums', cellClass(q.revenue))}>
                      {fmt(q.revenue)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-red-600">{t('expense')}</TableCell>
                  {financials.byQuarter.map((q) => (
                    <TableCell key={q.quarter} className="text-right tabular-nums text-red-600">
                      {q.expense === null ? '—' : `−${q.expense}`}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">{t('net')}</TableCell>
                  {financials.byQuarter.map((q) => (
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
