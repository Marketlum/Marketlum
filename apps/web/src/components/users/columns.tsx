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

interface UserColumnsOptions {
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
  onSort: (column: string) => void;
}

export function getUserColumns({ onEdit, onDelete, onSort }: UserColumnsOptions): ColumnDef<UserResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('name')}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'email',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('email')}>
          Email <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
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
              <DropdownMenuItem onClick={() => onEdit(user)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(user)}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
