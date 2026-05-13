'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RecurringFlowRollup } from '@marketlum/shared';
import { RecurringFlowDirection } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface RecurringFlowsSummaryCardProps {
  valueStreamId: string;
}

function formatTotal(monthly: string, unit: string): string {
  return `${Number(monthly).toFixed(2)} ${unit}`;
}

export function RecurringFlowsSummaryCard({ valueStreamId }: RecurringFlowsSummaryCardProps) {
  const t = useTranslations('recurringFlows');
  const [rollup, setRollup] = useState<RecurringFlowRollup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<RecurringFlowRollup>(`/value-streams/${valueStreamId}/recurring-flows/rollup`)
      .then((data) => {
        if (!cancelled) setRollup(data);
      })
      .catch(() => {
        if (!cancelled) setRollup(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [valueStreamId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('summaryTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t('loading')}</CardContent>
      </Card>
    );
  }

  if (!rollup) return null;

  const inbound = rollup.byDirection.find((d) => d.direction === RecurringFlowDirection.INBOUND);
  const outbound = rollup.byDirection.find((d) => d.direction === RecurringFlowDirection.OUTBOUND);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('summaryTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <h3 className="text-xs font-semibold text-emerald-600">{t('summaryRevenues')}</h3>
            {inbound && inbound.totals.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-sm">
                {inbound.totals.map((tot) => (
                  <li key={tot.unit}>{formatTotal(tot.monthly, tot.unit)} {t('perMonthSuffix')}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-red-600">{t('summaryExpenses')}</h3>
            {outbound && outbound.totals.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-sm">
                {outbound.totals.map((tot) => (
                  <li key={tot.unit}>{formatTotal(tot.monthly, tot.unit)} {t('perMonthSuffix')}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">{t('summaryNet')}</h3>
            {rollup.net.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-sm">
                {rollup.net.map((tot) => (
                  <li key={tot.unit}>{formatTotal(tot.monthly, tot.unit)} {t('perMonthSuffix')}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">{t('summaryActiveCount')}</h3>
            <p className="mt-1 text-2xl font-bold">{rollup.activeFlowCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
