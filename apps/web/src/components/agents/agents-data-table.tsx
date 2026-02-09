'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { AgentResponse, PaginatedResponse, CreateAgentInput } from '@marketlum/shared';
import { AgentType } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility } from '@/lib/column-visibility';
import { AgentFormDialog } from './agent-form-dialog';
import { getAgentColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaxonomyTreeSelect } from '@/components/shared/taxonomy-tree-select';

const typeTranslationKeys: Record<string, string> = {
  [AgentType.ORGANIZATION]: 'typeOrganization',
  [AgentType.INDIVIDUAL]: 'typeIndividual',
  [AgentType.VIRTUAL]: 'typeVirtual',
};

export function AgentsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const { tree } = useTaxonomyTree();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
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
      if (taxonomyFilter && taxonomyFilter !== 'all') {
        qs += `&taxonomyId=${taxonomyFilter}`;
      }
      const result = await api.get<PaginatedResponse<AgentResponse>>(`/agents?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter, taxonomyFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, fetchData]);

  const handleCreate = async (input: CreateAgentInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/agents', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateAgentInput) => {
    if (!editingAgent) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/agents/${editingAgent.id}`, input);
      toast.success(t('updated'));
      setEditingAgent(null);
      fetchData();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agents/${deleteAgent.id}`);
      toast.success(t('deleted'));
      setDeleteAgent(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabels: Record<string, string> = {};
  for (const agentType of Object.values(AgentType)) {
    typeLabels[agentType] = t(typeTranslationKeys[agentType]);
  }

  const columns = getAgentColumns({
    onEdit: (agent) => setEditingAgent(agent),
    onDelete: (agent) => setDeleteAgent(agent),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: tc('type'),
      mainTaxonomy: t('mainTaxonomy'),
      taxonomies: t('taxonomies'),
      purpose: t('purpose'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
      typeLabels,
    },
  });

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createAgent')}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t('allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {Object.values(AgentType).map((agentType) => (
              <SelectItem key={agentType} value={agentType}>
                {t(typeTranslationKeys[agentType])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TaxonomyTreeSelect
          tree={tree}
          value={taxonomyFilter === 'all' ? null : taxonomyFilter}
          onSelect={(id) => setTaxonomyFilter(id ?? 'all')}
          placeholder={t('allTaxonomies')}
          noneLabel={t('allTaxonomies')}
          className="w-[180px]"
        />
      </DataTableToolbar>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={getMobileColumnVisibility(columns, isMobile)} />
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
        title={t('deleteAgent')}
        description={tc('confirmDeleteDescription', { name: deleteAgent?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
