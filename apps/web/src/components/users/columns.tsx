'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, User } from 'lucide-react';
import type { UserResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileImagePreview } from '@/components/shared/file-image-preview';

interface UserColumnsTranslations {
  avatar: string;
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
      id: 'avatar',
      header: translations.avatar,
      cell: ({ row }) => {
        const avatar = row.original.avatar;
        return (
          <div className="h-8 w-8 rounded-full overflow-hidden bg-muted/30 flex items-center justify-center">
            {avatar ? (
              <FileImagePreview
                fileId={avatar.id}
                mimeType={avatar.mimeType}
                alt={avatar.originalName}
                iconClassName="h-4 w-4 text-muted-foreground/50"
                imgClassName="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-muted-foreground/50" />
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
