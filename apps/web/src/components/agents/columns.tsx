'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { AgentResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  mainTaxonomy: string;
  taxonomies: string;
  created: string;
  edit: string;
  delete: string;
  typeLabels: Record<string, string>;
}

interface AgentColumnsOptions {
  onEdit: (agent: AgentResponse) => void;
  onDelete: (agent: AgentResponse) => void;
  onSort: (column: string) => void;
  translations: AgentColumnsTranslations;
}

export function getAgentColumns({ onEdit, onDelete, onSort, translations }: AgentColumnsOptions): ColumnDef<AgentResponse>[] {
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
      header: translations.mainTaxonomy,
      cell: ({ row }) => {
        const mainTaxonomy = row.original.mainTaxonomy;
        return mainTaxonomy ? <Badge variant="outline">{mainTaxonomy.name}</Badge> : '-';
      },
    },
    {
      id: 'taxonomies',
      meta: { hideOnMobile: true },
      header: translations.taxonomies,
      cell: ({ row }) => {
        const taxonomies = row.original.taxonomies;
        if (!taxonomies || taxonomies.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {taxonomies.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>
        );
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
        const agent = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(agent)}>{translations.edit}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(agent)}
                className="text-destructive focus:text-destructive"
              >
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
