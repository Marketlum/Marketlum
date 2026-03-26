'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Package, ExternalLink } from 'lucide-react';
import type { OfferingResponse, CreateOfferingInput } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { OfferingFormDialog } from '../../components/offerings/offering-form-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

function stateBadgeVariant(state: string): 'default' | 'secondary' {
  return state === 'live' ? 'default' : 'secondary';
}

export function OfferingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('offerings');
  const tc = useTranslations('common');

  const [offering, setOffering] = useState<OfferingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOffering = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<OfferingResponse>(`/offerings/${params.id}`);
      setOffering(result);
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
    fetchOffering();
  }, [fetchOffering]);

  const handleEdit = async (input: CreateOfferingInput) => {
    if (!offering) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/offerings/${offering.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchOffering();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!offering) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/offerings/${offering.id}`);
      toast.success(t('deleted'));
      router.push('/admin/offerings');
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

  if (notFound || !offering) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/offerings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToOfferings')}
          </Link>
        </Button>
      </div>
    );
  }

  const stateLabel = offering.state === 'live' ? t('stateLive') : t('stateDraft');

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
              <Link href="/admin/offerings">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{offering.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          <Package className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{offering.name}</h1>
            <Badge variant={stateBadgeVariant(offering.state)}>{stateLabel}</Badge>
          </div>
          {offering.purpose && (
            <p className="text-muted-foreground mb-2">{offering.purpose}</p>
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
            {offering.description && (
              <div>
                <p className="text-sm text-muted-foreground">{t('offeringDescription')}</p>
                <p>{offering.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t('agent')}</p>
              {offering.agent ? (
                <Link href={`/admin/agents/${offering.agent.id}`} className="text-primary hover:underline">
                  {offering.agent.name}
                </Link>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('valueStream')}</p>
              <p>{offering.valueStream?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {offering.link ? (
                <a
                  href={offering.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {offering.link}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            {offering.activeFrom && (
              <div>
                <p className="text-sm text-muted-foreground">{t('activeFrom')}</p>
                <p>{new Date(offering.activeFrom).toLocaleDateString()}</p>
              </div>
            )}
            {offering.activeUntil && (
              <div>
                <p className="text-sm text-muted-foreground">{t('activeUntil')}</p>
                <p>{new Date(offering.activeUntil).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(offering.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(offering.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('components')}</CardTitle>
          </CardHeader>
          <CardContent>
            {offering.components.length === 0 ? (
              <p className="text-muted-foreground">-</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('value')}</TableHead>
                    <TableHead className="text-right">{t('quantity')}</TableHead>
                    <TableHead>{t('pricingFormula')}</TableHead>
                    <TableHead>{t('pricingLink')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offering.components.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>{comp.value.name}</TableCell>
                      <TableCell className="text-right">{comp.quantity}</TableCell>
                      <TableCell>{comp.pricingFormula ?? '-'}</TableCell>
                      <TableCell>
                        {comp.pricingLink ? (
                          <a
                            href={comp.pricingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {comp.pricingLink}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <OfferingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        offering={offering}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteOffering')}
        description={tc('confirmDeleteDescription', { name: offering.name })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
