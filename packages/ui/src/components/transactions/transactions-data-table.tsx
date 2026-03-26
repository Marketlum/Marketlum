'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { TransactionResponse, PaginatedResponse, CreateTransactionInput, PerspectiveConfig } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useAccounts } from '../../hooks/use-accounts';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { DataTable } from '../shared/data-table';
import { DataTablePagination } from '../shared/data-table-pagination';
import { DataTableToolbar } from '../shared/data-table-toolbar';
import { DataTableFilterSheet } from '../shared/data-table-filter-sheet';
import { ActiveFilters, type ActiveFilter } from '../shared/active-filters';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '../shared/column-visibility-dropdown';
import { PerspectiveSelector } from '../shared/perspective-selector';
import { useIsMobile } from '../../hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '../../lib/column-visibility';
import { TransactionFormDialog } from './transaction-form-dialog';
import { getTransactionColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ExportDropdown } from '../shared/export-dropdown';
import type { FieldDef } from '../../lib/export-utils';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function TransactionsDataTable() {
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('transactions');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { accounts } = useAccounts();
  const [fromAccountFilter, setFromAccountFilter] = useState<string>('all');
  const [toAccountFilter, setToAccountFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<TransactionResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransactionResponse | null>(null);
  const [deleteItem, setDeleteItem] = useState<TransactionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setFromAccountFilter(config.filters?.fromAccountId ?? 'all');
    setToAccountFilter(config.filters?.toAccountId ?? 'all');
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
    table: 'transactions',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(fromAccountFilter !== 'all' ? { fromAccountId: fromAccountFilter } : {}),
      ...(toAccountFilter !== 'all' ? { toAccountId: toAccountFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, fromAccountFilter, toAccountFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (fromAccountFilter && fromAccountFilter !== 'all') {
        qs += `&fromAccountId=${fromAccountFilter}`;
      }
      if (toAccountFilter && toAccountFilter !== 'all') {
        qs += `&toAccountId=${toAccountFilter}`;
      }
      const result = await api.get<PaginatedResponse<TransactionResponse>>(`/transactions?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, fromAccountFilter, toAccountFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, fromAccountFilter, toAccountFilter, fetchData]);

  const handleCreate = async (input: CreateTransactionInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/transactions', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateTransactionInput) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/transactions/${editingItem.id}`, input);
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
      await api.delete(`/transactions/${deleteItem.id}`);
      toast.success(t('deleted'));
      setDeleteItem(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getTransactionColumns({
    onEdit: (tx) => setEditingItem(tx),
    onDelete: (tx) => setDeleteItem(tx),
    onSort: pagination.setSort,
    translations: {
      fromAccount: t('fromAccount'),
      toAccount: t('toAccount'),
      amount: t('amount'),
      description: t('transactionDescription'),
      timestamp: t('timestamp'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  const columnMeta = [
    { id: 'fromAccount', label: t('fromAccount') },
    { id: 'toAccount', label: t('toAccount') },
    { id: 'amount', label: t('amount') },
    { id: 'description', label: t('transactionDescription') },
    { id: 'timestamp', label: t('timestamp') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'fromAccount', label: t('fromAccount'), extract: (r) => {
      const a = r.fromAccount as { name?: string } | null;
      return a?.name ?? '';
    }},
    { key: 'toAccount', label: t('toAccount'), extract: (r) => {
      const a = r.toAccount as { name?: string } | null;
      return a?.name ?? '';
    }},
    { key: 'amount', label: t('amount'), extract: (r) => String(r.amount ?? '') },
    { key: 'description', label: t('transactionDescription'), extract: (r) => String(r.description ?? '') },
    { key: 'timestamp', label: t('timestamp'), extract: (r) => String(r.timestamp ?? '') },
    { key: 'createdAt', label: tc('created'), extract: (r) => String(r.createdAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = `page=1&limit=10000`;
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (fromAccountFilter && fromAccountFilter !== 'all') qs += `&fromAccountId=${fromAccountFilter}`;
    if (toAccountFilter && toAccountFilter !== 'all') qs += `&toAccountId=${toAccountFilter}`;
    const result = await api.get<PaginatedResponse<TransactionResponse>>(`/transactions?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, fromAccountFilter, toAccountFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (fromAccountFilter !== 'all') {
      const account = accounts.find((a) => a.id === fromAccountFilter);
      filters.push({
        key: 'fromAccount',
        label: t('fromAccount'),
        displayValue: account?.name ?? fromAccountFilter,
        onClear: () => setFromAccountFilter('all'),
      });
    }
    if (toAccountFilter !== 'all') {
      const account = accounts.find((a) => a.id === toAccountFilter);
      filters.push({
        key: 'toAccount',
        label: t('toAccount'),
        displayValue: account?.name ?? toAccountFilter,
        onClear: () => setToAccountFilter('all'),
      });
    }
    return filters;
  }, [fromAccountFilter, toAccountFilter, t, accounts]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createTransaction')}
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
          filenameBase="transactions"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('fromAccount')}</label>
          <Select value={fromAccountFilter} onValueChange={setFromAccountFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allFromAccounts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allFromAccounts')}</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('toAccount')}</label>
          <Select value={toAccountFilter} onValueChange={setToAccountFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allToAccounts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allToAccounts')}</SelectItem>
              {accounts.map((a) => (
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

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <TransactionFormDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleEdit}
        transaction={editingItem}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title={t('deleteTransaction')}
        description={tc('confirmDeleteDescription', { name: deleteItem?.description ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
