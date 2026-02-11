'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ValueInstanceResponse, PaginatedResponse, CreateValueInstanceInput, PerspectiveConfig } from '@marketlum/shared';
import { ValueType } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useValues } from '@/hooks/use-values';
import { useAgents } from '@/hooks/use-agents';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { DataTableFilterSheet } from '@/components/shared/data-table-filter-sheet';
import { ActiveFilters, type ActiveFilter } from '@/components/shared/active-filters';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '@/components/shared/column-visibility-dropdown';
import { PerspectiveSelector } from '@/components/shared/perspective-selector';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '@/lib/column-visibility';
import { ValueInstanceFormDialog } from './value-instance-form-dialog';
import { getValueInstanceColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import type { FieldDef } from '@/lib/export-utils';
import Link from 'next/link';
import { Share2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ValueInstancesDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('valueInstances');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { values } = useValues();
  const { agents } = useAgents();
  const [valueFilter, setValueFilter] = useState<string>('all');
  const [fromAgentFilter, setFromAgentFilter] = useState<string>('all');
  const [toAgentFilter, setToAgentFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ValueInstanceResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ValueInstanceResponse | null>(null);
  const [deleteItem, setDeleteItem] = useState<ValueInstanceResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setValueFilter(config.filters?.valueId ?? 'all');
    setFromAgentFilter(config.filters?.fromAgentId ?? 'all');
    setToAgentFilter(config.filters?.toAgentId ?? 'all');
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
    table: 'value_instances',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(valueFilter !== 'all' ? { valueId: valueFilter } : {}),
      ...(fromAgentFilter !== 'all' ? { fromAgentId: fromAgentFilter } : {}),
      ...(toAgentFilter !== 'all' ? { toAgentId: toAgentFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, valueFilter, fromAgentFilter, toAgentFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (valueFilter && valueFilter !== 'all') {
        qs += `&valueId=${valueFilter}`;
      }
      if (fromAgentFilter && fromAgentFilter !== 'all') {
        qs += `&fromAgentId=${fromAgentFilter}`;
      }
      if (toAgentFilter && toAgentFilter !== 'all') {
        qs += `&toAgentId=${toAgentFilter}`;
      }
      const result = await api.get<PaginatedResponse<ValueInstanceResponse>>(`/value-instances?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, valueFilter, fromAgentFilter, toAgentFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, valueFilter, fromAgentFilter, toAgentFilter, fetchData]);

  const handleCreate = async (input: CreateValueInstanceInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/value-instances', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateValueInstanceInput) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/value-instances/${editingItem.id}`, input);
      toast.success(t('updated'));
      setEditingItem(null);
      fetchData();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/value-instances/${deleteItem.id}`);
      toast.success(t('deleted'));
      setDeleteItem(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const tv = useTranslations('values');
  const valueTypeLabels: Record<string, string> = {
    [ValueType.PRODUCT]: tv('typeProduct'),
    [ValueType.SERVICE]: tv('typeService'),
    [ValueType.RELATIONSHIP]: tv('typeRelationship'),
    [ValueType.RIGHT]: tv('typeRight'),
  };

  const columns = getValueInstanceColumns({
    onEdit: (vi) => setEditingItem(vi),
    onDelete: (vi) => setDeleteItem(vi),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      value: t('value'),
      fromAgent: t('fromAgent'),
      toAgent: t('toAgent'),
      version: t('version'),
      purpose: t('purpose'),
      expiresAt: t('expiresAt'),
      image: t('image'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
      valueTypeLabels,
    },
  });

  const columnMeta = [
    { id: 'image', label: t('image') },
    { id: 'name', label: tc('name') },
    { id: 'value', label: t('value') },
    { id: 'fromAgent', label: t('fromAgent') },
    { id: 'toAgent', label: t('toAgent') },
    { id: 'version', label: t('version') },
    { id: 'purpose', label: t('purpose') },
    { id: 'expiresAt', label: t('expiresAt') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'description', label: t('valueInstanceDescription'), extract: (r) => String(r.description ?? '') },
    { key: 'link', label: t('link'), extract: (r) => String(r.link ?? '') },
    { key: 'version', label: t('version'), extract: (r) => String(r.version ?? '') },
    { key: 'expiresAt', label: t('expiresAt'), extract: (r) => String(r.expiresAt ?? '') },
    { key: 'value', label: t('value'), extract: (r) => {
      const v = r.value as { name?: string } | null;
      return v?.name ?? '';
    }},
    { key: 'fromAgent', label: t('fromAgent'), extract: (r) => {
      const a = r.fromAgent as { name?: string } | null;
      return a?.name ?? '';
    }},
    { key: 'toAgent', label: t('toAgent'), extract: (r) => {
      const a = r.toAgent as { name?: string } | null;
      return a?.name ?? '';
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
    if (valueFilter && valueFilter !== 'all') qs += `&valueId=${valueFilter}`;
    if (fromAgentFilter && fromAgentFilter !== 'all') qs += `&fromAgentId=${fromAgentFilter}`;
    if (toAgentFilter && toAgentFilter !== 'all') qs += `&toAgentId=${toAgentFilter}`;
    const result = await api.get<PaginatedResponse<ValueInstanceResponse>>(`/value-instances?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, valueFilter, fromAgentFilter, toAgentFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (valueFilter !== 'all') {
      const value = values.find((v) => v.id === valueFilter);
      filters.push({
        key: 'value',
        label: t('value'),
        displayValue: value?.name ?? valueFilter,
        onClear: () => setValueFilter('all'),
      });
    }
    if (fromAgentFilter !== 'all') {
      const agent = agents.find((a) => a.id === fromAgentFilter);
      filters.push({
        key: 'fromAgent',
        label: t('fromAgent'),
        displayValue: agent?.name ?? fromAgentFilter,
        onClear: () => setFromAgentFilter('all'),
      });
    }
    if (toAgentFilter !== 'all') {
      const agent = agents.find((a) => a.id === toAgentFilter);
      filters.push({
        key: 'toAgent',
        label: t('toAgent'),
        displayValue: agent?.name ?? toAgentFilter,
        onClear: () => setToAgentFilter('all'),
      });
    }
    return filters;
  }, [valueFilter, fromAgentFilter, toAgentFilter, t, values, agents]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createValueInstance')}
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
          filenameBase="value-instances"
        />
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/value-instances/graph">
            <Share2 className="mr-2 h-4 w-4" />
            {t('viewGraph')}
          </Link>
        </Button>
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('value')}</label>
          <Select value={valueFilter} onValueChange={setValueFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allValues')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allValues')}</SelectItem>
              {values.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('fromAgent')}</label>
          <Select value={fromAgentFilter} onValueChange={setFromAgentFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allFromAgents')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allFromAgents')}</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('toAgent')}</label>
          <Select value={toAgentFilter} onValueChange={setToAgentFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allToAgents')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allToAgents')}</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
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
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(vi) => router.push(`/app/value-instances/${vi.id}`)} />
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

      <ValueInstanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <ValueInstanceFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleEdit}
        valueInstance={editingItem}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t('deleteValueInstance')}
        description={tc('confirmDeleteDescription', { name: deleteItem?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
