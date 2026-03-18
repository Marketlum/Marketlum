'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Plus } from 'lucide-react';
import type { AgreementTemplateResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgreementTemplateColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  description: string;
  valueStream: string;
  created: string;
  edit: string;
  delete: string;
  addChild: string;
}

interface AgreementTemplateColumnsOptions {
  onEdit: (template: AgreementTemplateResponse) => void;
  onDelete: (template: AgreementTemplateResponse) => void;
  onAddChild: (template: AgreementTemplateResponse) => void;
  onSort: (column: string) => void;
  translations: AgreementTemplateColumnsTranslations;
  typeLabels: Record<string, string>;
}

export function getAgreementTemplateColumns({
  onEdit,
  onDelete,
  onAddChild,
  onSort,
  translations,
  typeLabels,
}: AgreementTemplateColumnsOptions): ColumnDef<AgreementTemplateResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          {translations.name} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const level = row.original.level ?? 0;
        return (
          <span style={{ paddingLeft: level * 24 }}>
            {row.original.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'type',
      header: translations.type,
      cell: ({ row }) => {
        const type = row.original.type;
        return <Badge variant="outline">{typeLabels[type] ?? type}</Badge>;
      },
    },
    {
      accessorKey: 'purpose',
      header: translations.purpose,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const purpose = row.original.purpose;
        if (!purpose) return '-';
        return <span className="truncate max-w-[200px] block">{purpose}</span>;
      },
    },
    {
      accessorKey: 'description',
      header: translations.description,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const description = row.original.description;
        if (!description) return '-';
        return <span className="truncate max-w-[200px] block">{description}</span>;
      },
    },
    {
      id: 'valueStream',
      header: translations.valueStream,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const vs = row.original.valueStream;
        return vs ? vs.name : '-';
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
      id: 'actions',
      cell: ({ row }) => {
        const template = row.original;
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
                <DropdownMenuItem onClick={() => onAddChild(template)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {translations.addChild}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(template)}
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
