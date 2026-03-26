'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { TensionResponse, PaginatedResponse, CreateTensionInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { useAgents } from '../../hooks/use-agents';
import { useUsers } from '../../hooks/use-users';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { DataTableToolbar } from '../shared/data-table-toolbar';
import { DataTableFilterSheet } from '../shared/data-table-filter-sheet';
import { ActiveFilters, type ActiveFilter } from '../shared/active-filters';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '../shared/column-visibility-dropdown';
import { PerspectiveSelector } from '../shared/perspective-selector';
import { ExportDropdown } from '../shared/export-dropdown';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '../../lib/column-visibility';
import { TensionFormDialog } from './tension-form-dialog';
import { getTensionColumns } from './columns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { FieldDef } from '../../lib/export-utils';

export function TensionsDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('tensions');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const { users } = useUsers();
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<TensionResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTension, setEditingTension] = useState<TensionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TensionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setAgentFilter(config.filters?.agentId ?? 'all');
    setLeadFilter(config.filters?.leadUserId ?? 'all');
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
    table: 'tensions',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(agentFilter !== 'all' ? { agentId: agentFilter } : {}),
      ...(leadFilter !== 'all' ? { leadUserId: leadFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, agentFilter, leadFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
      if (leadFilter && leadFilter !== 'all') qs += `&leadUserId=${leadFilter}`;
      const result = await api.get<PaginatedResponse<TensionResponse>>(`/tensions/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, agentFilter, leadFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, agentFilter, leadFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingTension(null);
    setFormOpen(true);
  };

  const handleOpenEdit = async (tension: TensionResponse) => {
    try {
      const full = await api.get<TensionResponse>(`/tensions/${tension.id}`);
      setEditingTension(full);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateTensionInput) => {
    setIsSubmitting(true);
    try {
      if (editingTension) {
        await api.patch(`/tensions/${editingTension.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/tensions', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditingTension(null);
      fetchData();
    } catch {
      toast.error(editingTension ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/tensions/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getTensionColumns({
    onEdit: handleOpenEdit,
    onDelete: (tension) => setDeleteTarget(tension),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      agent: t('agent'),
      lead: t('lead'),
      score: t('score'),
      created: tc('created'),
      updatedAt: t('updatedAt'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'agent', label: t('agent') },
    { id: 'lead', label: t('lead') },
    { id: 'score', label: t('score') },
    { id: 'createdAt', label: tc('created') },
    { id: 'updatedAt', label: t('updatedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'agent', label: t('agent'), extract: (r) => {
      const agent = r.agent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'lead', label: t('lead'), extract: (r) => {
      const lead = r.lead as { name: string } | null;
      return lead?.name ?? '';
    }},
    { key: 'score', label: t('score'), extract: (r) => String(r.score ?? '') },
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
    if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
    if (leadFilter && leadFilter !== 'all') qs += `&leadUserId=${leadFilter}`;
    const result = await api.get<PaginatedResponse<TensionResponse>>(`/tensions/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, agentFilter, leadFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (agentFilter !== 'all') {
      const agent = agents.find((a) => a.id === agentFilter);
      filters.push({
        key: 'agent',
        label: t('agent'),
        displayValue: agent?.name ?? agentFilter,
        onClear: () => setAgentFilter('all'),
      });
    }
    if (leadFilter !== 'all') {
      const user = users.find((u) => u.id === leadFilter);
      filters.push({
        key: 'lead',
        label: t('lead'),
        displayValue: user?.name ?? leadFilter,
        onClear: () => setLeadFilter('all'),
      });
    }
    return filters;
  }, [agentFilter, leadFilter, agents, users, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createTension')}
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
          filenameBase="tensions"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
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
          <label className="text-sm font-medium">{t('lead')}</label>
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allUsers')}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
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
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(tension) => router.push(`/admin/tensions/${tension.id}`)} />
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

      <TensionFormDialog
        open={formOpen && !editingTension}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        agents={agents}
        users={users}
      />

      <TensionFormDialog
        open={!!editingTension}
        onOpenChange={(open) => { if (!open) { setEditingTension(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        tension={editingTension}
        isSubmitting={isSubmitting}
        agents={agents}
        users={users}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteTension')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
