'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Folder, User, Plus, ArrowRightLeft } from 'lucide-react';
import type {
  ValueStreamResponse,
  CreateValueStreamInput,
  ValueResponse,
  ExchangeResponse,
  DashboardSummaryResponse,
  PaginatedResponse,
  CreateValueInput,
  CreateExchangeInput,
} from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { formatDate, getPresetRange } from '../../lib/date-range-presets';
import { toast } from 'sonner';
import { FileImagePreview } from '../../components/shared/file-image-preview';
import { ValueStreamFormDialog } from '../../components/value-streams/value-stream-form-dialog';
import { ValueFormDialog } from '../../components/values/value-form-dialog';
import { ExchangeFormDialog } from '../../components/exchanges/exchange-form-dialog';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { RevenueExpensesChart } from '../../components/dashboard/revenue-expenses-chart';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';

export function ValueStreamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const tv = useTranslations('values');
  const te = useTranslations('exchanges');

  const [valueStream, setValueStream] = useState<ValueStreamResponse | null>(null);
  const [values, setValues] = useState<ValueResponse[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeResponse[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createValueOpen, setCreateValueOpen] = useState(false);
  const [createExchangeOpen, setCreateExchangeOpen] = useState(false);
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

  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const [vsResult, valuesResult, exchangesResult] = await Promise.all([
        api.get<ValueStreamResponse>(`/value-streams/${params.id}`),
        api.get<PaginatedResponse<ValueResponse>>(`/values?valueStreamId=${params.id}&limit=10`),
        api.get<PaginatedResponse<ExchangeResponse>>(`/exchanges/search?valueStreamId=${params.id}&limit=10`),
      ]);
      setValueStream(vsResult);
      setValues(valuesResult.data);
      setExchanges(exchangesResult.data);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchDashboard = useCallback(async () => {
    try {
      const qp = new URLSearchParams();
      qp.set('valueStreamId', params.id);
      if (fromDate) qp.set('fromDate', fromDate);
      if (toDate) qp.set('toDate', toDate);
      const result = await api.get<DashboardSummaryResponse>(`/dashboard/summary?${qp.toString()}`);
      setDashboardData(result);
    } catch {
      setDashboardData(null);
    }
  }, [params.id, fromDate, toDate]);

  useEffect(() => {
    fetchMain();
  }, [fetchMain]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleEdit = async (input: CreateValueStreamInput) => {
    if (!valueStream) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/value-streams/${valueStream.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchMain();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!valueStream) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/value-streams/${valueStream.id}`);
      toast.success(t('deleted'));
      router.push('/admin/value-streams');
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateValue = async (input: CreateValueInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/values', input);
      toast.success(tv('created'));
      setCreateValueOpen(false);
      fetchMain();
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
      fetchMain();
    } catch {
      toast.error(te('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (notFound || !valueStream) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/value-streams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToValueStreams')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <Link href="/admin/value-streams">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{valueStream.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
            {valueStream.image ? (
              <FileImagePreview
                fileId={valueStream.image.id}
                mimeType={valueStream.image.mimeType}
                alt={valueStream.name}
                iconClassName="h-12 w-12 text-muted-foreground/50"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <Folder className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{valueStream.name}</h1>
            {valueStream.purpose && (
              <p className="text-muted-foreground mt-1">{valueStream.purpose}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {valueStream.lead && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
              <User className="h-4 w-4" />
              <span>{valueStream.lead.name}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {tc('edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {tc('delete')}
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setCreateValueOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('createValue')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCreateExchangeOpen(true)}>
          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('createExchange')}
        </Button>
      </div>

      {/* Revenue & Expenses chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t('revenueExpenses')}</CardTitle>
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

      {/* Recent values & exchanges */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('recentValues')}</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href={`/admin/values?valueStreamId=${valueStream.id}`}>
                  {t('viewAllValues')}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {values.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noValues')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{tc('name')}</th>
                      <th className="pb-2 font-medium">{tc('type')}</th>
                      <th className="pb-2 font-medium">{tv('lifecycleStage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.map((v) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link href={`/admin/values/${v.id}`} className="hover:underline">
                            {v.name}
                          </Link>
                        </td>
                        <td className="py-2 capitalize">{v.type}</td>
                        <td className="py-2 capitalize">{v.lifecycleStage ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('recentExchanges')}</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href={`/admin/exchanges?valueStreamId=${valueStream.id}`}>
                  {t('viewAllExchanges')}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {exchanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noExchanges')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">{tc('name')}</th>
                      <th className="pb-2 font-medium">{te('state')}</th>
                      <th className="pb-2 font-medium">{te('channel')}</th>
                      <th className="pb-2 font-medium">{te('openedAt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchanges.map((ex) => (
                      <tr key={ex.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link href={`/admin/exchanges/${ex.id}`} className="hover:underline">
                            {ex.name}
                          </Link>
                        </td>
                        <td className="py-2 capitalize">{ex.state}</td>
                        <td className="py-2">{(ex as any).channel?.name ?? '-'}</td>
                        <td className="py-2">{new Date(ex.openedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ValueFormDialog
        open={createValueOpen}
        onOpenChange={setCreateValueOpen}
        onSubmit={handleCreateValue}
        initialData={{ valueStream: { id: valueStream.id, name: valueStream.name } } as any}
        isSubmitting={isSubmitting}
      />

      <ExchangeFormDialog
        open={createExchangeOpen}
        onOpenChange={setCreateExchangeOpen}
        onSubmit={handleCreateExchange}
        initialValueStreamId={valueStream.id}
        isSubmitting={isSubmitting}
      />

      <ValueStreamFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        valueStream={valueStream}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteValueStream')}
        description={t('deleteWithChildren', { name: valueStream.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
