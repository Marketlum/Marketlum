'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { ArchetypeResponse } from '@marketlum/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ArchetypeColumnsTranslations {
  name: string;
  purpose: string;
  taxonomies: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
}

interface ArchetypeColumnsOptions {
  onEdit: (archetype: ArchetypeResponse) => void;
  onDelete: (archetype: ArchetypeResponse) => void;
  onSort: (column: string) => void;
  translations: ArchetypeColumnsTranslations;
}

export function getArchetypeColumns({
  onEdit,
  onDelete,
  onSort,
  translations,
}: ArchetypeColumnsOptions): ColumnDef<ArchetypeResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          {translations.name} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'purpose',
      header: translations.purpose,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.purpose ?? '\u2014',
    },
    {
      id: 'taxonomies',
      header: translations.taxonomies,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const taxonomies = row.original.taxonomies ?? [];
        if (taxonomies.length === 0) return '\u2014';
        return (
          <div className="flex flex-wrap gap-1">
            {taxonomies.map((t) => (
              <Badge key={t.id} variant="secondary" className="text-xs">
                {t.name}
              </Badge>
            ))}
          </div>
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
    {
      accessorKey: 'updatedAt',
      meta: { hideOnMobile: true },
      header: () => (
        <Button variant="ghost" onClick={() => onSort('updatedAt')}>
          {translations.updatedAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue('updatedAt')).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const archetype = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(archetype)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(archetype)}
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
