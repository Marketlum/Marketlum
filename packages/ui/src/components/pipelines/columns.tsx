'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Copy } from 'lucide-react';
import type { PipelineResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface PipelineColumnsTranslations {
  name: string;
  purpose: string;
  color: string;
  valueStream: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
  duplicate: string;
}

interface PipelineColumnsOptions {
  onEdit: (pipeline: PipelineResponse) => void;
  onDelete: (pipeline: PipelineResponse) => void;
  onDuplicate: (pipeline: PipelineResponse) => void;
  onSort: (column: string) => void;
  translations: PipelineColumnsTranslations;
}

export function getPipelineColumns({ onEdit, onDelete, onDuplicate, onSort, translations }: PipelineColumnsOptions): ColumnDef<PipelineResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          {translations.name} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.original.color }}
          />
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: 'purpose',
      meta: { hideOnMobile: true },
      header: translations.purpose,
      cell: ({ row }) => row.original.purpose || '-',
    },
    {
      id: 'valueStream',
      meta: { hideOnMobile: true },
      header: translations.valueStream,
      cell: ({ row }) => row.original.valueStream?.name ?? '-',
    },
    {
      accessorKey: 'createdAt',
      meta: { hideOnMobile: true },
      header: translations.created,
      cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
    {
      accessorKey: 'updatedAt',
      meta: { hideOnMobile: true },
      header: translations.updatedAt,
      cell: ({ row }) => new Date(row.getValue('updatedAt')).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const pipeline = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(pipeline)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(pipeline)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {translations.duplicate}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(pipeline)}
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
