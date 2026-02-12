'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { OfferingResponse, PaginatedResponse, CreateOfferingInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { useAgents } from '@/hooks/use-agents';
import { useValueStreams } from '@/hooks/use-value-streams';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { DataTableFilterSheet } from '@/components/shared/data-table-filter-sheet';
import { ActiveFilters, type ActiveFilter } from '@/components/shared/active-filters';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '@/components/shared/column-visibility-dropdown';
import { PerspectiveSelector } from '@/components/shared/perspective-selector';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '@/lib/column-visibility';
import { OfferingFormDialog } from './offering-form-dialog';
import { getOfferingColumns } from './columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldDef } from '@/lib/export-utils';

export function OfferingsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('offerings');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const { valueStreams } = useValueStreams();
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [valueStreamFilter, setValueStreamFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<OfferingResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<OfferingResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfferingResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setStateFilter(config.filters?.state ?? 'all');
    setAgentFilter(config.filters?.agentId ?? 'all');
    setValueStreamFilter(config.filters?.valueStreamId ?? 'all');
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
    table: 'offerings',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
      ...(agentFilter !== 'all' ? { agentId: agentFilter } : {}),
      ...(valueStreamFilter !== 'all' ? { valueStreamId: valueStreamFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, stateFilter, agentFilter, valueStreamFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (stateFilter && stateFilter !== 'all') qs += `&state=${stateFilter}`;
      if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
      if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
      const result = await api.get<PaginatedResponse<OfferingResponse>>(`/offerings/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, stateFilter, agentFilter, valueStreamFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, stateFilter, agentFilter, valueStreamFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingOffering(null);
    setFormOpen(true);
  };

  const handleOpenEdit = async (offering: OfferingResponse) => {
    try {
      const full = await api.get<OfferingResponse>(`/offerings/${offering.id}`);
      setEditingOffering(full);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateOfferingInput) => {
    setIsSubmitting(true);
    try {
      if (editingOffering) {
        await api.patch(`/offerings/${editingOffering.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/offerings', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditingOffering(null);
      fetchData();
    } catch {
      toast.error(editingOffering ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/offerings/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getOfferingColumns({
    onEdit: handleOpenEdit,
    onDelete: (offering) => setDeleteTarget(offering),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      state: t('state'),
      agent: t('agent'),
      valueStream: t('valueStream'),
      components: t('components'),
      created: tc('created'),
      updatedAt: t('updatedAt'),
      edit: tc('edit'),
      delete: tc('delete'),
      stateDraft: t('stateDraft'),
      stateLive: t('stateLive'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'state', label: t('state') },
    { id: 'agent', label: t('agent') },
    { id: 'valueStream', label: t('valueStream') },
    { id: 'components', label: t('components') },
    { id: 'createdAt', label: tc('created') },
    { id: 'updatedAt', label: t('updatedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'state', label: t('state'), extract: (r) => String(r.state ?? '') },
    { key: 'agent', label: t('agent'), extract: (r) => {
      const agent = r.agent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'valueStream', label: t('valueStream'), extract: (r) => {
      const vs = r.valueStream as { name: string } | null;
      return vs?.name ?? '';
    }},
    { key: 'components', label: t('components'), extract: (r) => {
      const comps = r.components as unknown[] | undefined;
      return String(comps?.length ?? 0);
    }},
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
    { key: 'updatedAt', label: t('updatedAt'), extract: (r) => String(r.updatedAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = 'page=1&limit=10000';
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (stateFilter && stateFilter !== 'all') qs += `&state=${stateFilter}`;
    if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
    if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
    const result = await api.get<PaginatedResponse<OfferingResponse>>(`/offerings/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, stateFilter, agentFilter, valueStreamFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (stateFilter !== 'all') {
      filters.push({
        key: 'state',
        label: t('state'),
        displayValue: stateFilter === 'live' ? t('stateLive') : t('stateDraft'),
        onClear: () => setStateFilter('all'),
      });
    }
    if (agentFilter !== 'all') {
      const agent = agents.find((a) => a.id === agentFilter);
      filters.push({
        key: 'agent',
        label: t('agent'),
        displayValue: agent?.name ?? agentFilter,
        onClear: () => setAgentFilter('all'),
      });
    }
    if (valueStreamFilter !== 'all') {
      const vs = valueStreams.find((v) => v.id === valueStreamFilter);
      filters.push({
        key: 'valueStream',
        label: t('valueStream'),
        displayValue: vs?.name ?? valueStreamFilter,
        onClear: () => setValueStreamFilter('all'),
      });
    }
    return filters;
  }, [stateFilter, agentFilter, valueStreamFilter, agents, valueStreams, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createOffering')}
        filterButton={
          <Button variant="outline" size="sm" onClick={() => setFilterSheetOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {tc('filters')}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        }
      >
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
          filenameBase="offerings"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('state')}</label>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStates')}</SelectItem>
              <SelectItem value="draft">{t('stateDraft')}</SelectItem>
              <SelectItem value="live">{t('stateLive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('agent')}</label>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allAgents')}</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('valueStream')}</label>
          <Select value={valueStreamFilter} onValueChange={setValueStreamFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allValueStreams')}</SelectItem>
              {valueStreams.map((vs) => (
                <SelectItem key={vs.id} value={vs.id}>
                  {vs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} />
          {data && (
            <DataTablePagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              limit={pagination.limit}
              onPageChange={pagination.setPage}
              onLimitChange={pagination.setLimit}
            />
          )}
        </>
      )}

      <OfferingFormDialog
        open={formOpen && !editingOffering}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <OfferingFormDialog
        open={!!editingOffering}
        onOpenChange={(open) => { if (!open) { setEditingOffering(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        offering={editingOffering}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteOffering')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
