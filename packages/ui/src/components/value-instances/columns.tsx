'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ImageIcon } from 'lucide-react';
import type { ValueInstanceResponse } from '@marketlum/shared';
import { FileImagePreview } from '../shared/file-image-preview';
import { ValueTypeBadge } from '../values/value-type-badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ValueInstanceColumnsTranslations {
  name: string;
  value: string;
  fromAgent: string;
  toAgent: string;
  version: string;
  purpose: string;
  expiresAt: string;
  image: string;
  created: string;
  edit: string;
  delete: string;
  valueTypeLabels: Record<string, string>;
}

interface ValueInstanceColumnsOptions {
  onEdit: (vi: ValueInstanceResponse) => void;
  onDelete: (vi: ValueInstanceResponse) => void;
  onSort: (column: string) => void;
  translations: ValueInstanceColumnsTranslations;
}

export function getValueInstanceColumns({ onEdit, onDelete, onSort, translations }: ValueInstanceColumnsOptions): ColumnDef<ValueInstanceResponse>[] {
  return [
    {
      id: 'image',
      header: translations.image,
      cell: ({ row }) => {
        const image = row.original.image;
        return (
          <div className="h-8 w-8 rounded overflow-hidden bg-muted/30 flex items-center justify-center">
            {image ? (
              <FileImagePreview
                fileId={image.id}
                mimeType={image.mimeType}
                alt={image.originalName}
                iconClassName="h-4 w-4 text-muted-foreground/50"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          {translations.name} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: 'value',
      header: translations.value,
      cell: ({ row }) => {
        const value = row.original.value;
        if (!value) return '-';
        const valueType = (value as any).type as string | undefined;
        return (
          <div className="flex items-center gap-2">
            <span>{value.name}</span>
            {valueType && (
              <ValueTypeBadge type={valueType} label={translations.valueTypeLabels[valueType] ?? valueType} />
            )}
          </div>
        );
      },
    },
    {
      id: 'fromAgent',
      header: translations.fromAgent,
      cell: ({ row }) => row.original.fromAgent?.name ?? '-',
    },
    {
      id: 'toAgent',
      header: translations.toAgent,
      cell: ({ row }) => row.original.toAgent?.name ?? '-',
    },
    {
      accessorKey: 'version',
      meta: { hideOnMobile: true },
      header: translations.version,
      cell: ({ row }) => row.getValue('version') || '-',
    },
    {
      accessorKey: 'purpose',
      meta: { hideOnMobile: true },
      header: translations.purpose,
      cell: ({ row }) => row.getValue('purpose') || '-',
    },
    {
      accessorKey: 'expiresAt',
      meta: { hideOnMobile: true },
      header: translations.expiresAt,
      cell: ({ row }) => {
        const val = row.getValue('expiresAt') as string | null;
        return val ? new Date(val).toLocaleDateString() : '-';
      },
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
        const vi = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(vi)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(vi)}
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
