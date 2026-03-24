'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import type { InvoiceResponse, CreateInvoiceInput } from '@marketlum/shared';
import { api, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { InvoiceFormDialog } from '@/components/invoices/invoice-form-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('invoices');
  const tc = useTranslations('common');

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<InvoiceResponse>(`/invoices/${params.id}`);
      setInvoice(result);
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
    fetchInvoice();
  }, [fetchInvoice]);

  const handleEdit = async (input: CreateInvoiceInput) => {
    if (!invoice) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/invoices/${invoice.id}`, input);
      toast.success(t('updated'));
      setEditOpen(false);
      fetchInvoice();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/invoices/${invoice.id}`);
      toast.success(t('deleted'));
      router.push('/admin/invoices');
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

  if (notFound || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <h2 className="text-xl font-semibold">{t('notFound')}</h2>
        <p className="text-muted-foreground">{t('notFoundDescription')}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToInvoices')}
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
              <Link href="/admin/invoices">{t('title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{invoice.number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6 flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{invoice.number}</h1>
            <Badge variant={invoice.paid ? 'default' : 'secondary'}>
              {invoice.paid ? t('paidYes') : t('paidNo')}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-2">
            {invoice.fromAgent.name} → {invoice.toAgent.name}
          </p>
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
              <p className="text-sm text-muted-foreground">{t('from')}</p>
              <Link href={`/admin/agents/${invoice.fromAgent.id}`} className="text-primary hover:underline">
                {invoice.fromAgent.name}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('to')}</p>
              <Link href={`/admin/agents/${invoice.toAgent.id}`} className="text-primary hover:underline">
                {invoice.toAgent.name}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('currency')}</p>
              <p>{invoice.currency.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('total')}</p>
              <p className="text-lg font-semibold">{invoice.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('issuedAt')}</p>
              <p>{new Date(invoice.issuedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dueAt')}</p>
              <p>{new Date(invoice.dueAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('valueStream')}</p>
              <p>{invoice.valueStream?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('channel')}</p>
              <p>{invoice.channel?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('link')}</p>
              {invoice.link ? (
                <a
                  href={invoice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {invoice.link}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tc('created')}</p>
              <p>{new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('updatedAt')}</p>
              <p>{new Date(invoice.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('items')}</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.items.length === 0 ? (
              <p className="text-muted-foreground">-</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('value')}</TableHead>
                    <TableHead className="text-right">{t('quantity')}</TableHead>
                    <TableHead className="text-right">{t('unitPrice')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.value?.name ?? item.valueInstance?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.unitPrice}</TableCell>
                      <TableCell className="text-right">{item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <InvoiceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEdit}
        invoice={{ ...invoice, file: invoice.file ?? null }}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t('deleteInvoice')}
        description={tc('confirmDeleteDescription', { name: invoice.number })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
