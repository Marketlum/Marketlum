'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { AgentResponse, PaginatedResponse, CreateAgentInput } from '@marketlum/shared';
import { AgentType } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { AgentFormDialog } from './agent-form-dialog';
import { getAgentColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AgentsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [data, setData] = useState<PaginatedResponse<AgentResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<AgentResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (typeFilter && typeFilter !== 'all') {
        qs += `&type=${typeFilter}`;
      }
      const result = await api.get<PaginatedResponse<AgentResponse>>(`/agents?${qs}`);
      setData(result);
    } catch {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, typeFilter, fetchData]);

  const handleCreate = async (input: CreateAgentInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/agents', input);
      toast.success('Agent created');
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateAgentInput) => {
    if (!editingAgent) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/agents/${editingAgent.id}`, input);
      toast.success('Agent updated');
      setEditingAgent(null);
      fetchData();
    } catch {
      toast.error('Failed to update agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agents/${deleteAgent.id}`);
      toast.success('Agent deleted');
      setDeleteAgent(null);
      fetchData();
    } catch {
      toast.error('Failed to delete agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getAgentColumns({
    onEdit: (agent) => setEditingAgent(agent),
    onDelete: (agent) => setDeleteAgent(agent),
    onSort: pagination.setSort,
  });

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel="Create Agent"
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.values(AgentType).map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableToolbar>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">Loading...</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} />
          {data && (
            <DataTablePagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={pagination.setPage}
            />
          )}
        </>
      )}

      <AgentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <AgentFormDialog
        open={!!editingAgent}
        onOpenChange={(open) => !open && setEditingAgent(null)}
        onSubmit={handleEdit}
        agent={editingAgent}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteAgent}
        onOpenChange={(open) => !open && setDeleteAgent(null)}
        onConfirm={handleDelete}
        title="Delete Agent"
        description={`Are you sure you want to delete "${deleteAgent?.name}"? This action cannot be undone.`}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
