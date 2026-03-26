'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ExternalLink, FileIcon, Plus } from 'lucide-react';
import type { AgreementResponse } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface AgreementColumnsTranslations {
  title: string;
  link: string;
  parties: string;
  file: string;
  template: string;
  created: string;
  updatedAt: string;
  edit: string;
  delete: string;
  addChild: string;
}

interface AgreementColumnsOptions {
  onEdit: (agreement: AgreementResponse) => void;
  onDelete: (agreement: AgreementResponse) => void;
  onAddChild: (agreement: AgreementResponse) => void;
  onSort: (column: string) => void;
  translations: AgreementColumnsTranslations;
}

export function getAgreementColumns({
  onEdit,
  onDelete,
  onAddChild,
  onSort,
  translations,
}: AgreementColumnsOptions): ColumnDef<AgreementResponse>[] {
  return [
    {
      accessorKey: 'title',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('title')}>
          {translations.title} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const level = row.original.level ?? 0;
        return (
          <span style={{ paddingLeft: level * 24 }}>
            {row.original.title}
          </span>
        );
      },
    },
    {
      id: 'link',
      header: translations.link,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const link = row.original.link;
        if (!link) return '-';
        return (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={(e) => e.stopPropagation()}>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        );
      },
    },
    {
      id: 'parties',
      header: translations.parties,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const parties = row.original.parties;
        if (!parties || parties.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {parties.map((party) => (
              <Badge key={party.id} variant="outline">{party.name}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'file',
      header: translations.file,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const file = row.original.file;
        if (!file) return '-';
        return <FileIcon className="h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      id: 'template',
      header: translations.template,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const template = row.original.agreementTemplate;
        if (!template) return '-';
        return <Badge variant="outline">{template.name}</Badge>;
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
        const agreement = row.original;
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
                <DropdownMenuItem onClick={() => onAddChild(agreement)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {translations.addChild}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(agreement)}>
                  {translations.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(agreement)}
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
