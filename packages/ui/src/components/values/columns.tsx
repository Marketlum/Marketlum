'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ImageIcon, Check, Folder } from 'lucide-react';
import type { ValueResponse } from '@marketlum/shared';
import { FileImagePreview } from '../shared/file-image-preview';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ValueTypeBadge } from './value-type-badge';
import { ValueLifecycleBadge } from './value-lifecycle-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ValueColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  taxonomy: string;
  agent: string;
  valueStream: string;
  abstract: string;
  lifecycleStage: string;
  lifecycleStageLabels: Record<string, string>;
  image: string;
  created: string;
  edit: string;
  duplicate: string;
  delete: string;
  typeLabels: Record<string, string>;
}

interface ValueColumnsOptions {
  onEdit: (value: ValueResponse) => void;
  onDuplicate: (value: ValueResponse) => void;
  onDelete: (value: ValueResponse) => void;
  onSort: (column: string) => void;
  translations: ValueColumnsTranslations;
}

export function getValueColumns({ onEdit, onDuplicate, onDelete, onSort, translations }: ValueColumnsOptions): ColumnDef<ValueResponse>[] {
  return [
    {
      id: 'image',
      header: translations.image,
      cell: ({ row }) => {
        const image = (row.original as any).images?.[0];
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
          <ValueTypeBadge type={type} label={translations.typeLabels[type] ?? type} />
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
      id: 'valueStream',
      header: translations.valueStream,
      cell: ({ row }) => {
        const vs = (row.original as any).valueStream;
        if (!vs) return '-';
        return (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 rounded overflow-hidden bg-muted/30 flex items-center justify-center">
              {vs.image ? (
                <FileImagePreview
                  fileId={vs.image.id}
                  mimeType={vs.image.mimeType}
                  alt={vs.name}
                  iconClassName="h-3 w-3 text-muted-foreground/50"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <Folder className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
            <span>{vs.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'abstract',
      header: translations.abstract,
      cell: ({ row }) => {
        return row.original.abstract ? <Check className="h-4 w-4 text-muted-foreground" /> : '-';
      },
    },
    {
      id: 'lifecycleStage',
      header: translations.lifecycleStage,
      cell: ({ row }) => {
        const stage = row.original.lifecycleStage;
        if (!stage) return '-';
        return <ValueLifecycleBadge stage={stage} label={translations.lifecycleStageLabels[stage] ?? stage} />;
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
                <DropdownMenuItem onClick={() => onDuplicate(value)}>{translations.duplicate}</DropdownMenuItem>
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
