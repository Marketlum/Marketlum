'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RecurringFlowProjection } from '@marketlum/shared';
import { RecurringFlowDirection } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface RecurringFlowsProjectionProps {
  valueStreamId: string;
}

export function RecurringFlowsProjection({ valueStreamId }: RecurringFlowsProjectionProps) {
  const t = useTranslations('recurringFlows');
  const [projection, setProjection] = useState<RecurringFlowProjection | null>(null);
  const [horizon, setHorizon] = useState('12');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<RecurringFlowProjection>(
        `/value-streams/${valueStreamId}/recurring-flows/projection?monthsAhead=${horizon}`,
      )
      .then((data) => {
        if (!cancelled) setProjection(data);
      })
      .catch(() => {
        if (!cancelled) setProjection(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [valueStreamId, horizon]);

  if (loading || !projection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('projectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t('loading')}</CardContent>
      </Card>
    );
  }

  // Discover all units that appear across months
  const unitSet = new Set<string>();
  for (const month of projection.months) {
    for (const dir of month.byDirection) {
      for (const tot of dir.totals) unitSet.add(tot.unit);
    }
  }
  const units = Array.from(unitSet).sort((a, b) => a.localeCompare(b));

  function totalFor(
    monthIdx: number,
    direction: RecurringFlowDirection,
    unit: string,
  ): number {
    const dir = projection!.months[monthIdx].byDirection.find((d) => d.direction === direction);
    const entry = dir?.totals.find((tot) => tot.unit === unit);
    return entry ? Number(entry.amount) : 0;
  }

  function netFor(monthIdx: number, unit: string): number {
    return (
      totalFor(monthIdx, RecurringFlowDirection.INBOUND, unit) -
      totalFor(monthIdx, RecurringFlowDirection.OUTBOUND, unit)
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t('projectionTitle')}</CardTitle>
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 {t('months')}</SelectItem>
            <SelectItem value="6">6 {t('months')}</SelectItem>
            <SelectItem value="12">12 {t('months')}</SelectItem>
            <SelectItem value="24">24 {t('months')}</SelectItem>
            <SelectItem value="36">36 {t('months')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noProjectionData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2">{t('month')}</th>
                  {units.map((unit) => (
                    <th key={`in-${unit}`} className="py-2 text-right text-emerald-600">
                      {t('revIn')} {unit}
                    </th>
                  ))}
                  {units.map((unit) => (
                    <th key={`out-${unit}`} className="py-2 text-right text-red-600">
                      {t('expIn')} {unit}
                    </th>
                  ))}
                  {units.map((unit) => (
                    <th key={`net-${unit}`} className="py-2 text-right font-semibold">
                      {t('netIn')} {unit}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projection.months.map((month, idx) => (
                  <tr key={month.month} className="border-b">
                    <td className="py-1.5">{month.month}</td>
                    {units.map((unit) => (
                      <td key={`m-in-${unit}`} className="py-1.5 text-right">
                        {totalFor(idx, RecurringFlowDirection.INBOUND, unit).toFixed(2)}
                      </td>
                    ))}
                    {units.map((unit) => (
                      <td key={`m-out-${unit}`} className="py-1.5 text-right">
                        {totalFor(idx, RecurringFlowDirection.OUTBOUND, unit).toFixed(2)}
                      </td>
                    ))}
                    {units.map((unit) => {
                      const net = netFor(idx, unit);
                      const cls =
                        net > 0
                          ? 'text-emerald-600'
                          : net < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground';
                      return (
                        <td
                          key={`m-net-${unit}`}
                          className={`py-1.5 text-right font-medium ${cls}`}
                        >
                          {net.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
