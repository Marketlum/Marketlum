'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Trash2 } from 'lucide-react';
import type { LocaleResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface LocaleColumnsTranslations {
  code: string;
  language: string;
  region: string;
  delete: string;
}

interface LocaleColumnsOptions {
  onDelete: (locale: LocaleResponse) => void;
  onSort: (column: string) => void;
  translations: LocaleColumnsTranslations;
}

function getLanguageName(code: string): string {
  try {
    const locale = new Intl.Locale(code);
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayNames.of(locale.language) ?? code;
  } catch {
    return code;
  }
}

function getRegionName(code: string): string {
  try {
    const locale = new Intl.Locale(code);
    if (!locale.region) return '';
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(locale.region) ?? '';
  } catch {
    return '';
  }
}

export function getLocaleColumns({ onDelete, onSort, translations }: LocaleColumnsOptions): ColumnDef<LocaleResponse>[] {
  return [
    {
      accessorKey: 'code',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('code')}>
          {translations.code} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{row.getValue('code')}</code>
      ),
    },
    {
      id: 'language',
      header: translations.language,
      cell: ({ row }) => getLanguageName(row.original.code),
    },
    {
      id: 'region',
      meta: { hideOnMobile: true },
      header: translations.region,
      cell: ({ row }) => getRegionName(row.original.code),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const locale = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onDelete(locale)}
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
