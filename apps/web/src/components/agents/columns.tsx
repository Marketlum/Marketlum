'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ImageIcon } from 'lucide-react';
import type { AgentResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentTypeBadge } from './agent-type-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileImagePreview } from '@/components/shared/file-image-preview';

interface AgentColumnsTranslations {
  name: string;
  type: string;
  purpose: string;
  taxonomy: string;
  image: string;
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
          <AgentTypeBadge type={type} label={translations.typeLabels[type] ?? type} />
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
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={(e) => e.stopPropagation()}>
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
          </div>
        );
      },
    },
  ];
}
