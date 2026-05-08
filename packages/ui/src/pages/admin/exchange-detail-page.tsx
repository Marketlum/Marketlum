'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, ArrowRightLeft, ExternalLink, ArrowRight, Download } from 'lucide-react';
import type { ExchangeResponse, ExchangeFlowResponse, CreateExchangeInput } from '@marketlum/shared';
import type { PaginatedResponse } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { ExchangeFormDialog } from '../../components/exchanges/exchange-form-dialog';
import { ExchangeFlowsPanel } from '../../components/exchanges/exchange-flows-panel';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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

function stateBadgeVariant(state: string): 'default' | 'secondary' | 'outline' {
  switch (state) {
    case 'open': return 'default';
    case 'closed': return 'secondary';
    case 'completed': return 'outline';
    default: return 'default';
  }
}

export function ExchangeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('exchanges');
  const tc = useTranslations('common');

  const [exchange, setExchange] = useState<ExchangeResponse | null>(null);
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [flowsOpen, setFlowsOpen] = useState(false);
  const [flows, setFlows] = useState<ExchangeFlowResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<PaginatedResponse<{ id: string; name: string }>>('/channels/search?limit=1000')
      .then((res) => setChannels(res.data))
      .catch(() => {});
  }, []);

  const fetchExchange = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ExchangeResponse>(`/exchanges/${params.id}`);
      setExchange(result);
      setNotFound(false);
      const flowsResult = await api.get<ExchangeFlowResponse[]>(`/exchanges/${params.id}/flows`);
      setFlows(flowsResult);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchExchange();
  }, [fetchExchange]);

  const handleTransition = async (action: string) => {
    if (!exchange) return;
    try {
      await api.post(`/exchanges/${exchange.id}/transitions`, { action });
      toast.success(t('stateChanged'));
      fetchExchange();
    } catch {
      toast.error(t('failedToTransition'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!exchange) return;
    try {
      await api.download(`/exchanges/${exchange.id}/pdf`, `exchange-${exchange.id}.pdf`);
    } catch {
      toast.error(t('failedToDownloadPdf'));
    }
  };

  const handleEdit = async (input: CreateExchangeInput) => {
    if (!exchange) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/exchanges/${exchange.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchExchange();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!exchange) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/exchanges/${exchange.id}`);
      toast.success(t('deleted'));
      router.push('/admin/exchanges');
    } catch {
      toast.error(t('failedToDelete'));
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

  if (notFound || !exchange) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/exchanges">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToExchanges')}
          </Link>
        </Button>
      </div>
    );
  }

  const stateLabel = exchange.state === 'open' ? t('stateOpen')
    : exchange.state === 'closed' ? t('stateClosed')
    : t('stateCompleted');

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/exchanges">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{exchange.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          <ArrowRightLeft className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{exchange.name}</h1>
            <Badge variant={stateBadgeVariant(exchange.state)}>{stateLabel}</Badge>
          </div>
          {exchange.purpose && (
            <p className="text-muted-foreground mb-2">{exchange.purpose}</p>
          )}
          <div className="flex gap-2 mt-2">
            {exchange.state === 'open' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => handleTransition('close')}>
                  {t('close')}
                </Button>
                <Button size="sm" onClick={() => handleTransition('complete')}>
                  {t('complete')}
                </Button>
              </>
            )}
            {exchange.state === 'closed' && (
              <Button variant="outline" size="sm" onClick={() => handleTransition('reopen')}>
                {t('reopen')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setFlowsOpen(true)}>
              {t('flows')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {t('downloadPdf')}
            </Button>
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {exchange.description && (
              <div>
                <p className="text-sm text-muted-foreground">{t('descriptionLabel')}</p>
                <p>{exchange.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t('channel')}</p>
              <p>{exchange.channel?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('valueStream')}</p>
              <p>{exchange.valueStream?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('lead')}</p>
              <p>{exchange.lead?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('tension')}</p>
              {(exchange as any).tension ? (
                <Link href={`/admin/tensions/${(exchange as any).tension.id}`} className="text-primary hover:underline">
                  {(exchange as any).tension.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {exchange.link ? (
                <a
                  href={exchange.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {exchange.link}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('openedAt')}</p>
              <p>{new Date(exchange.openedAt).toLocaleDateString()}</p>
            </div>
            {exchange.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">{t('completedAt')}</p>
                <p>{new Date(exchange.completedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(exchange.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(exchange.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('parties')}</CardTitle>
          </CardHeader>
          <CardContent>
            {exchange.parties.length === 0 ? (
              <p className="text-muted-foreground">-</p>
            ) : (
              <ul className="space-y-2">
                {exchange.parties.map((party) => (
                  <li key={party.id}>
                    <Link
                      href={`/admin/agents/${party.agent.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                    >
                      <span className="text-sm">{party.agent.name}</span>
                      <Badge variant="outline" className="text-xs">{party.role}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('flows')}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setFlowsOpen(true)}>
            {t('manageFlows')}
          </Button>
        </CardHeader>
        <CardContent>
          {flows.length === 0 ? (
            <p className="text-muted-foreground">{t('noFlows')}</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">{t('flowValue')}</th>
                    <th className="p-2 text-left font-medium">{t('fromAgent')}</th>
                    <th className="p-2 text-center font-medium"></th>
                    <th className="p-2 text-left font-medium">{t('toAgent')}</th>
                    <th className="p-2 text-right font-medium">{t('quantity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow) => (
                    <tr key={flow.id} className="border-b last:border-0">
                      <td className="p-2">
                        {flow.value?.name ?? flow.valueInstance?.name ?? '\u2014'}
                      </td>
                      <td className="p-2">{flow.fromAgent.name}</td>
                      <td className="p-2 text-center text-muted-foreground">
                        <ArrowRight className="h-3 w-3 inline" />
                      </td>
                      <td className="p-2">{flow.toAgent.name}</td>
                      <td className="p-2 text-right font-mono">{flow.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExchangeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        exchange={exchange}
        isSubmitting={isSubmitting}
        channels={channels}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteExchange')}
        description={tc('confirmDeleteDescription', { name: exchange.name })}
        isDeleting={isSubmitting}
      />

      <ExchangeFlowsPanel
        open={flowsOpen}
        onOpenChange={setFlowsOpen}
        exchangeId={exchange.id}
        exchangeName={exchange.name}
        partyAgents={exchange.parties.map((p) => ({ id: p.agent.id, name: p.agent.name }))}
      />
    </div>
  );
}
