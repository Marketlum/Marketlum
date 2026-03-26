'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { ChannelResponse, PaginatedResponse, CreateChannelInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { useAgents } from '../../hooks/use-agents';
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
import { ChannelFormDialog } from './channel-form-dialog';
import { getChannelColumns } from './columns';
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

export function ChannelsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ChannelResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelResponse | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChannelResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setAgentFilter(config.filters?.agentId ?? 'all');
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
    table: 'channels',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(agentFilter !== 'all' ? { agentId: agentFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, agentFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (agentFilter && agentFilter !== 'all') {
        qs += `&agentId=${agentFilter}`;
      }
      const result = await api.get<PaginatedResponse<ChannelResponse>>(`/channels/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, agentFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, agentFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingChannel(null);
    setParentId(null);
    setFormOpen(true);
  };

  const handleOpenAddChild = (channel: ChannelResponse) => {
    setEditingChannel(null);
    setParentId(channel.id);
    setFormOpen(true);
  };

  const handleOpenEdit = async (channel: ChannelResponse) => {
    try {
      const full = await api.get<ChannelResponse>(`/channels/${channel.id}`);
      setEditingChannel(full);
      setParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateChannelInput) => {
    setIsSubmitting(true);
    try {
      if (editingChannel) {
        await api.patch(`/channels/${editingChannel.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/channels', input);
        toast.success(parentId ? t('created') : t('rootCreated'));
      }
      setFormOpen(false);
      setEditingChannel(null);
      fetchData();
    } catch {
      toast.error(editingChannel ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/channels/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getChannelColumns({
    onEdit: handleOpenEdit,
    onDelete: (channel) => setDeleteTarget(channel),
    onAddChild: handleOpenAddChild,
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      purpose: t('purpose'),
      color: t('color'),
      agent: t('agent'),
      created: tc('created'),
      updatedAt: t('updatedAt'),
      edit: tc('edit'),
      delete: tc('delete'),
      addChild: t('addChild'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'purpose', label: t('purpose') },
    { id: 'color', label: t('color') },
    { id: 'agent', label: t('agent') },
    { id: 'createdAt', label: tc('created') },
    { id: 'updatedAt', label: t('updatedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'color', label: t('color'), extract: (r) => String(r.color ?? '') },
    { key: 'agent', label: t('agent'), extract: (r) => {
      const agent = r.agent as { name: string } | null | undefined;
      return agent?.name ?? '';
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
    if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
    const result = await api.get<PaginatedResponse<ChannelResponse>>(`/channels/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, agentFilter]);

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
    return filters;
  }, [agentFilter, agents, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createChannel')}
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
          filenameBase="channels"
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

      <ChannelFormDialog
        open={formOpen && !editingChannel}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        parentId={parentId}
        isSubmitting={isSubmitting}
      />

      <ChannelFormDialog
        open={!!editingChannel}
        onOpenChange={(open) => { if (!open) { setEditingChannel(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        channel={editingChannel}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteChannel')}
        description={t('deleteWithChildren', { name: deleteTarget?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
