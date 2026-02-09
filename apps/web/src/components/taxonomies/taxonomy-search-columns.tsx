'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import type { TaxonomyResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';

interface TaxonomySearchColumnsTranslations {
  name: string;
  description: string;
  link: string;
  created: string;
}

interface TaxonomySearchColumnsOptions {
  onSort: (column: string) => void;
  translations: TaxonomySearchColumnsTranslations;
}

export function getTaxonomySearchColumns({ onSort, translations }: TaxonomySearchColumnsOptions): ColumnDef<TaxonomyResponse>[] {
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
      accessorKey: 'description',
      header: translations.description,
      cell: ({ row }) => row.getValue('description') || '-',
    },
    {
      accessorKey: 'link',
      header: translations.link,
      cell: ({ row }) => {
        const link = row.getValue('link') as string | null;
        if (!link) return '-';
        return (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('createdAt')}>
          {translations.created} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
  ];
}
