'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import type { AgentResponse } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentColumnsOptions {
  onEdit: (agent: AgentResponse) => void;
  onDelete: (agent: AgentResponse) => void;
  onSort: (column: string) => void;
}

export function getAgentColumns({ onEdit, onDelete, onSort }: AgentColumnsOptions): ColumnDef<AgentResponse>[] {
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
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <Badge variant="secondary">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.getValue('description') || '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const agent = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(agent)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(agent)}
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
