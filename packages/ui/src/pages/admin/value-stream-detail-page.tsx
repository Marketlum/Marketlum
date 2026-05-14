'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, ArrowRightLeft, RefreshCw } from 'lucide-react';
import type {
  CreateValueInput,
  CreateExchangeInput,
  CreateRecurringFlowInput,
  DashboardSummaryResponse,
} from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { formatDate, getPresetRange } from '../../lib/date-range-presets';
import { toast } from 'sonner';
import { ValueFormDialog } from '../../components/values/value-form-dialog';
import { ExchangeFormDialog } from '../../components/exchanges/exchange-form-dialog';
import { RecurringFlowFormDialog } from '../../components/recurring-flows/recurring-flow-form-dialog';
import { RevenueExpensesChart } from '../../components/dashboard/revenue-expenses-chart';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';

export function ValueStreamDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('valueStreamSections');
  const tvs = useTranslations('valueStreams');
  const tv = useTranslations('values');
  const te = useTranslations('exchanges');
  const trf = useTranslations('recurringFlows');
  const td = useTranslations('dashboard');

  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [createValueOpen, setCreateValueOpen] = useState(false);
  const [createExchangeOpen, setCreateExchangeOpen] = useState(false);
  const [createRecurringFlowOpen, setCreateRecurringFlowOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [preset, setPreset] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const presetOptions = useMemo(() => [
    { key: 'all', label: td('presetAll') },
    { key: 'last7', label: td('presetLast7') },
    { key: 'last30', label: td('presetLast30') },
    { key: 'thisMonth', label: td('presetThisMonth') },
    { key: 'lastMonth', label: td('presetLastMonth') },
    { key: 'thisQuarter', label: td('presetThisQuarter') },
    { key: 'thisYear', label: td('presetThisYear') },
    { key: 'lastYear', label: td('presetLastYear') },
    { key: 'custom', label: td('presetCustom') },
  ], [td]);

  const handlePresetChange = useCallback((key: string) => {
    setPreset(key);
    if (key === 'all') {
      setFromDate('');
      setToDate('');
    } else if (key !== 'custom') {
      const { from, to } = getPresetRange(key);
      setFromDate(from);
      setToDate(to);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const qp = new URLSearchParams();
      qp.set('valueStreamId', id);
      if (fromDate) qp.set('fromDate', fromDate);
      if (toDate) qp.set('toDate', toDate);
      const result = await api.get<DashboardSummaryResponse>(`/dashboard/summary?${qp.toString()}`);
      setDashboardData(result);
    } catch {
      setDashboardData(null);
    }
  }, [id, fromDate, toDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCreateValue = async (input: CreateValueInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/values', input);
      toast.success(tv('created'));
      setCreateValueOpen(false);
    } catch {
      toast.error(tv('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExchange = async (input: CreateExchangeInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/exchanges', input);
      toast.success(te('created'));
      setCreateExchangeOpen(false);
    } catch {
      toast.error(te('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRecurringFlow = async (input: CreateRecurringFlowInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/recurring-flows', input);
      toast.success(trf('created'));
      setCreateRecurringFlowOpen(false);
    } catch {
      toast.error(trf('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCreateValueOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('createValue')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreateExchangeOpen(true)}>
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('createExchange')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreateRecurringFlowOpen(true)}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t('createRecurringFlow')}
        </Button>
      </div>

      {/* Revenue & Expenses chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{tvs('revenueExpenses')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {presetOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              {preset === 'custom' && (
                <>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueExpensesChart data={dashboardData?.timeSeries ?? []} />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ValueFormDialog
        open={createValueOpen}
        onOpenChange={setCreateValueOpen}
        onSubmit={handleCreateValue}
        initialData={{ valueStream: { id, name: '' } } as never}
        isSubmitting={isSubmitting}
      />

      <ExchangeFormDialog
        open={createExchangeOpen}
        onOpenChange={setCreateExchangeOpen}
        onSubmit={handleCreateExchange}
        initialValueStreamId={id}
        isSubmitting={isSubmitting}
      />

      <RecurringFlowFormDialog
        open={createRecurringFlowOpen}
        onOpenChange={setCreateRecurringFlowOpen}
        onSubmit={handleCreateRecurringFlow}
        defaultValueStreamId={id}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
