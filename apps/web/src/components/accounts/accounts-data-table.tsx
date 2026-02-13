'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { AccountResponse, PaginatedResponse, CreateAccountInput, PerspectiveConfig } from '@marketlum/shared';
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
import { AccountFormDialog } from './account-form-dialog';
import { getAccountColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ValueCombobox } from '@/components/shared/value-combobox';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import type { FieldDef } from '@/lib/export-utils';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AccountsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { values } = useValues();
  const { agents } = useAgents();
  const [valueFilter, setValueFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<AccountResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountResponse | null>(null);
  const [deleteItem, setDeleteItem] = useState<AccountResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setValueFilter(config.filters?.valueId ?? 'all');
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
    table: 'accounts',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(valueFilter !== 'all' ? { valueId: valueFilter } : {}),
      ...(agentFilter !== 'all' ? { agentId: agentFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, valueFilter, agentFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (valueFilter && valueFilter !== 'all') {
        qs += `&valueId=${valueFilter}`;
      }
      if (agentFilter && agentFilter !== 'all') {
        qs += `&agentId=${agentFilter}`;
      }
      const result = await api.get<PaginatedResponse<AccountResponse>>(`/accounts?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, valueFilter, agentFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, valueFilter, agentFilter, fetchData]);

  const handleCreate = async (input: CreateAccountInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/accounts', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateAccountInput) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/accounts/${editingItem.id}`, input);
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
      await api.delete(`/accounts/${deleteItem.id}`);
      toast.success(t('deleted'));
      setDeleteItem(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getAccountColumns({
    onEdit: (acc) => setEditingItem(acc),
    onDelete: (acc) => setDeleteItem(acc),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      value: t('value'),
      agent: t('agent'),
      balance: t('balance'),
      description: t('accountDescription'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'value', label: t('value') },
    { id: 'agent', label: t('agent') },
    { id: 'balance', label: t('balance') },
    { id: 'description', label: t('accountDescription') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'description', label: t('accountDescription'), extract: (r) => String(r.description ?? '') },
    { key: 'value', label: t('value'), extract: (r) => {
      const v = r.value as { name?: string } | null;
      return v?.name ?? '';
    }},
    { key: 'agent', label: t('agent'), extract: (r) => {
      const a = r.agent as { name?: string } | null;
      return a?.name ?? '';
    }},
    { key: 'balance', label: t('balance'), extract: (r) => String(r.balance ?? '') },
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = `page=1&limit=10000`;
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (valueFilter && valueFilter !== 'all') qs += `&valueId=${valueFilter}`;
    if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
    const result = await api.get<PaginatedResponse<AccountResponse>>(`/accounts?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, valueFilter, agentFilter]);

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
  }, [valueFilter, agentFilter, t, values, agents]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createAccount')}
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
          filenameBase="accounts"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('value')}</label>
          <ValueCombobox
            values={values}
            value={valueFilter === 'all' ? null : valueFilter}
            onSelect={(id) => setValueFilter(id ?? 'all')}
            placeholder={t('allValues')}
            noneLabel={t('allValues')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('agent')}</label>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allAgents')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allAgents')}</SelectItem>
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

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <AccountFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleEdit}
        account={editingItem}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t('deleteAccount')}
        description={tc('confirmDeleteDescription', { name: deleteItem?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
