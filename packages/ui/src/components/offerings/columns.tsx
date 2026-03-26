'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { OfferingResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface OfferingColumnsTranslations {
  name: string;
  state: string;
  agent: string;
  valueStream: string;
  components: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
  stateDraft: string;
  stateLive: string;
}

interface OfferingColumnsOptions {
  onEdit: (offering: OfferingResponse) => void;
  onDelete: (offering: OfferingResponse) => void;
  onSort: (column: string) => void;
  translations: OfferingColumnsTranslations;
}

export function getOfferingColumns({
  onEdit,
  onDelete,
  onSort,
  translations,
}: OfferingColumnsOptions): ColumnDef<OfferingResponse>[] {
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
      accessorKey: 'state',
      header: translations.state,
      cell: ({ row }) => {
        const state = row.original.state;
        return (
          <Badge variant={state === 'live' ? 'default' : 'secondary'}>
            {state === 'live' ? translations.stateLive : translations.stateDraft}
          </Badge>
        );
      },
    },
    {
      id: 'agent',
      header: translations.agent,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const agent = row.original.agent;
        return agent ? agent.name : '\u2014';
      },
    },
    {
      id: 'valueStream',
      header: translations.valueStream,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const vs = row.original.valueStream;
        return vs ? vs.name : '\u2014';
      },
    },
    {
      id: 'components',
      header: translations.components,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const count = row.original.components?.length ?? 0;
        return count;
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
        const offering = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(offering)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(offering)}
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
