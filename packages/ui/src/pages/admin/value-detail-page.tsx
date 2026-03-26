'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Gem, Pencil, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import { FileImagePreview } from '../../components/shared/file-image-preview';
import type { ValueResponse, CreateValueInput } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { ValueFormDialog } from '../../components/values/value-form-dialog';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { ValueTypeBadge } from '../../components/values/value-type-badge';
import { Badge } from '../../components/ui/badge';
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

const typeTranslationKeys: Record<string, string> = {
  product: 'typeProduct',
  service: 'typeService',
  relationship: 'typeRelationship',
  right: 'typeRight',
};

const parentTypeTranslationKeys: Record<string, string> = {
  on_top_of: 'parentTypeOnTopOf',
  part_of: 'parentTypePartOf',
};

export function ValueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('values');
  const tc = useTranslations('common');

  const [value, setValue] = useState<ValueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchValue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ValueResponse>(`/values/${params.id}`);
      setValue(result);
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
    fetchValue();
  }, [fetchValue]);

  const handleEdit = async (input: CreateValueInput) => {
    if (!value) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/values/${value.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchValue();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!value) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/values/${value.id}`);
      toast.success(t('deleted'));
      router.push('/admin/values');
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

  if (notFound || !value) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/values">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToValues')}
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
              <Link href="/admin/values">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{value.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {(value as any).images?.[0] ? (
            <FileImagePreview
              fileId={(value as any).images[0].id}
              mimeType={(value as any).images[0].mimeType}
              alt={(value as any).images[0].originalName}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Gem className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{value.name}</h1>
            <ValueTypeBadge type={value.type} label={t(typeTranslationKeys[value.type])} />
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
              <p className="text-sm text-muted-foreground">{t('purpose')}</p>
              <p>{value.purpose || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('valueDescription')}</p>
              <p>{value.description || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {value.link ? (
                <a href={value.link} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                  {value.link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('parent')}</p>
              {value.parent ? (
                <div className="flex items-center gap-2">
                  <Link href={`/admin/values/${value.parent.id}`} className="text-primary hover:underline">
                    {value.parent.name}
                  </Link>
                  {value.parentType && (
                    <Badge variant="outline">{t(parentTypeTranslationKeys[value.parentType])}</Badge>
                  )}
                </div>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('agent')}</p>
              {value.agent ? (
                <Link href={`/admin/agents/${value.agent.id}`} className="text-primary hover:underline">
                  {value.agent.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(value.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(value.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('taxonomies')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('mainTaxonomy')}</p>
                {value.mainTaxonomy ? (
                  <Badge variant="outline">{value.mainTaxonomy.name}</Badge>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('taxonomies')}</p>
                {value.taxonomies && value.taxonomies.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {value.taxonomies.map((tax) => (
                      <Badge key={tax.id} variant="outline">{tax.name}</Badge>
                    ))}
                  </div>
                ) : (
                  <p>-</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('images')}</CardTitle>
            </CardHeader>
            <CardContent>
              {(value as any).images && (value as any).images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {(value as any).images.map((img: any) => (
                    <div key={img.id} className="h-24 rounded overflow-hidden border bg-muted/30">
                      <FileImagePreview
                        fileId={img.id}
                        mimeType={img.mimeType}
                        alt={img.originalName}
                        iconClassName="h-8 w-8 text-muted-foreground/50"
                        imgClassName="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p>-</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('files')}</CardTitle>
            </CardHeader>
            <CardContent>
              {value.files && value.files.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {value.files.map((file) => (
                    <Badge key={file.id} variant="outline">{file.originalName}</Badge>
                  ))}
                </div>
              ) : (
                <p>-</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ValueFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        value={value}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteValue')}
        description={tc('confirmDeleteDescription', { name: value.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
