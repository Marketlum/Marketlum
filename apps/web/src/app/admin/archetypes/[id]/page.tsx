'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Shapes } from 'lucide-react';
import type { ArchetypeResponse, CreateArchetypeInput } from '@marketlum/shared';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { ArchetypeFormDialog } from '@/components/archetypes/archetype-form-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { MarkdownContent } from '@/components/shared/markdown-editor';
import { FileImagePreview } from '@/components/shared/file-image-preview';
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
import { Badge } from '@/components/ui/badge';

export default function ArchetypeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('archetypes');
  const tc = useTranslations('common');

  const [archetype, setArchetype] = useState<ArchetypeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchArchetype = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ArchetypeResponse>(`/archetypes/${params.id}`);
      setArchetype(result);
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
    fetchArchetype();
  }, [fetchArchetype]);

  const handleEdit = async (input: CreateArchetypeInput) => {
    if (!archetype) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/archetypes/${archetype.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchArchetype();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!archetype) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/archetypes/${archetype.id}`);
      toast.success(t('deleted'));
      router.push('/admin/archetypes');
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

  if (notFound || !archetype) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/archetypes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToArchetypes')}
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
              <Link href="/admin/archetypes">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{archetype.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {archetype.image ? (
            <FileImagePreview
              fileId={archetype.image.id}
              mimeType={archetype.image.mimeType}
              alt={archetype.image.originalName}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Shapes className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate mb-1">{archetype.name}</h1>
          {archetype.purpose && (
            <div className="text-muted-foreground mb-2">
              <MarkdownContent content={archetype.purpose} />
            </div>
          )}
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
            {archetype.description && (
              <div>
                <p className="text-sm text-muted-foreground">{t('archetypeDescription')}</p>
                <MarkdownContent content={archetype.description} />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(archetype.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(archetype.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('taxonomies')}</CardTitle>
          </CardHeader>
          <CardContent>
            {archetype.taxonomies.length === 0 ? (
              <p className="text-muted-foreground">-</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {archetype.taxonomies.map((taxonomy) => (
                  <Badge key={taxonomy.id} variant="secondary">
                    {taxonomy.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ArchetypeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        archetype={archetype}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteArchetype')}
        description={tc('confirmDeleteDescription', { name: archetype.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
