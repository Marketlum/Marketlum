'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Plus } from 'lucide-react';
import type {
  DashboardTimeSeriesPoint,
  ValueStreamFinancialsResponse,
  ValueStreamResponse,
} from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { YearSelector } from '../../components/value-stream-budget/year-selector';
import { FinancialsSummaryCards } from '../../components/value-stream-financials/financials-summary-cards';
import { FinancialsBreakdownTable } from '../../components/value-stream-financials/financials-breakdown-table';
import { FinancialsEmptyStates } from '../../components/value-stream-financials/financials-empty-states';
import type { FinancialsView } from '../../components/value-stream-financials/financials-view';
import { RevenueExpensesChart } from '../../components/dashboard/revenue-expenses-chart';

export function ValueStreamFinancialsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('valueStreamFinancials');
  const tc = useTranslations('common');
  const tvs = useTranslations('valueStreams');

  const initialYear = (() => {
    const raw = searchParams?.get('year');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : new Date().getUTCFullYear();
  })();
  const initialDirectOnly = searchParams?.get('directOnly') === 'true';

  const [year, setYear] = useState(initialYear);
  const [directOnly, setDirectOnly] = useState(initialDirectOnly);
  const [valueStream, setValueStream] = useState<ValueStreamResponse | null>(null);
  const [financials, setFinancials] = useState<ValueStreamFinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vs, fin] = await Promise.all([
        api.get<ValueStreamResponse>(`/value-streams/${params.id}`),
        api.get<ValueStreamFinancialsResponse>(
          `/value-streams/${params.id}/financials?year=${year}&directOnly=${directOnly}`,
        ),
      ]);
      setValueStream(vs);
      setFinancials(fin);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, year, directOnly]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const chartData = useMemo<DashboardTimeSeriesPoint[]>(() => {
    if (!financials) return [];
    return financials.byMonth.map((m) => ({
      period: m.month,
      revenue: m.revenue ?? '0',
      expenses: m.expense ?? '0',
    }));
  }, [financials]);

  const updateUrl = (nextYear: number, nextDirect: boolean) => {
    const sp = new URLSearchParams();
    sp.set('year', String(nextYear));
    if (nextDirect) sp.set('directOnly', 'true');
    router.replace(`/admin/value-streams/${params.id}/financials?${sp.toString()}`);
  };

  const handleYearChange = (next: number) => {
    setYear(next);
    updateUrl(next, directOnly);
  };

  const handleDirectOnlyChange = (next: boolean) => {
    setDirectOnly(next);
    updateUrl(year, next);
  };

  if (loading && !financials) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (notFound || !valueStream) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{tvs('notFound')}</h2>
        <Button variant="outline" asChild>
          <Link href="/admin/value-streams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tvs('backToValueStreams')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/value-streams">{tvs('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/admin/value-streams/${valueStream.id}`}>{valueStream.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
        <YearSelector
          year={year}
          directOnly={directOnly}
          onYearChange={handleYearChange}
          onDirectOnlyChange={handleDirectOnlyChange}
        />
      </div>

      {financials && (() => {
        const view: FinancialsView = {
          year: financials.year,
          currencyName: financials.presentationCurrency?.name ?? null,
          summary: financials.summary,
          byMonth: financials.byMonth,
          byQuarter: financials.byQuarter,
          invoiceCount: financials.invoiceCount,
          notConvertedCount: financials.notConvertedCount,
        };
        return (
          <>
            <FinancialsEmptyStates
              financials={view}
              missingCurrency={{
                title: t('noBaseValueTitle'),
                body: t('noBaseValueBody'),
                action: (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/exchange-rates">{t('noBaseValueAction')}</Link>
                  </Button>
                ),
              }}
              noInvoices={{
                title: t('noInvoicesTitle'),
                body: t('noInvoicesBody'),
                action: (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/value-streams/${params.id}/invoices`}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {t('noInvoicesAction')}
                    </Link>
                  </Button>
                ),
              }}
              notConverted={{
                title: t('notConvertedTitle', { count: financials.notConvertedCount }),
                body: t('notConvertedBody'),
              }}
            />
            <FinancialsSummaryCards financials={view} />
            <RevenueExpensesChart data={chartData} />
            <FinancialsBreakdownTable financials={view} />
          </>
        );
      })()}
    </div>
  );
}
