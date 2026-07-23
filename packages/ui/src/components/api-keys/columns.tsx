'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import type { ApiKeySummary } from '@marketlum/shared';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ApiKeyColumnsTranslations {
  name: string;
  key: string;
  lastUsed: string;
  expires: string;
  created: string;
  never: string;
  expired: string;
  delete: string;
}

interface ApiKeyColumnsOptions {
  onDelete: (apiKey: ApiKeySummary) => void;
  translations: ApiKeyColumnsTranslations;
}

function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

function isExpired(apiKey: ApiKeySummary): boolean {
  return !!apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now();
}

export function getApiKeyColumns({ onDelete, translations }: ApiKeyColumnsOptions): ColumnDef<ApiKeySummary>[] {
  return [
    {
      accessorKey: 'name',
      header: translations.name,
      cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'prefix',
      header: translations.key,
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{row.original.prefix}&hellip;</code>
      ),
    },
    {
      accessorKey: 'lastUsedAt',
      meta: { hideOnMobile: true },
      header: translations.lastUsed,
      cell: ({ row }) =>
        row.original.lastUsedAt ? formatRelative(row.original.lastUsedAt) : '—',
    },
    {
      accessorKey: 'expiresAt',
      meta: { hideOnMobile: true },
      header: translations.expires,
      cell: ({ row }) => {
        if (!row.original.expiresAt) return translations.never;
        if (isExpired(row.original)) {
          return <Badge variant="destructive">{translations.expired}</Badge>;
        }
        return new Date(row.original.expiresAt).toLocaleDateString();
      },
    },
    {
      accessorKey: 'createdAt',
      meta: { hideOnMobile: true },
      header: translations.created,
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const apiKey = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onDelete(apiKey)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
