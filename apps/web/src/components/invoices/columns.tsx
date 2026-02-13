'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvoiceRow {
  id: string;
  number: string;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  issuedAt: string;
  dueAt: string;
  currency: { id: string; name: string } | null;
  total?: string;
  paid: boolean;
  link: string | null;
  file: unknown;
  valueStream: { id: string; name: string } | null;
  items: { id: string; value: { id: string; name: string } | null; valueInstance: { id: string; name: string } | null; quantity: string; unitPrice: string; total: string }[];
  createdAt: string;
  updatedAt: string;
}

interface InvoiceColumnsTranslations {
  number: string;
  from: string;
  to: string;
  issuedAt: string;
  dueAt: string;
  currency: string;
  total: string;
  paid: string;
  paidYes: string;
  paidNo: string;
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
      id: 'fromAgent',
      header: translations.from,
      cell: ({ row }) => row.original.fromAgent?.name ?? '\u2014',
    },
    {
      id: 'toAgent',
      header: translations.to,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.toAgent?.name ?? '\u2014',
    },
    {
      accessorKey: 'issuedAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('issuedAt')}>
          {translations.issuedAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => new Date(row.getValue('issuedAt')).toLocaleDateString(),
    },
    {
      accessorKey: 'dueAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('dueAt')}>
          {translations.dueAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => new Date(row.getValue('dueAt')).toLocaleDateString(),
    },
    {
      id: 'currency',
      header: translations.currency,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.currency?.name ?? '\u2014',
    },
    {
      id: 'total',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('total')}>
          {translations.total} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.total ?? '0.00',
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
            {paid ? translations.paidYes : translations.paidNo}
          </Badge>
        );
      },
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
