'use client';

import { ColumnDef } from '@tanstack/react-table';
import { InvoiceMarket } from '@marketlum/shared';
import { MoreHorizontal, ArrowUpDown, ExternalLink } from 'lucide-react';
import { formatDay, formatMoney } from '../../lib/format';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface InvoiceRow {
  id: string;
  number: string;
  fromActor: { id: string; name: string } | null;
  toActor: { id: string; name: string } | null;
  issuedAt: string;
  dueAt: string;
  currency: { id: string; name: string } | null;
  market: InvoiceMarket;
  onBehalfOfActor?: { id: string; name: string } | null;
  mirrorInvoice?: { id: string; number: string } | null;
  sourceInvoice?: { id: string; number: string; fromActor: { id: string; name: string } } | null;
  total?: string;
  presentationTotal?: string | null;
  paid: boolean;
  link: string | null;
  file: unknown;
  channel: { id: string; name: string } | null;
  order: { id: string; number: string } | null;
  items: { id: string; value: { id: string; name: string } | null; valueInstance: { id: string; name: string } | null; quantity: string; unitPrice: string; total: string; presentationRate: string | null; presentationAmount: string | null }[];
  createdAt: string;
  updatedAt: string;
}

interface InvoiceColumnsTranslations {
  number: string;
  from: string;
  to: string;
  issuedAt: string;
  dueAt: string;
  total: string;
  paid: string;
  paidBadge: string;
  unpaidBadge: string;
  market: string;
  marketInternal: string;
  marketExternal: string;
  mirrorBadge: string;
  order: string;
  link: string;
  edit: string;
  delete: string;
}

interface InvoiceColumnsOptions {
  onEdit: (invoice: InvoiceRow) => void;
  onDelete: (invoice: InvoiceRow) => void;
  onSort: (column: string) => void;
  translations: InvoiceColumnsTranslations;
}

export function getInvoiceColumns({
  onEdit,
  onDelete,
  onSort,
  translations,
}: InvoiceColumnsOptions): ColumnDef<InvoiceRow>[] {
  return [
    {
      accessorKey: 'number',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('number')}>
          {translations.number} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.number,
    },
    {
      id: 'fromActor',
      header: translations.from,
      cell: ({ row }) => (
        <span
          className="block max-w-[10rem] truncate"
          title={row.original.fromActor?.name ?? undefined}
        >
          {row.original.fromActor?.name ?? '\u2014'}
        </span>
      ),
    },
    {
      id: 'toActor',
      header: translations.to,
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span
          className="block max-w-[10rem] truncate"
          title={row.original.toActor?.name ?? undefined}
        >
          {row.original.toActor?.name ?? '\u2014'}
        </span>
      ),
    },
    {
      accessorKey: 'issuedAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('issuedAt')}>
          {translations.issuedAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => formatDay(row.getValue('issuedAt')),
    },
    {
      accessorKey: 'dueAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('dueAt')}>
          {translations.dueAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => formatDay(row.getValue('dueAt')),
    },
    {
      id: 'total',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('total')}>
          {translations.total} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatMoney(row.original.total ?? '0.00', row.original.currency?.name)}
        </span>
      ),
    },
    {
      accessorKey: 'paid',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('paid')}>
          {translations.paid} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const paid = row.original.paid;
        return (
          <Badge variant={paid ? 'default' : 'secondary'}>
            {paid ? translations.paidBadge : translations.unpaidBadge}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'market',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('market')}>
          {translations.market} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => (
        <span className="inline-flex gap-1">
          <Badge variant="outline">
            {row.original.market === InvoiceMarket.INTERNAL
              ? translations.marketInternal
              : translations.marketExternal}
          </Badge>
          {row.original.sourceInvoice && (
            <Badge variant="secondary">{translations.mirrorBadge}</Badge>
          )}
        </span>
      ),
    },
    {
      id: 'link',
      header: translations.link,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const link = row.original.link;
        if (!link) return '\u2014';
        return (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(invoice)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(invoice)}
                  className="text-destructive focus:text-destructive"
                >
                  {translations.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
