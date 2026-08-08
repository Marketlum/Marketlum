'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ImageIcon } from 'lucide-react';
import type { ActorResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ActorTypeBadge } from './actor-type-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { FileImagePreview } from '../shared/file-image-preview';

interface ActorColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  taxonomy: string;
  parent: string;
  image: string;
  created: string;
  edit: string;
  delete: string;
  typeLabels: Record<string, string>;
}

interface ActorColumnsOptions {
  onEdit: (actor: ActorResponse) => void;
  onDelete: (actor: ActorResponse) => void;
  onSort: (column: string) => void;
  translations: ActorColumnsTranslations;
}

export function getActorColumns({ onEdit, onDelete, onSort, translations }: ActorColumnsOptions): ColumnDef<ActorResponse>[] {
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
      accessorKey: 'type',
      header: translations.type,
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <ActorTypeBadge type={type} label={translations.typeLabels[type] ?? type} />
        );
      },
    },
    {
      id: 'mainTaxonomy',
      header: translations.taxonomy,
      cell: ({ row }) => {
        const mainTaxonomy = row.original.mainTaxonomy;
        return mainTaxonomy ? <Badge variant="outline">{mainTaxonomy.name}</Badge> : '—';
      },
    },
    {
      id: 'parent',
      header: translations.parent,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const parent = row.original.parent;
        return parent ? parent.name : '—';
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
        const actor = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(actor)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(actor)}
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
