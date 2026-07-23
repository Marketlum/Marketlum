'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  api,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@marketlum/ui';
import type { RdhyVamPerformanceResponse } from '../shared/vam-performance';
import { VamMilestoneStatusBadge } from './vam-milestone-status-badge';
import { VamPerformanceChart } from './vam-performance-chart';

function formatAmount(amount: string, currencyCode: string | null): string {
  const value = Number(amount);
  const formatted = Number.isFinite(value) ? value.toLocaleString('en-US') : amount;
  return currencyCode ? `${formatted} ${currencyCode.toUpperCase()}` : formatted;
}

/** Attainment is uncapped in the API; the display caps at 999% (Q7). */
function formatAttainment(pct: number): string {
  return pct > 999 ? '999%+' : `${Math.round(pct)}%`;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

/** The spec-018 plan-vs-actual view, rendered on the VAM agreement detail
 * page for non-DRAFT agreements. */
export function VamPerformanceSection({ agreementId }: { agreementId: string }) {
  const t = useTranslations('plugin.rdhy.vam.performance');
  const [data, setData] = useState<RdhyVamPerformanceResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    api
      .get<RdhyVamPerformanceResponse>(`/plugins/rdhy/vam-agreements/${agreementId}/performance`)
      .then(setData)
      .catch(() => setFailed(true));
  }, [agreementId]);

  const comparable = data?.comparability === 'COMPARABLE';
  const targetCurrency = data?.currency?.code ?? null;
  const actualCurrency = data?.agentFunctionalCurrency?.code ?? null;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{t('title')}</h2>
      {failed ? (
        <p className="text-sm text-destructive">{t('failed')}</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : (
        <div className="space-y-4">
          {!comparable && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {t(`comparabilityBanner.${data.comparability}`)}
              {data.comparability === 'CURRENCY_MISMATCH' && actualCurrency && (
                <span className="text-muted-foreground">
                  {' '}
                  {t('actualsInCurrency', { currency: actualCurrency.toUpperCase() })}
                </span>
              )}
            </div>
          )}

          {comparable && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t('targetToDate')}
                value={
                  data.summary.targetToDate !== null
                    ? formatAmount(data.summary.targetToDate, targetCurrency)
                    : '—'
                }
              />
              <StatCard
                label={t('actualToDate')}
                value={
                  data.summary.actualToDate !== null
                    ? formatAmount(data.summary.actualToDate, targetCurrency)
                    : '—'
                }
              />
              <StatCard
                label={t('attainment')}
                value={
                  data.summary.attainmentPct !== null
                    ? formatAttainment(data.summary.attainmentPct)
                    : '—'
                }
              />
              <StatCard
                label={t('overallStatus')}
                value={
                  data.summary.overallStatus ? (
                    <VamMilestoneStatusBadge status={data.summary.overallStatus} />
                  ) : (
                    '—'
                  )
                }
              />
            </div>
          )}

          {data.notConvertedCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('excludedInvoices', { count: data.notConvertedCount })}
            </p>
          )}

          {data.monthlyActuals !== null && (
            <VamPerformanceChart
              milestones={data.milestones}
              monthlyActuals={data.monthlyActuals}
              windowStart={data.windowStart}
              windowEnd={data.windowEnd}
              showPlan={comparable}
            />
          )}

          {data.milestones.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('milestone')}</TableHead>
                    <TableHead>{t('dueDate')}</TableHead>
                    <TableHead className="text-right">{t('target')}</TableHead>
                    {comparable && (
                      <>
                        <TableHead className="text-right">{t('actual')}</TableHead>
                        <TableHead className="w-44">{t('progress')}</TableHead>
                        <TableHead>{t('statusCol')}</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="align-top">
                        <p className="font-medium">
                          {milestone.label ?? `M${milestone.offsetMonths}`}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {milestone.items.map((item) => (
                            <li
                              key={item.id}
                              className={`text-xs ${
                                item.measured ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {item.description}
                              {item.measured && item.amount != null ? (
                                <span className="ml-1 font-mono">
                                  {formatAmount(item.amount, null)}
                                </span>
                              ) : (
                                <span className="ml-1">({t('unmeasured')})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-sm">
                        {new Date(milestone.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-right font-mono text-sm">
                        {formatAmount(milestone.targetCumulative, targetCurrency)}
                      </TableCell>
                      {comparable && (
                        <>
                          <TableCell className="align-top whitespace-nowrap text-right font-mono text-sm">
                            {milestone.actualCumulative !== null
                              ? formatAmount(milestone.actualCumulative, targetCurrency)
                              : '—'}
                          </TableCell>
                          <TableCell className="align-top">
                            {milestone.attainmentPct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{
                                      width: `${Math.min(100, milestone.attainmentPct)}%`,
                                    }}
                                  />
                                </div>
                                <span className="whitespace-nowrap font-mono text-xs">
                                  {formatAttainment(milestone.attainmentPct)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {milestone.status ? (
                              <VamMilestoneStatusBadge status={milestone.status} />
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
