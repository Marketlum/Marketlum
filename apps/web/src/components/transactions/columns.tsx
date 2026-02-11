'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { TransactionResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionColumnsTranslations {
  fromAccount: string;
  toAccount: string;
  amount: string;
  description: string;
  timestamp: string;
  created: string;
  edit: string;
  delete: string;
}

interface TransactionColumnsOptions {
  onEdit: (tx: TransactionResponse) => void;
  onDelete: (tx: TransactionResponse) => void;
  onSort: (column: string) => void;
  translations: TransactionColumnsTranslations;
}

export function getTransactionColumns({ onEdit, onDelete, onSort, translations }: TransactionColumnsOptions): ColumnDef<TransactionResponse>[] {
  return [
    {
      id: 'fromAccount',
      header: translations.fromAccount,
      cell: ({ row }) => row.original.fromAccount?.name ?? '-',
    },
    {
      id: 'toAccount',
      header: translations.toAccount,
      cell: ({ row }) => row.original.toAccount?.name ?? '-',
    },
    {
      accessorKey: 'amount',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('amount')} className="w-full justify-end">
          {translations.amount} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">{row.original.amount}</div>
      ),
    },
    {
      accessorKey: 'description',
      meta: { hideOnMobile: true },
      header: translations.description,
      cell: ({ row }) => row.getValue('description') || '-',
    },
    {
      accessorKey: 'timestamp',
      meta: { hideOnMobile: true },
      header: () => (
        <Button variant="ghost" onClick={() => onSort('timestamp')}>
          {translations.timestamp} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue('timestamp')).toLocaleString(),
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
        const tx = row.original;
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
                <DropdownMenuItem onClick={() => onEdit(tx)}>{translations.edit}</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(tx)}
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
