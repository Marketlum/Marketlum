'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { ExchangeRateResponse } from '@marketlum/shared';
import { invertRate } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface Translations {
  pair: string;
  rate: string;
  inverse: string;
  effectiveAt: string;
  source: string;
  edit: string;
  delete: string;
}

interface ColumnsOptions {
  onEdit: (rate: ExchangeRateResponse) => void;
  onDelete: (rate: ExchangeRateResponse) => void;
  onSort: (column: string) => void;
  translations: Translations;
}

function trimRate(rate: string, digits = 6): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return rate;
  return n.toFixed(digits).replace(/\.?0+$/, '');
}

export function getExchangeRateColumns({
  onEdit,
  onDelete,
  onSort,
  translations,
}: ColumnsOptions): ColumnDef<ExchangeRateResponse>[] {
  return [
    {
      id: 'pair',
      header: translations.pair,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.fromValue.name}{' '}
          <span className="text-muted-foreground">⇄</span>{' '}
          {row.original.toValue.name}
        </span>
      ),
    },
    {
      accessorKey: 'rate',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('rate')}>
          {translations.rate} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
          {trimRate(row.original.rate)}
        </code>
      ),
    },
    {
      id: 'inverse',
      meta: { hideOnMobile: true },
      header: translations.inverse,
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-muted-foreground">
          {trimRate(invertRate(row.original.rate))}
        </code>
      ),
    },
    {
      accessorKey: 'effectiveAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('effectiveAt')}>
          {translations.effectiveAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = new Date(row.original.effectiveAt);
        return <span>{d.toISOString().slice(0, 10)}</span>;
      },
    },
    {
      accessorKey: 'source',
      meta: { hideOnMobile: true },
      header: translations.source,
      cell: ({ row }) => row.original.source ?? '—',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const rate = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rate)}>
                <Pencil className="mr-2 h-4 w-4" />
                {translations.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(rate)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
