'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ExternalLink, Workflow } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ExchangeRow {
  id: string;
  name: string;
  purpose: string;
  description: string | null;
  valueStream: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  pipeline: { id: string; name: string; color: string } | null;
  state: string;
  openedAt: string;
  completedAt: string | null;
  link: string | null;
  lead: { id: string; name: string } | null;
  parties: { id: string; agent: { id: string; name: string }; role: string }[];
  createdAt: string;
  updatedAt: string;
}

interface ExchangeColumnsTranslations {
  name: string;
  purpose: string;
  state: string;
  channel: string;
  pipeline: string;
  valueStream: string;
  lead: string;
  parties: string;
  openedAt: string;
  completedAt: string;
  link: string;
  edit: string;
  delete: string;
  flows: string;
}

interface ExchangeColumnsOptions {
  onEdit: (exchange: ExchangeRow) => void;
  onDelete: (exchange: ExchangeRow) => void;
  onFlows: (exchange: ExchangeRow) => void;
  onSort: (column: string) => void;
  translations: ExchangeColumnsTranslations;
}

const STATE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  closed: 'secondary',
  completed: 'outline',
};

export function getExchangeColumns({
  onEdit,
  onDelete,
  onFlows,
  onSort,
  translations,
}: ExchangeColumnsOptions): ColumnDef<ExchangeRow>[] {
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
      cell: ({ row }) => {
        const purpose = row.original.purpose;
        return purpose.length > 50 ? `${purpose.slice(0, 50)}...` : purpose;
      },
    },
    {
      accessorKey: 'state',
      header: translations.state,
      cell: ({ row }) => {
        const state = row.original.state;
        return (
          <Badge variant={STATE_VARIANTS[state] ?? 'secondary'}>
            {state}
          </Badge>
        );
      },
    },
    {
      id: 'channel',
      header: translations.channel,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.channel?.name ?? '\u2014',
    },
    {
      id: 'pipeline',
      header: translations.pipeline,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const pipeline = row.original.pipeline;
        if (!pipeline) return '\u2014';
        return (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pipeline.color }} />
            {pipeline.name}
          </span>
        );
      },
    },
    {
      id: 'valueStream',
      header: translations.valueStream,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.valueStream?.name ?? '\u2014',
    },
    {
      id: 'lead',
      header: translations.lead,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.lead?.name ?? '\u2014',
    },
    {
      id: 'parties',
      header: translations.parties,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.parties?.length ?? 0,
    },
    {
      accessorKey: 'openedAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('openedAt')}>
          {translations.openedAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { hideOnMobile: true },
      cell: ({ row }) => new Date(row.getValue('openedAt')).toLocaleDateString(),
    },
    {
      id: 'completedAt',
      header: translations.completedAt,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const completedAt = row.original.completedAt;
        return completedAt ? new Date(completedAt).toLocaleDateString() : '\u2014';
      },
    },
    {
      id: 'link',
      header: translations.link,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const link = row.original.link;
        if (!link) return '\u2014';
        return (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const exchange = row.original;
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
                <DropdownMenuItem onClick={() => onFlows(exchange)}>
                  <Workflow className="mr-2 h-4 w-4" />
                  {translations.flows}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(exchange)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(exchange)}
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
