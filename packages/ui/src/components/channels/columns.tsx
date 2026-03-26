'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Plus } from 'lucide-react';
import type { ChannelResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ChannelColumnsTranslations {
  name: string;
  purpose: string;
  color: string;
  agent: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
  addChild: string;
}

interface ChannelColumnsOptions {
  onEdit: (channel: ChannelResponse) => void;
  onDelete: (channel: ChannelResponse) => void;
  onAddChild: (channel: ChannelResponse) => void;
  onSort: (column: string) => void;
  translations: ChannelColumnsTranslations;
}

export function getChannelColumns({
  onEdit,
  onDelete,
  onAddChild,
  onSort,
  translations,
}: ChannelColumnsOptions): ColumnDef<ChannelResponse>[] {
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
      id: 'color',
      header: translations.color,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const color = row.original.color;
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded border"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted-foreground">{color}</span>
          </div>
        );
      },
    },
    {
      id: 'agent',
      header: translations.agent,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const agent = row.original.agent;
        return agent ? agent.name : '-';
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
        const channel = row.original;
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
                <DropdownMenuItem onClick={() => onAddChild(channel)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {translations.addChild}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(channel)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(channel)}
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
