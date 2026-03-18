'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import { AgreementTemplateType, type AgreementTemplateResponse, type PaginatedResponse, type CreateAgreementTemplateInput, type PerspectiveConfig } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
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
import { AgreementTemplateFormDialog } from './agreement-template-form-dialog';
import { getAgreementTemplateColumns } from './columns';
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

export function AgreementTemplatesDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('agreementTemplates');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { valueStreams } = useValueStreams();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [valueStreamFilter, setValueStreamFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<AgreementTemplateResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplateResponse | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgreementTemplateResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    main_agreement: t('typeMainAgreement'),
    annex: t('typeAnnex'),
    schedule: t('typeSchedule'),
    exhibit: t('typeExhibit'),
  };

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setTypeFilter(config.filters?.type ?? 'all');
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
    table: 'agreement_templates',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(valueStreamFilter !== 'all' ? { valueStreamId: valueStreamFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, typeFilter, valueStreamFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (typeFilter && typeFilter !== 'all') {
        qs += `&type=${typeFilter}`;
      }
      if (valueStreamFilter && valueStreamFilter !== 'all') {
        qs += `&valueStreamId=${valueStreamFilter}`;
      }
      const result = await api.get<PaginatedResponse<AgreementTemplateResponse>>(`/agreement-templates/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter, valueStreamFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, typeFilter, valueStreamFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setParentId(null);
    setFormOpen(true);
  };

  const handleOpenAddChild = (template: AgreementTemplateResponse) => {
    setEditingTemplate(null);
    setParentId(template.id);
    setFormOpen(true);
  };

  const handleOpenEdit = async (template: AgreementTemplateResponse) => {
    try {
      const full = await api.get<AgreementTemplateResponse>(`/agreement-templates/${template.id}`);
      setEditingTemplate(full);
      setParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateAgreementTemplateInput) => {
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await api.patch(`/agreement-templates/${editingTemplate.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/agreement-templates', input);
        toast.success(parentId ? t('created') : t('rootCreated'));
      }
      setFormOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch {
      toast.error(editingTemplate ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agreement-templates/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getAgreementTemplateColumns({
    onEdit: handleOpenEdit,
    onDelete: (template) => setDeleteTarget(template),
    onAddChild: handleOpenAddChild,
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: t('type'),
      purpose: t('purpose'),
      description: t('description'),
      valueStream: t('valueStream'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
      addChild: t('addChild'),
    },
    typeLabels,
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'type', label: t('type') },
    { id: 'purpose', label: t('purpose') },
    { id: 'description', label: t('description') },
    { id: 'valueStream', label: t('valueStream') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'type', label: t('type'), extract: (r) => typeLabels[String(r.type)] ?? String(r.type ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'description', label: t('description'), extract: (r) => String(r.description ?? '') },
    { key: 'valueStream', label: t('valueStream'), extract: (r) => {
      const vs = r.valueStream as { name: string } | null | undefined;
      return vs?.name ?? '';
    }},
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = `page=1&limit=10000`;
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (typeFilter && typeFilter !== 'all') qs += `&type=${typeFilter}`;
    if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
    const result = await api.get<PaginatedResponse<AgreementTemplateResponse>>(`/agreement-templates/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, typeFilter, valueStreamFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (typeFilter !== 'all') {
      filters.push({
        key: 'type',
        label: t('type'),
        displayValue: typeLabels[typeFilter] ?? typeFilter,
        onClear: () => setTypeFilter('all'),
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
  }, [typeFilter, valueStreamFilter, valueStreams, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createTemplate')}
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
          filenameBase="agreement-templates"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('type')}</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {Object.values(AgreementTemplateType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabels[type] ?? type}
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

      <AgreementTemplateFormDialog
        open={formOpen && !editingTemplate}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        parentId={parentId}
        isSubmitting={isSubmitting}
      />

      <AgreementTemplateFormDialog
        open={!!editingTemplate}
        onOpenChange={(open) => { if (!open) { setEditingTemplate(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        template={editingTemplate}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteTemplate')}
        description={t('deleteConfirmation', { name: deleteTarget?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
