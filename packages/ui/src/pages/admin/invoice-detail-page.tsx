'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, ArrowLeft, Printer, ExternalLink } from 'lucide-react';
import type {
  InvoiceResponse,
  CreateInvoiceInput,
  SystemSettingsPresentationCurrencyResponse,
  AgentResponse,
} from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { toast } from 'sonner';
import { Can } from '../../permissions/can';
import { InvoiceFormDialog } from '../../components/invoices/invoice-form-dialog';
import { ConfirmDeleteDialog } from '../../components/shared/confirm-delete-dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface AddressBlockProps {
  agent: AgentResponse;
}

function AddressBlock({ agent }: AddressBlockProps) {
  const primary =
    agent.addresses.find((a) => a.isPrimary) ?? agent.addresses[0] ?? null;
  if (!primary) return null;
  return (
    <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
      {primary.line1}
      {primary.line2 && (
        <>
          <br />
          {primary.line2}
        </>
      )}
      <br />
      {primary.postalCode} {primary.city}
      {primary.region && `, ${primary.region}`}
      <br />
      {primary.country.name}
    </div>
  );
}

export function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('invoices');
  const tc = useTranslations('common');

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [baseSetting, setBaseSetting] =
    useState<SystemSettingsPresentationCurrencyResponse | null>(null);
  const [fromAgent, setFromAgent] = useState<AgentResponse | null>(null);
  const [toAgent, setToAgent] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceResult, base] = await Promise.all([
        api.get<InvoiceResponse>(`/invoices/${params.id}`),
        api
          .get<SystemSettingsPresentationCurrencyResponse>(
            '/system-settings/presentation-currency',
          )
          .catch(() => null),
      ]);
      const [from, to] = await Promise.all([
        api.get<AgentResponse>(`/agents/${invoiceResult.fromAgent.id}`).catch(() => null),
        api.get<AgentResponse>(`/agents/${invoiceResult.toAgent.id}`).catch(() => null),
      ]);
      setInvoice(invoiceResult);
      setBaseSetting(base);
      setFromAgent(from);
      setToAgent(to);
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

  const invoiceCurrency = invoice.currency;
  const fromCurrency = fromAgent?.functionalCurrency ?? null;
  const toCurrency = toAgent?.functionalCurrency ?? null;
  const presentationCurrency = baseSetting?.presentationCurrency ?? null;
  const showCrossCurrencyColumns =
    presentationCurrency !== null &&
    presentationCurrency.id !== invoiceCurrency.id;

  const subtotals: Array<{ label: string; amount: string | null; currencyName: string }> = [];
  if (fromCurrency && fromCurrency.id !== invoiceCurrency.id) {
    subtotals.push({
      label: t('inAgentBooks', { name: invoice.fromAgent.name }),
      amount: invoice.fromAgentTotal,
      currencyName: fromCurrency.name,
    });
  }
  if (toCurrency && toCurrency.id !== invoiceCurrency.id) {
    subtotals.push({
      label: t('inAgentBooks', { name: invoice.toAgent.name }),
      amount: invoice.toAgentTotal,
      currencyName: toCurrency.name,
    });
  }
  if (presentationCurrency && presentationCurrency.id !== invoiceCurrency.id) {
    subtotals.push({
      label: t('inPresentationCurrency'),
      amount: invoice.presentationTotal,
      currencyName: presentationCurrency.name,
    });
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb + toolbar — hidden when printing */}
      <div className="print:hidden">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/invoices">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('backToInvoices')}
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              {t('print')}
            </Button>
            <Can resource="invoices" action="write">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {tc('edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tc('delete')}
              </Button>
            </Can>
          </div>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="mx-auto max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm print:border-0 print:shadow-none print:max-w-none">
        <div className="space-y-8 p-8 md:p-12">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-3xl font-bold uppercase tracking-tight">
                {t('invoiceHeading')}
              </div>
              <div className="mt-1 font-mono text-sm text-muted-foreground">
                {invoice.number}
              </div>
              <div className="mt-3 flex gap-1.5">
                <Badge variant={invoice.paid ? 'default' : 'secondary'}>
                  {invoice.paid ? t('paidYes') : t('paidNo')}
                </Badge>
                <Badge variant="outline">
                  {invoice.market === 'internal' ? t('marketInternal') : t('marketExternal')}
                </Badge>
              </div>
            </div>
            <div className="text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <span className="text-muted-foreground">{t('issuedAt')}</span>
                <span className="text-right">{formatDate(invoice.issuedAt)}</span>
                <span className="text-muted-foreground">{t('dueAt')}</span>
                <span className="text-right">{formatDate(invoice.dueAt)}</span>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Parties */}
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('billedBy')}
              </div>
              <Link
                href={`/admin/agents/${invoice.fromAgent.id}`}
                className="font-semibold text-foreground hover:underline print:no-underline"
              >
                {invoice.fromAgent.name}
              </Link>
              {fromAgent && <AddressBlock agent={fromAgent} />}
              {fromCurrency && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('functionalCurrencyLabel')}: {fromCurrency.name}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('billTo')}
              </div>
              <Link
                href={`/admin/agents/${invoice.toAgent.id}`}
                className="font-semibold text-foreground hover:underline print:no-underline"
              >
                {invoice.toAgent.name}
              </Link>
              {toAgent && <AddressBlock agent={toAgent} />}
              {toCurrency && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('functionalCurrencyLabel')}: {toCurrency.name}
                </div>
              )}
            </div>
          </div>

          <div className="border-t" />

          {/* Line items */}
          {invoice.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noItems')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('value')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                  {showCrossCurrencyColumns && (
                    <TableHead className="text-right text-muted-foreground">
                      {t('inCurrency', { currency: presentationCurrency!.name })}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.value?.name ?? item.valueInstance?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.unitPrice}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.total}
                    </TableCell>
                    {showCrossCurrencyColumns && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.presentationAmount != null ? (
                          <>≈ {item.presentationAmount}</>
                        ) : (
                          <span className="italic" title={t('noRate')}>
                            —
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <dl className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between border-t pt-3">
                <dt className="font-semibold uppercase tracking-wider">
                  {t('total')}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {invoice.total} {invoiceCurrency.name}
                </dd>
              </div>
              {subtotals.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between text-muted-foreground"
                >
                  <dt>{row.label}</dt>
                  <dd className="tabular-nums">
                    {row.amount != null ? (
                      <>
                        ≈ {row.amount} {row.currencyName}
                      </>
                    ) : (
                      <span
                        className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900"
                        title={t('noRate')}
                      >
                        {t('noRate')}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Footer metadata */}
          {(invoice.channel || invoice.link) && (
            <>
              <div className="border-t" />
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                {invoice.channel && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('channel')}
                    </div>
                    <div>{invoice.channel.name}</div>
                  </div>
                )}
                {invoice.link && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t('link')}
                    </div>
                    <a
                      href={invoice.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all hover:underline print:no-underline"
                    >
                      {invoice.link}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 print:hidden" />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
