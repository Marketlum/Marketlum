'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { ValueResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ValueColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  taxonomy: string;
  agent: string;
  created: string;
  edit: string;
  delete: string;
  typeLabels: Record<string, string>;
}

interface ValueColumnsOptions {
  onEdit: (value: ValueResponse) => void;
  onDelete: (value: ValueResponse) => void;
  onSort: (column: string) => void;
  translations: ValueColumnsTranslations;
}

export function getValueColumns({ onEdit, onDelete, onSort, translations }: ValueColumnsOptions): ColumnDef<ValueResponse>[] {
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
      accessorKey: 'type',
      header: translations.type,
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge variant="secondary">
            {translations.typeLabels[type] ?? type}
          </Badge>
        );
      },
    },
    {
      id: 'mainTaxonomy',
      header: translations.taxonomy,
      cell: ({ row }) => {
        const mainTaxonomy = row.original.mainTaxonomy;
        return mainTaxonomy ? <Badge variant="outline">{mainTaxonomy.name}</Badge> : '-';
      },
    },
    {
      id: 'agent',
      header: translations.agent,
      cell: ({ row }) => {
        const agent = row.original.agent;
        return agent ? agent.name : '-';
      },
    },
    {
      accessorKey: 'purpose',
      meta: { hideOnMobile: true },
      header: translations.purpose,
      cell: ({ row }) => row.getValue('purpose') || '-',
    },
    {
      accessorKey: 'createdAt',
      meta: { hideOnMobile: true },
      header: translations.created,
      cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const value = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(value)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(value)}
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
