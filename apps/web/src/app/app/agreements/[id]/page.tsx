'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Handshake, ExternalLink } from 'lucide-react';
import type { AgreementResponse, CreateAgreementInput } from '@marketlum/shared';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { AgreementFormDialog } from '@/components/agreements/agreement-form-dialog';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function AgreementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('agreements');
  const tc = useTranslations('common');

  const [agreement, setAgreement] = useState<AgreementResponse | null>(null);
  const [children, setChildren] = useState<AgreementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAgreement = useCallback(async () => {
    setLoading(true);
    try {
      const [result, childrenResult] = await Promise.all([
        api.get<AgreementResponse>(`/agreements/${params.id}`),
        api.get<AgreementResponse[]>(`/agreements/${params.id}/children`),
      ]);
      setAgreement(result);
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
    fetchAgreement();
  }, [fetchAgreement]);

  const handleEdit = async (input: CreateAgreementInput) => {
    if (!agreement) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/agreements/${agreement.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchAgreement();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!agreement) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agreements/${agreement.id}`);
      toast.success(t('deleted'));
      router.push('/app/agreements');
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

  if (notFound || !agreement) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/app/agreements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToAgreements')}
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
              <Link href="/app">{tc('home')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/app/agreements">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{agreement.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {agreement.file ? (
            <FileImagePreview
              fileId={agreement.file.id}
              mimeType={agreement.file.mimeType}
              alt={agreement.title}
              iconClassName="h-12 w-12 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Handshake className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate mb-1">{agreement.title}</h1>
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
              <p className="text-sm text-muted-foreground">{t('content')}</p>
              <p>{agreement.content || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {agreement.link ? (
                <a
                  href={agreement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {agreement.link}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('file')}</p>
              {agreement.file ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-8 w-8 shrink-0 rounded overflow-hidden">
                    <FileImagePreview
                      fileId={agreement.file.id}
                      mimeType={agreement.file.mimeType}
                      alt={agreement.file.originalName}
                      iconClassName="h-4 w-4 text-muted-foreground/50"
                      imgClassName="h-8 w-8 object-cover"
                    />
                  </div>
                  <span className="text-sm">{agreement.file.originalName}</span>
                </div>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(agreement.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(agreement.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('parties')}</CardTitle>
            </CardHeader>
            <CardContent>
              {agreement.parties.length === 0 ? (
                <p className="text-muted-foreground">-</p>
              ) : (
                <ul className="space-y-2">
                  {agreement.parties.map((party) => (
                    <li key={party.id}>
                      <Link
                        href={`/app/agents/${party.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <span className="text-sm">{party.name}</span>
                        <Badge variant="outline" className="text-xs">{party.type}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
                        href={`/app/agreements/${child.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <Handshake className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{child.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AgreementFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        agreement={agreement}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteAgreement')}
        description={t('deleteWithChildren', { name: agreement.title })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
