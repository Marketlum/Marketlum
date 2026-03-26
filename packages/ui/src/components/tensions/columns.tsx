'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Bot } from 'lucide-react';
import type { TensionResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileImagePreview } from '../shared/file-image-preview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface TensionColumnsTranslations {
  name: string;
  agent: string;
  lead: string;
  score: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
}

interface TensionColumnsOptions {
  onEdit: (tension: TensionResponse) => void;
  onDelete: (tension: TensionResponse) => void;
  onSort: (column: string) => void;
  translations: TensionColumnsTranslations;
}

export function getTensionColumns({
  onEdit,
  onDelete,
  onSort,
  translations,
}: TensionColumnsOptions): ColumnDef<TensionResponse>[] {
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
      id: 'agent',
      header: translations.agent,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const agent = row.original.agent;
        if (!agent) return '\u2014';
        return (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 rounded overflow-hidden bg-muted/30 flex items-center justify-center">
              {agent.image ? (
                <FileImagePreview
                  fileId={agent.image.id}
                  mimeType={agent.image.mimeType}
                  alt={agent.image.originalName}
                  iconClassName="h-3 w-3 text-muted-foreground/50"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <Bot className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
            <span>{agent.name}</span>
          </div>
        );
      },
    },
    {
      id: 'lead',
      header: translations.lead,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const lead = row.original.lead;
        return lead ? lead.name : '\u2014';
      },
    },
    {
      accessorKey: 'score',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('score')}>
          {translations.score} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.original.score;
        const variant = score >= 8 ? 'default' : score >= 4 ? 'secondary' : 'outline';
        return <Badge variant={variant}>{score}</Badge>;
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
        const tension = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(tension)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(tension)}
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
