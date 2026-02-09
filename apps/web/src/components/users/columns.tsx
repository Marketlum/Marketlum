'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { UserResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserColumnsTranslations {
  name: string;
  email: string;
  created: string;
  edit: string;
  delete: string;
}

interface UserColumnsOptions {
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
  onSort: (column: string) => void;
  translations: UserColumnsTranslations;
}

export function getUserColumns({ onEdit, onDelete, onSort, translations }: UserColumnsOptions): ColumnDef<UserResponse>[] {
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
      accessorKey: 'email',
      meta: { hideOnMobile: true },
      header: () => (
        <Button variant="ghost" onClick={() => onSort('email')}>
          {translations.email} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(user)}>{translations.edit}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(user)}
                className="text-destructive focus:text-destructive"
              >
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
