'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link2, Unlink } from 'lucide-react';
import type { PaginatedResponse } from '@marketlum/shared';
import { api, ApiError } from '../../lib/api-client';
import { useDebounce } from '../../hooks/use-debounce';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface LinkedInvoice {
  id: string;
  number: string;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  currency: { id: string; name: string } | null;
  order: { id: string; number: string } | null;
  total?: string;
  paid: boolean;
  issuedAt: string;
}

interface OrderInvoicesTabProps {
  orderId: string;
  orderCurrencyId: string | null;
  /** Linking/unlinking is only offered while the order is not in a final state. */
  linkable: boolean;
  /** Notify the parent so it can refresh the invoiced total. */
  onChanged?: () => void;
}

export function OrderInvoicesTab({
  orderId,
  orderCurrencyId,
  linkable,
  onChanged,
}: OrderInvoicesTabProps) {
  const router = useRouter();
  const t = useTranslations('orders');
  const ti = useTranslations('invoices');
  const tc = useTranslations('common');
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const debouncedCandidateSearch = useDebounce(candidateSearch, 300);
  const [candidates, setCandidates] = useState<LinkedInvoice[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<LinkedInvoice>>(
        `/invoices/search?page=1&limit=10000&orderId=${orderId}`,
      );
      setInvoices(result.data);
    } catch {
      toast.error(ti('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const fetchCandidates = useCallback(async () => {
    try {
      let qs = 'page=1&limit=20';
      if (debouncedCandidateSearch) {
        qs += `&search=${encodeURIComponent(debouncedCandidateSearch)}`;
      }
      if (orderCurrencyId) qs += `&currencyId=${orderCurrencyId}`;
      const result = await api.get<PaginatedResponse<LinkedInvoice>>(
        `/invoices/search?${qs}`,
      );
      setCandidates(result.data.filter((invoice) => !invoice.order));
    } catch {
      setCandidates([]);
    }
  }, [debouncedCandidateSearch, orderCurrencyId]);

  useEffect(() => {
    if (linkOpen) {
      fetchCandidates();
    }
  }, [linkOpen, fetchCandidates]);

  const setOrderLink = async (invoiceId: string, target: string | null) => {
    setBusyId(invoiceId);
    try {
      await api.patch(`/invoices/${invoiceId}`, { orderId: target });
      toast.success(target ? t('invoiceLinked') : t('invoiceUnlinked'));
      setLinkOpen(false);
      setCandidateSearch('');
      fetchInvoices();
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('linkConflict'));
      } else {
        toast.error(t('failedToLink'));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {linkable && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            {t('linkInvoice')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {tc('loading')}
        </div>
      ) : invoices.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('noInvoices')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ti('number')}</TableHead>
              <TableHead>{ti('from')}</TableHead>
              <TableHead>{ti('to')}</TableHead>
              <TableHead>{ti('total')}</TableHead>
              <TableHead>{ti('paid')}</TableHead>
              {linkable && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/invoices/${invoice.id}`)}
              >
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{invoice.fromAgent?.name ?? '—'}</TableCell>
                <TableCell>{invoice.toAgent?.name ?? '—'}</TableCell>
                <TableCell className="tabular-nums">
                  {invoice.total ?? '0.00'} {invoice.currency?.name ?? ''}
                </TableCell>
                <TableCell>
                  <Badge variant={invoice.paid ? 'default' : 'outline'}>
                    {invoice.paid ? ti('paidYes') : ti('paidNo')}
                  </Badge>
                </TableCell>
                {linkable && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === invoice.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void setOrderLink(invoice.id, null);
                      }}
                    >
                      <Unlink className="mr-1 h-3.5 w-3.5" />
                      {t('unlink')}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('linkInvoice')}</DialogTitle>
            <DialogDescription>{t('linkInvoiceDescription')}</DialogDescription>
          </DialogHeader>
          <Input
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
            placeholder={t('searchInvoicesPlaceholder')}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('noLinkableInvoices')}
              </p>
            ) : (
              candidates.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-2 text-left text-sm hover:bg-muted/50"
                  disabled={busyId === invoice.id}
                  onClick={() => void setOrderLink(invoice.id, orderId)}
                >
                  <span className="font-medium">{invoice.number}</span>
                  <span className="text-muted-foreground">
                    {invoice.total ?? '0.00'} {invoice.currency?.name ?? ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
