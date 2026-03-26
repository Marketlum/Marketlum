'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Flame } from 'lucide-react';
import type { TensionResponse, CreateTensionInput } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { TensionFormDialog } from '../../components/tensions/tension-form-dialog';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { MarkdownContent } from '../../components/shared/markdown-editor';
import { useAgents } from '../../hooks/use-agents';
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
  const { agents } = useAgents();
  const { users } = useUsers();

  const [tension, setTension] = useState<TensionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  const handleEdit = async (input: CreateTensionInput) => {
    if (!tension) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/tensions/${tension.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchTension();
    } catch {
      toast.error(t('failedToUpdate'));
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
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{tension.name}</h1>
            <Badge variant={scoreBadgeVariant}>{t('score')}: {tension.score}</Badge>
          </div>
          <div className="flex gap-2 mt-2">
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
            <div>
              <p className="text-sm text-muted-foreground">{t('agent')}</p>
              {tension.agent ? (
                <Link href={`/admin/agents/${tension.agent.id}`} className="text-primary hover:underline">
                  {tension.agent.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('lead')}</p>
              <p>{tension.lead?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('score')}</p>
              <p>{tension.score}</p>
            </div>
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
          {tension.currentContext && (
            <Card>
              <CardHeader>
                <CardTitle>{t('currentContext')}</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={tension.currentContext} />
              </CardContent>
            </Card>
          )}

          {tension.potentialFuture && (
            <Card>
              <CardHeader>
                <CardTitle>{t('potentialFuture')}</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={tension.potentialFuture} />
              </CardContent>
            </Card>
          )}

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
        </div>
      </div>

      <TensionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        tension={tension}
        isSubmitting={isSubmitting}
        agents={agents}
        users={users}
      />

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
