'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { AccountResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface AccountColumnsTranslations {
  name: string;
  value: string;
  agent: string;
  balance: string;
  description: string;
  created: string;
  edit: string;
  delete: string;
}

interface AccountColumnsOptions {
  onEdit: (account: AccountResponse) => void;
  onDelete: (account: AccountResponse) => void;
  onSort: (column: string) => void;
  translations: AccountColumnsTranslations;
}

export function getAccountColumns({ onEdit, onDelete, onSort, translations }: AccountColumnsOptions): ColumnDef<AccountResponse>[] {
  return [
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
      cell: ({ row }) => row.original.value?.name ?? '-',
    },
    {
      id: 'agent',
      header: translations.agent,
      cell: ({ row }) => row.original.agent?.name ?? '-',
    },
    {
      accessorKey: 'balance',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('balance')} className="w-full justify-end">
          {translations.balance} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.original.balance}</div>
      ),
    },
    {
      accessorKey: 'description',
      meta: { hideOnMobile: true },
      header: translations.description,
      cell: ({ row }) => row.getValue('description') || '-',
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
        const account = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(account)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(account)}
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
