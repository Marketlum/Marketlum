'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trash2, ArrowLeft, Flame } from 'lucide-react';
import type { TensionResponse } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { TensionInlineField } from '../../components/tensions/tension-inline-field';
import { TensionHistory } from '../../components/tensions/tension-history';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { Can } from '../../permissions/can';
import { MarkdownContent } from '../../components/shared/markdown-editor';
import { useActors } from '../../hooks/use-actors';
import { useUsers } from '../../hooks/use-users';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

export function TensionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('tensions');
  const tc = useTranslations('common');
  const { actors } = useActors();
  const { users } = useUsers();

  const [tension, setTension] = useState<TensionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTension = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<TensionResponse>(`/tensions/${params.id}`);
      setTension(result);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTension();
  }, [fetchTension]);

  const handleTransition = async (action: string) => {
    if (!tension) return;
    try {
      await api.post(`/tensions/${tension.id}/${action}`);
      toast.success(t('stateChanged'));
      fetchTension();
    } catch {
      toast.error(t('failedToTransition'));
    }
  };

  /**
   * Each inline field saves through its own command endpoint (spec 027 Q20).
   * A 409 means someone else advanced the stream, so we reload rather than
   * retry blindly.
   */
  const runCommand = async (action: string, body: unknown) => {
    if (!tension) return;
    setIsSubmitting(true);
    try {
      await api.post(`/tensions/${tension.id}/${action}`, body);
      toast.success(t('updated'));
      await fetchTension();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('changedElsewhere'));
        await fetchTension();
      } else {
        toast.error(t('failedToUpdate'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tension) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/tensions/${tension.id}`);
      toast.success(t('deleted'));
      router.push('/admin/tensions');
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

  if (notFound || !tension) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/tensions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToTensions')}
          </Link>
        </Button>
      </div>
    );
  }

  const scoreBadgeVariant = tension.score >= 8 ? 'default' : tension.score >= 4 ? 'secondary' : 'outline';

  const stateBadgeVariant: 'default' | 'secondary' | 'outline' =
    tension.state === 'alive' ? 'default'
    : tension.state === 'resolved' ? 'default'
    : 'secondary';

  const stateBadgeClassName = tension.state === 'resolved'
    ? 'bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 text-white hover:opacity-90'
    : '';

  const stateLabel = tension.state === 'alive' ? t('stateAlive')
    : tension.state === 'resolved' ? t('stateResolved')
    : t('stateStale');

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
              <Link href="/admin/tensions">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tension.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          <Flame className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{tension.name}</h1>
            <Badge variant={stateBadgeVariant} className={stateBadgeClassName}>{stateLabel}</Badge>
            <Badge variant={scoreBadgeVariant}>{t('score')}: {tension.score}</Badge>
          </div>
          <Can resource="tensions" action="write">
            <div className="flex gap-2 mt-2 flex-wrap">
              {tension.state === 'alive' && (
                <>
                  <Button size="sm" onClick={() => handleTransition('resolve')}>
                    {t('resolve')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleTransition('drop')}>
                    {t('drop')}
                  </Button>
                </>
              )}
              {tension.state === 'resolved' && (
                <Button variant="outline" size="sm" onClick={() => handleTransition('reopen')}>
                  {t('reopen')}
                </Button>
              )}
              {tension.state === 'stale' && (
                <Button variant="outline" size="sm" onClick={() => handleTransition('revive')}>
                  {t('revive')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tc('delete')}
              </Button>
            </div>
          </Can>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TensionInlineField
              label={tc('name')}
              value={tension.name}
              type="text"
              onSave={(value) => runCommand('rename', { name: String(value ?? '') })}
            />
            <TensionInlineField
              label={t('actor')}
              value={tension.actor?.id ?? null}
              type="select"
              options={actors.map((a) => ({ value: a.id, label: a.name }))}
              display={
                tension.actor ? (
                  <Link
                    href={`/admin/actors/${tension.actor.id}`}
                    className="text-primary hover:underline"
                  >
                    {tension.actor.name}
                  </Link>
                ) : (
                  <p>-</p>
                )
              }
              onSave={(value) => runCommand('reassign', { actorId: value })}
            />
            <TensionInlineField
              label={t('lead')}
              value={tension.lead?.id ?? null}
              type="select"
              nullable
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              display={<p>{tension.lead?.name ?? '-'}</p>}
              onSave={(value) => runCommand('lead', { leadUserId: value })}
            />
            <TensionInlineField
              label={t('score')}
              value={tension.score}
              type="number"
              min={1}
              max={10}
              onSave={(value) => runCommand('rescore', { score: Number(value) })}
            />
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(tension.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(tension.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <TensionInlineField
                label={t('currentContext')}
                value={tension.currentContext}
                type="markdown"
                display={
                  tension.currentContext ? (
                    <MarkdownContent content={tension.currentContext} />
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )
                }
                onSave={(value) => runCommand('revise', { currentContext: value || null })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TensionInlineField
                label={t('potentialFuture')}
                value={tension.potentialFuture}
                type="markdown"
                display={
                  tension.potentialFuture ? (
                    <MarkdownContent content={tension.potentialFuture} />
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )
                }
                onSave={(value) => runCommand('revise', { potentialFuture: value || null })}
              />
            </CardContent>
          </Card>

          {(tension as any).exchanges?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('linkedExchanges')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('name')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((tension as any).exchanges ?? []).map((exchange: any) => (
                      <TableRow key={exchange.id}>
                        <TableCell>
                          <Link href={`/admin/exchanges/${exchange.id}`} className="text-primary hover:underline">
                            {exchange.name}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <TensionHistory tensionId={tension.id} />
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteTension')}
        description={tc('confirmDeleteDescription', { name: tension.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
