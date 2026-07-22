'use client';

import { ColumnDef } from '@tanstack/react-table';
import { OrderState } from '@marketlum/shared';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface OrderRow {
  id: string;
  number: string;
  state: OrderState;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  currency: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  pipeline: { id: string; name: string } | null;
  locale: { id: string; code: string } | null;
  total?: string;
  placedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function orderStateBadgeVariant(
  state: OrderState,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (state) {
    case OrderState.DRAFT:
      return 'outline';
    case OrderState.NEW:
      return 'secondary';
    case OrderState.PROCESSING:
      return 'default';
    case OrderState.COMPLETED:
      return 'default';
    case OrderState.CANCELLED:
      return 'destructive';
  }
}

interface OrderColumnsTranslations {
  number: string;
  state: string;
  stateLabels: Record<OrderState, string>;
  from: string;
  to: string;
  total: string;
  currency: string;
  channel: string;
  pipeline: string;
  placedAt: string;
  delete: string;
}

interface OrderColumnsOptions {
  onDelete: (order: OrderRow) => void;
  onSort: (column: string) => void;
  translations: OrderColumnsTranslations;
  /** Hide the agent columns when the table is scoped to one agent. */
  hideAgentColumns?: boolean;
}

export function getOrderColumns({
  onDelete,
  onSort,
  translations,
  hideAgentColumns,
}: OrderColumnsOptions): ColumnDef<OrderRow>[] {
  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: 'number',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('number')}>
          {translations.number} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
    },
    {
      accessorKey: 'state',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('state')}>
          {translations.state} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={orderStateBadgeVariant(row.original.state)}>
          {translations.stateLabels[row.original.state]}
        </Badge>
      ),
    },
  ];

  if (!hideAgentColumns) {
    columns.push(
      {
        id: 'fromAgent',
        header: translations.from,
        cell: ({ row }) => row.original.fromAgent?.name ?? '—',
      },
      {
        id: 'toAgent',
        header: translations.to,
        cell: ({ row }) => row.original.toAgent?.name ?? '—',
      },
    );
  }

  columns.push(
    {
      id: 'total',
      header: translations.total,
      cell: ({ row }) => {
        const total = row.original.total ?? '0.00';
        const currency = row.original.currency?.name;
        return currency ? `${total} ${currency}` : total;
      },
      meta: { hideOnMobile: true },
    },
    {
      id: 'channel',
      header: translations.channel,
      cell: ({ row }) => row.original.channel?.name ?? '—',
      meta: { hideOnMobile: true },
    },
    {
      id: 'pipeline',
      header: translations.pipeline,
      cell: ({ row }) => row.original.pipeline?.name ?? '—',
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: 'placedAt',
      header: () => (
        <Button variant="ghost" onClick={() => onSort('placedAt')}>
          {translations.placedAt} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.placedAt
          ? new Date(row.original.placedAt).toLocaleDateString()
          : '—',
      meta: { hideOnMobile: true },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        const deletable =
          order.state === OrderState.DRAFT || order.state === OrderState.CANCELLED;
        if (!deletable) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(order);
                }}
              >
                {translations.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  );

  return columns;
}
