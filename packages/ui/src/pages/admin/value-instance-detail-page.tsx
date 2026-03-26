'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Layers, Pencil, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import { FileImagePreview } from '../../components/shared/file-image-preview';
import type { ValueInstanceResponse, CreateValueInstanceInput } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { ValueInstanceFormDialog } from '../../components/value-instances/value-instance-form-dialog';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
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

export function ValueInstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('valueInstances');
  const tc = useTranslations('common');

  const [item, setItem] = useState<ValueInstanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ValueInstanceResponse>(`/value-instances/${params.id}`);
      setItem(result);
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
    fetchItem();
  }, [fetchItem]);

  const handleEdit = async (input: CreateValueInstanceInput) => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/value-instances/${item.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchItem();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/value-instances/${item.id}`);
      toast.success(t('deleted'));
      router.push('/admin/value-instances');
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

  if (notFound || !item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/value-instances">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToValueInstances')}
          </Link>
        </Button>
      </div>
    );
  }

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
              <Link href="/admin/value-instances">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{item.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {item.image ? (
            <FileImagePreview
              fileId={item.image.id}
              mimeType={item.image.mimeType}
              alt={item.image.originalName}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Layers className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{item.name}</h1>
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
              <p className="text-sm text-muted-foreground">{t('value')}</p>
              {item.value ? (
                <Link href={`/admin/values/${item.value.id}`} className="text-primary hover:underline">
                  {item.value.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('purpose')}</p>
              <p>{item.purpose || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('valueInstanceDescription')}</p>
              <p>{item.description || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                  {item.link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('version')}</p>
              <p>{item.version || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('expiresAt')}</p>
              <p>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('fromAgent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              {item.fromAgent ? (
                <Link href={`/admin/agents/${item.fromAgent.id}`} className="text-primary hover:underline">
                  {item.fromAgent.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('toAgent')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              {item.toAgent ? (
                <Link href={`/admin/agents/${item.toAgent.id}`} className="text-primary hover:underline">
                  {item.toAgent.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ValueInstanceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        valueInstance={item}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteValueInstance')}
        description={tc('confirmDeleteDescription', { name: item.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
