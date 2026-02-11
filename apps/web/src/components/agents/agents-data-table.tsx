'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { AgentResponse, PaginatedResponse, CreateAgentInput, PerspectiveConfig } from '@marketlum/shared';
import { AgentType } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '@/components/shared/column-visibility-dropdown';
import { PerspectiveSelector } from '@/components/shared/perspective-selector';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '@/lib/column-visibility';
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
import { ExportDropdown } from '@/components/shared/export-dropdown';
import type { FieldDef } from '@/lib/export-utils';

const typeTranslationKeys: Record<string, string> = {
  [AgentType.ORGANIZATION]: 'typeOrganization',
  [AgentType.INDIVIDUAL]: 'typeIndividual',
  [AgentType.VIRTUAL]: 'typeVirtual',
};

export function AgentsDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { tree } = useTaxonomyTree();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<AgentResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<AgentResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setTypeFilter(config.filters?.type ?? 'all');
    setTaxonomyFilter(config.filters?.taxonomyId ?? 'all');
    if (config.sort) {
      pagination.setSortDirect(config.sort.sortBy, config.sort.sortOrder);
    } else {
      pagination.setSortDirect('', 'ASC');
    }
  }, [pagination.setSortDirect]);

  const perspectiveTranslations = {
    saved: tp('saved'),
    updated: tp('updated'),
    deleted: tp('deleted'),
    failedToLoad: tp('failedToLoad'),
    failedToSave: tp('failedToSave'),
    failedToUpdate: tp('failedToUpdate'),
    failedToDelete: tp('failedToDelete'),
  };

  const {
    perspectives,
    activePerspectiveId,
    selectPerspective,
    savePerspective,
    updatePerspective,
    deletePerspective,
    resetPerspective,
  } = usePerspectives({
    table: 'agents',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(taxonomyFilter !== 'all' ? { taxonomyId: taxonomyFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, typeFilter, taxonomyFilter, pagination.sortBy, pagination.sortOrder]);

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
      taxonomy: t('taxonomy'),
      image: t('image'),
      purpose: t('purpose'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
      typeLabels,
    },
  });

  const columnMeta = [
    { id: 'image', label: t('image') },
    { id: 'name', label: tc('name') },
    { id: 'type', label: tc('type') },
    { id: 'mainTaxonomy', label: t('taxonomy') },
    { id: 'purpose', label: t('purpose') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'type', label: tc('type'), extract: (r) => String(r.type ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'mainTaxonomy', label: t('taxonomy'), extract: (r) => {
      const mt = r.mainTaxonomy as { name?: string } | null;
      return mt?.name ?? '';
    }},
    { key: 'taxonomies', label: t('taxonomies'), extract: (r) => {
      const taxs = r.taxonomies as { name: string }[] | undefined;
      return taxs?.map((tx) => tx.name).join(', ') ?? '';
    }},
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
    { key: 'updatedAt', label: t('updatedAt'), extract: (r) => String(r.updatedAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = `page=1&limit=10000`;
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (typeFilter && typeFilter !== 'all') qs += `&type=${typeFilter}`;
    if (taxonomyFilter && taxonomyFilter !== 'all') qs += `&taxonomyId=${taxonomyFilter}`;
    const result = await api.get<PaginatedResponse<AgentResponse>>(`/agents?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

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
        <ColumnVisibilityDropdown
          columns={columnMeta}
          visibility={columnVisibility}
          onVisibilityChange={(id, visible) =>
            setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
          }
          label={tp('columns')}
        />
        <PerspectiveSelector
          perspectives={perspectives}
          activePerspectiveId={activePerspectiveId}
          onSelect={selectPerspective}
          onSave={savePerspective}
          onUpdate={updatePerspective}
          onDelete={deletePerspective}
          onReset={resetPerspective}
          getCurrentConfig={getCurrentConfig}
          translations={{
            perspectives: tp('perspectives'),
            savePerspective: tp('savePerspective'),
            updatePerspective: tp('updatePerspective'),
            deletePerspective: tp('deletePerspective'),
            setAsDefault: tp('setAsDefault'),
            removeDefault: tp('removeDefault'),
            reset: tp('reset'),
            namePlaceholder: tp('namePlaceholder'),
            noPerspectives: tp('noPerspectives'),
          }}
        />
        <ExportDropdown
          visibleData={(data?.data ?? []) as unknown as Record<string, unknown>[]}
          fetchAllData={fetchAllData}
          fields={allExportFields}
          visibleFields={visibleExportFields}
          filenameBase="agents"
        />
      </DataTableToolbar>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(agent) => router.push(`/app/agents/${agent.id}`)} />
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
