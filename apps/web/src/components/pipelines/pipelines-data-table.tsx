'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { PipelineResponse, PaginatedResponse, CreatePipelineInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useValueStreams } from '@/hooks/use-value-streams';
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
import { PipelineFormDialog } from './pipeline-form-dialog';
import { getPipelineColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import type { FieldDef } from '@/lib/export-utils';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function PipelinesDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('pipelines');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { valueStreams } = useValueStreams();
  const [valueStreamFilter, setValueStreamFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<PipelineResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PipelineResponse | null>(null);
  const [deleteItem, setDeleteItem] = useState<PipelineResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
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
    table: 'pipelines',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(valueStreamFilter !== 'all' ? { valueStreamId: valueStreamFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, valueStreamFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (valueStreamFilter && valueStreamFilter !== 'all') {
        qs += `&valueStreamId=${valueStreamFilter}`;
      }
      const result = await api.get<PaginatedResponse<PipelineResponse>>(`/pipelines/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, valueStreamFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, valueStreamFilter, fetchData]);

  const handleCreate = async (input: CreatePipelineInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/pipelines', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreatePipelineInput) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/pipelines/${editingItem.id}`, input);
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
      await api.delete(`/pipelines/${deleteItem.id}`);
      toast.success(t('deleted'));
      setDeleteItem(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (pipeline: PipelineResponse) => {
    setIsSubmitting(true);
    try {
      await api.post('/pipelines', {
        name: `${pipeline.name} (copy)`,
        purpose: pipeline.purpose ?? undefined,
        description: pipeline.description ?? undefined,
        color: pipeline.color,
        valueStreamId: pipeline.valueStream?.id ?? null,
      });
      toast.success(t('created'));
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getPipelineColumns({
    onEdit: (p) => setEditingItem(p),
    onDelete: (p) => setDeleteItem(p),
    onDuplicate: handleDuplicate,
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      purpose: t('purpose'),
      color: t('color'),
      valueStream: t('valueStream'),
      created: tc('created'),
      updatedAt: t('updatedAt'),
      edit: tc('edit'),
      delete: tc('delete'),
      duplicate: tc('duplicate'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'purpose', label: t('purpose') },
    { id: 'valueStream', label: t('valueStream') },
    { id: 'createdAt', label: tc('created') },
    { id: 'updatedAt', label: t('updatedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'description', label: t('pipelineDescription'), extract: (r) => String(r.description ?? '') },
    { key: 'color', label: t('color'), extract: (r) => String(r.color ?? '') },
    { key: 'valueStream', label: t('valueStream'), extract: (r) => {
      const vs = r.valueStream as { name?: string } | null;
      return vs?.name ?? '';
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
    if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
    const result = await api.get<PaginatedResponse<PipelineResponse>>(`/pipelines/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, valueStreamFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
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
  }, [valueStreamFilter, t, valueStreams]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createPipeline')}
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
          filenameBase="pipelines"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('valueStream')}</label>
          <Select value={valueStreamFilter} onValueChange={setValueStreamFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allValueStreams')} />
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

      <PipelineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <PipelineFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleEdit}
        pipeline={editingItem}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t('deletePipeline')}
        description={tc('confirmDeleteDescription', { name: deleteItem?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
