'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { PaginatedResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface InvoiceRow {
  id: string;
  number: string;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  issuedAt: string;
  currency: { id: string; name: string } | null;
  total?: string;
  paid: boolean;
}

interface ValueStreamInvoicesSectionProps {
  valueStreamId: string;
  limit?: number;
}

export function ValueStreamInvoicesSection({
  valueStreamId,
  limit = 10,
}: ValueStreamInvoicesSectionProps) {
  const t = useTranslations('valueStreams');
  const ti = useTranslations('invoices');
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [total, setTotal] = useState(0);

  const fetchInvoices = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        valueStreamId,
        page: '1',
        limit: String(limit),
        sortBy: 'issuedAt',
        sortOrder: 'DESC',
      });
      const result = await api.get<PaginatedResponse<InvoiceRow>>(
        `/invoices/search?${qs.toString()}`,
      );
      setRows(result.data);
      setTotal(result.meta.total);
    } catch {
      setRows([]);
      setTotal(0);
    }
  }, [valueStreamId, limit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t('recentInvoices')}</CardTitle>
          {total > 0 && (
            <Button asChild variant="link" size="sm">
              <Link href={`/admin/invoices?valueStreamId=${valueStreamId}`}>
                {t('viewAllInvoices', { count: total })}
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">{ti('loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noInvoices')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ti('number')}</TableHead>
                <TableHead>{ti('fromAgent')} → {ti('toAgent')}</TableHead>
                <TableHead className="text-right">{ti('total')}</TableHead>
                <TableHead>{ti('paid')}</TableHead>
                <TableHead>{ti('issuedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">
                      {invoice.fromAgent?.name ?? '—'} →{' '}
                    </span>
                    {invoice.toAgent?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {invoice.total ?? '0.00'} {invoice.currency?.name ?? ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.paid ? 'default' : 'secondary'}>
                      {invoice.paid ? ti('paidYes') : ti('paidNo')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invoice.issuedAt.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
