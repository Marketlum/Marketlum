'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import type { ValueStreamResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';

interface ValueStreamSearchColumnsTranslations {
  name: string;
  purpose: string;
  lead: string;
  created: string;
}

interface ValueStreamSearchColumnsOptions {
  onSort: (column: string) => void;
  translations: ValueStreamSearchColumnsTranslations;
}

export function getValueStreamSearchColumns({ onSort, translations }: ValueStreamSearchColumnsOptions): ColumnDef<ValueStreamResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          {translations.name} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'purpose',
      meta: { hideOnMobile: true },
      header: translations.purpose,
      cell: ({ row }) => row.getValue('purpose') || '-',
    },
    {
      id: 'lead',
      meta: { hideOnMobile: true },
      header: translations.lead,
      cell: ({ row }) => {
        const vs = row.original;
        return vs.lead?.name ?? '-';
      },
    },
    {
      accessorKey: 'createdAt',
      meta: { hideOnMobile: true },
      header: () => (
        <Button variant="ghost" onClick={() => onSort('createdAt')}>
          {translations.created} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
  ];
}
