'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Folder, User } from 'lucide-react';
import type { ValueStreamResponse, CreateValueStreamInput } from '@marketlum/shared';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { ValueStreamFormDialog } from '@/components/value-streams/value-stream-form-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function ValueStreamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');

  const [valueStream, setValueStream] = useState<ValueStreamResponse | null>(null);
  const [children, setChildren] = useState<ValueStreamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchValueStream = useCallback(async () => {
    setLoading(true);
    try {
      const [result, childrenResult] = await Promise.all([
        api.get<ValueStreamResponse>(`/value-streams/${params.id}`),
        api.get<ValueStreamResponse[]>(`/value-streams/${params.id}/children`),
      ]);
      setValueStream(result);
      setChildren(childrenResult);
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
    fetchValueStream();
  }, [fetchValueStream]);

  const handleEdit = async (input: CreateValueStreamInput) => {
    if (!valueStream) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/value-streams/${valueStream.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchValueStream();
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
              <Link href="/admin/value-streams">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{valueStream.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
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
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate mb-1">{valueStream.name}</h1>
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
              <p className="text-sm text-muted-foreground">{t('purpose')}</p>
              <p>{valueStream.purpose || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('lead')}</p>
              <p>{valueStream.lead ? valueStream.lead.name : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(valueStream.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(valueStream.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('children')}</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-muted-foreground">{t('noChildren')}</p>
            ) : (
              <ul className="space-y-2">
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/app/value-streams/${child.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                    >
                      {child.image ? (
                        <div className="h-5 w-5 shrink-0 rounded overflow-hidden">
                          <FileImagePreview
                            fileId={child.image.id}
                            mimeType={child.image.mimeType}
                            alt={child.name}
                            iconClassName="h-5 w-5 text-muted-foreground"
                            imgClassName="h-5 w-5 object-cover"
                          />
                        </div>
                      ) : (
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm">{child.name}</span>
                      {child.lead && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {child.lead.name}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
