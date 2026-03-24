'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { AgreementResponse, PaginatedResponse, CreateAgreementInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { useAgents } from '@/hooks/use-agents';
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
import { AgreementFormDialog } from './agreement-form-dialog';
import { getAgreementColumns } from './columns';
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

export function AgreementsDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('agreements');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const [partyFilter, setPartyFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<AgreementResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<AgreementResponse | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgreementResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setPartyFilter(config.filters?.partyId ?? 'all');
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
    table: 'agreements',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(partyFilter !== 'all' ? { partyId: partyFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, partyFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (partyFilter && partyFilter !== 'all') {
        qs += `&partyId=${partyFilter}`;
      }
      const result = await api.get<PaginatedResponse<AgreementResponse>>(`/agreements/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, partyFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, partyFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingAgreement(null);
    setParentId(null);
    setFormOpen(true);
  };

  const handleOpenAddChild = (agreement: AgreementResponse) => {
    setEditingAgreement(null);
    setParentId(agreement.id);
    setFormOpen(true);
  };

  const handleOpenEdit = async (agreement: AgreementResponse) => {
    try {
      const full = await api.get<AgreementResponse>(`/agreements/${agreement.id}`);
      setEditingAgreement(full);
      setParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateAgreementInput) => {
    setIsSubmitting(true);
    try {
      if (editingAgreement) {
        await api.patch(`/agreements/${editingAgreement.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/agreements', input);
        toast.success(parentId ? t('created') : t('rootCreated'));
      }
      setFormOpen(false);
      setEditingAgreement(null);
      fetchData();
    } catch {
      toast.error(editingAgreement ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/agreements/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getAgreementColumns({
    onEdit: handleOpenEdit,
    onDelete: (agreement) => setDeleteTarget(agreement),
    onAddChild: handleOpenAddChild,
    onSort: pagination.setSort,
    translations: {
      title: tc('name'),
      link: t('link'),
      parties: t('parties'),
      file: t('file'),
      template: t('template'),
      created: tc('created'),
      updatedAt: t('updatedAt'),
      edit: tc('edit'),
      delete: tc('delete'),
      addChild: t('addChild'),
    },
  });

  const columnMeta = [
    { id: 'title', label: tc('name') },
    { id: 'link', label: t('link') },
    { id: 'parties', label: t('parties') },
    { id: 'file', label: t('file') },
    { id: 'createdAt', label: tc('created') },
    { id: 'updatedAt', label: t('updatedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'title', label: tc('name'), extract: (r) => String(r.title ?? '') },
    { key: 'link', label: t('link'), extract: (r) => String(r.link ?? '') },
    { key: 'parties', label: t('parties'), extract: (r) => {
      const parties = r.parties as { name: string }[] | undefined;
      return parties?.map((p) => p.name).join(', ') ?? '';
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
    if (partyFilter && partyFilter !== 'all') qs += `&partyId=${partyFilter}`;
    const result = await api.get<PaginatedResponse<AgreementResponse>>(`/agreements/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, partyFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (partyFilter !== 'all') {
      const agent = agents.find((a) => a.id === partyFilter);
      filters.push({
        key: 'party',
        label: t('parties'),
        displayValue: agent?.name ?? partyFilter,
        onClear: () => setPartyFilter('all'),
      });
    }
    return filters;
  }, [partyFilter, agents, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createAgreement')}
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
          filenameBase="agreements"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('parties')}</label>
          <Select value={partyFilter} onValueChange={setPartyFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allParties')}</SelectItem>
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
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(agreement) => router.push(`/admin/agreements/${agreement.id}`)} />
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

      <AgreementFormDialog
        open={formOpen && !editingAgreement}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        parentId={parentId}
        isSubmitting={isSubmitting}
      />

      <AgreementFormDialog
        open={!!editingAgreement}
        onOpenChange={(open) => { if (!open) { setEditingAgreement(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        agreement={editingAgreement}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteAgreement')}
        description={t('deleteWithChildren', { name: deleteTarget?.title ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
