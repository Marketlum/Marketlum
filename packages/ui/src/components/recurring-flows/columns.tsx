'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import type { RecurringFlowResponse } from '@marketlum/shared';
import { RecurringFlowDirection, RecurringFlowStatus } from '@marketlum/shared';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatFrequency } from '@marketlum/shared';

interface RecurringFlowColumnsTranslations {
  direction: string;
  counterparty: string;
  value: string;
  description: string;
  amount: string;
  inBase: string;
  noRate: string;
  frequency: string;
  startDate: string;
  status: string;
  valueStream: string;
  edit: string;
  delete: string;
  activate: string;
  pause: string;
  resume: string;
  end: string;
  statusDraft: string;
  statusActive: string;
  statusPaused: string;
  statusEnded: string;
}

interface RecurringFlowColumnsOptions {
  onEdit: (flow: RecurringFlowResponse) => void;
  onDelete: (flow: RecurringFlowResponse) => void;
  onTransition: (flow: RecurringFlowResponse, action: 'activate' | 'pause' | 'resume' | 'end') => void;
  onSort: (column: string) => void;
  translations: RecurringFlowColumnsTranslations;
  showValueStreamColumn?: boolean;
}

function statusBadgeVariant(status: RecurringFlowStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case RecurringFlowStatus.ACTIVE:
      return 'default';
    case RecurringFlowStatus.PAUSED:
      return 'outline';
    case RecurringFlowStatus.ENDED:
      return 'destructive';
    default:
      return 'secondary';
  }
}

function statusLabel(status: RecurringFlowStatus, t: RecurringFlowColumnsTranslations): string {
  switch (status) {
    case RecurringFlowStatus.ACTIVE:
      return t.statusActive;
    case RecurringFlowStatus.PAUSED:
      return t.statusPaused;
    case RecurringFlowStatus.ENDED:
      return t.statusEnded;
    default:
      return t.statusDraft;
  }
}

function legalTransitions(status: RecurringFlowStatus): ('activate' | 'pause' | 'resume' | 'end')[] {
  switch (status) {
    case RecurringFlowStatus.DRAFT:
      return ['activate'];
    case RecurringFlowStatus.ACTIVE:
      return ['pause', 'end'];
    case RecurringFlowStatus.PAUSED:
      return ['resume', 'end'];
    case RecurringFlowStatus.ENDED:
    default:
      return [];
  }
}

export function getRecurringFlowColumns({
  onEdit,
  onDelete,
  onTransition,
  onSort,
  translations,
  showValueStreamColumn = false,
}: RecurringFlowColumnsOptions): ColumnDef<RecurringFlowResponse>[] {
  const columns: ColumnDef<RecurringFlowResponse>[] = [
    {
      id: 'direction',
      header: translations.direction,
      cell: ({ row }) => {
        const d = row.original.direction;
        return d === RecurringFlowDirection.INBOUND ? (
          <ArrowDown className="h-4 w-4 text-emerald-500" aria-label="inbound" />
        ) : (
          <ArrowUp className="h-4 w-4 text-red-500" aria-label="outbound" />
        );
      },
    },
    {
      id: 'counterparty',
      header: translations.counterparty,
      cell: ({ row }) => row.original.counterpartyAgent?.name ?? '—',
    },
    {
      id: 'value',
      header: translations.value,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.value?.name ?? '—',
    },
    {
      id: 'description',
      header: translations.description,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.description ?? '',
    },
    {
      accessorKey: 'amount',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('amount')}>
          {translations.amount} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `${Number(row.original.amount).toFixed(2)} ${row.original.unit}`,
    },
    {
      id: 'baseAmount',
      header: translations.inBase,
      meta: { hideOnMobile: true },
      cell: ({ row }) => {
        const baseAmount = row.original.baseAmount;
        if (baseAmount == null) {
          return <span className="text-muted-foreground italic" title={translations.noRate}>—</span>;
        }
        return <span className="text-muted-foreground">≈ {baseAmount}</span>;
      },
    },
    {
      id: 'frequency',
      header: translations.frequency,
      meta: { hideOnMobile: true },
      cell: ({ row }) => formatFrequency(row.original.frequency, row.original.interval),
    },
    {
      accessorKey: 'startDate',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('startDate')}>
          {translations.startDate} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.startDate,
    },
    {
      id: 'status',
      header: translations.status,
      cell: ({ row }) => (
        <Badge variant={statusBadgeVariant(row.original.status)}>
          {statusLabel(row.original.status, translations)}
        </Badge>
      ),
    },
  ];

  if (showValueStreamColumn) {
    columns.push({
      id: 'valueStream',
      header: translations.valueStream,
      meta: { hideOnMobile: true },
      cell: ({ row }) => row.original.valueStream?.name ?? '—',
    });
  }

  columns.push({
    id: 'actions',
    cell: ({ row }) => {
      const flow = row.original;
      const transitions = legalTransitions(flow.status);
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
              <DropdownMenuItem onClick={() => onEdit(flow)}>{translations.edit}</DropdownMenuItem>
              {transitions.length > 0 && <DropdownMenuSeparator />}
              {transitions.includes('activate') && (
                <DropdownMenuItem onClick={() => onTransition(flow, 'activate')}>
                  {translations.activate}
                </DropdownMenuItem>
              )}
              {transitions.includes('pause') && (
                <DropdownMenuItem onClick={() => onTransition(flow, 'pause')}>
                  {translations.pause}
                </DropdownMenuItem>
              )}
              {transitions.includes('resume') && (
                <DropdownMenuItem onClick={() => onTransition(flow, 'resume')}>
                  {translations.resume}
                </DropdownMenuItem>
              )}
              {transitions.includes('end') && (
                <DropdownMenuItem onClick={() => onTransition(flow, 'end')}>
                  {translations.end}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(flow)}
                className="text-destructive focus:text-destructive"
                disabled={flow.status !== RecurringFlowStatus.DRAFT}
              >
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  });

  return columns;
}
