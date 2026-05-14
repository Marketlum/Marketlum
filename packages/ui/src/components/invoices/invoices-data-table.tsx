'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { PaginatedResponse, PerspectiveConfig, CreateInvoiceInput } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { useAgents } from '../../hooks/use-agents';
import { useValues } from '../../hooks/use-values';
import { useChannels } from '../../hooks/use-channels';
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
import { InvoiceFormDialog } from './invoice-form-dialog';
import { ImportInvoiceDialog } from './import-invoice-dialog';
import type { InvoiceImportResponse } from '@marketlum/shared';
import { useRef } from 'react';
import { FileUp } from 'lucide-react';
import { ApiError } from '../../lib/api-client';
import { getInvoiceColumns } from './columns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ValueCombobox } from '../shared/value-combobox';
import type { FieldDef } from '../../lib/export-utils';

interface InvoiceItemRow {
  id: string;
  value: { id: string; name: string } | null;
  valueInstance: { id: string; name: string } | null;
  quantity: string;
  unitPrice: string;
  total: string;
  rateUsed: string | null;
  baseAmount: string | null;
}

interface InvoiceRow {
  id: string;
  number: string;
  fromAgent: { id: string; name: string } | null;
  toAgent: { id: string; name: string } | null;
  issuedAt: string;
  dueAt: string;
  currency: { id: string; name: string } | null;
  total?: string;
  baseTotal?: string | null;
  paid: boolean;
  link: string | null;
  file: unknown;
  valueStream: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  items: InvoiceItemRow[];
  createdAt: string;
  updatedAt: string;
}

export function InvoicesDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const { values } = useValues();
  const { channels } = useChannels();
  const [fromAgentFilter, setFromAgentFilter] = useState<string>('all');
  const [toAgentFilter, setToAgentFilter] = useState<string>('all');
  const [paidFilter, setPaidFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<InvoiceRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPrefill, setImportPrefill] = useState<InvoiceImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setFromAgentFilter(config.filters?.fromAgentId ?? 'all');
    setToAgentFilter(config.filters?.toAgentId ?? 'all');
    setPaidFilter(config.filters?.paid ?? 'all');
    setCurrencyFilter(config.filters?.currencyId ?? 'all');
    setChannelFilter(config.filters?.channelId ?? 'all');
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
    table: 'invoices',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(fromAgentFilter !== 'all' ? { fromAgentId: fromAgentFilter } : {}),
      ...(toAgentFilter !== 'all' ? { toAgentId: toAgentFilter } : {}),
      ...(paidFilter !== 'all' ? { paid: paidFilter } : {}),
      ...(currencyFilter !== 'all' ? { currencyId: currencyFilter } : {}),
      ...(channelFilter !== 'all' ? { channelId: channelFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, fromAgentFilter, toAgentFilter, paidFilter, currencyFilter, channelFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (fromAgentFilter && fromAgentFilter !== 'all') qs += `&fromAgentId=${fromAgentFilter}`;
      if (toAgentFilter && toAgentFilter !== 'all') qs += `&toAgentId=${toAgentFilter}`;
      if (paidFilter && paidFilter !== 'all') qs += `&paid=${paidFilter}`;
      if (currencyFilter && currencyFilter !== 'all') qs += `&currencyId=${currencyFilter}`;
      if (channelFilter && channelFilter !== 'all') qs += `&channelId=${channelFilter}`;
      const result = await api.get<PaginatedResponse<InvoiceRow>>(`/invoices/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, fromAgentFilter, toAgentFilter, paidFilter, currencyFilter, channelFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, fromAgentFilter, toAgentFilter, paidFilter, currencyFilter, channelFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setImportPrefill(null);
    setFormOpen(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file twice still fires onChange
    if (!file) return;
    setImporting(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const form = new FormData();
      form.append('file', file);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/invoices/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Protection': '1' },
        body: form,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        if (res.status === 415) toast.error(t('importWrongType'));
        else if (res.status === 413) toast.error(t('importOversize'));
        else if (res.status === 422) toast.error(body.message || t('importFailedBody'));
        else if (res.status === 500 && /ANTHROPIC_API_KEY/i.test(body.message ?? '')) {
          toast.error(t('importUnconfigured'));
        } else {
          toast.error(t('importFailedBody'));
        }
        return;
      }
      const prefill = (await res.json()) as InvoiceImportResponse;
      setImportPrefill(prefill);
      setEditingInvoice(null);
      setFormOpen(true);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      toast.error(t('importFailedBody'));
    } finally {
      setImporting(false);
      abortRef.current = null;
    }
  };

  const handleCancelImport = () => {
    abortRef.current?.abort();
    setImporting(false);
  };

  const handleOpenEdit = async (invoice: InvoiceRow) => {
    try {
      const full = await api.get<InvoiceRow>(`/invoices/${invoice.id}`);
      setEditingInvoice(full);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateInvoiceInput) => {
    setIsSubmitting(true);
    try {
      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/invoices', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditingInvoice(null);
      fetchData();
    } catch {
      toast.error(editingInvoice ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/invoices/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getInvoiceColumns({
    onEdit: handleOpenEdit,
    onDelete: (invoice) => setDeleteTarget(invoice),
    onSort: pagination.setSort,
    translations: {
      number: t('number'),
      from: t('from'),
      to: t('to'),
      issuedAt: t('issuedAt'),
      dueAt: t('dueAt'),
      currency: t('currency'),
      total: t('total'),
      inBase: t('inBase'),
      noRate: t('noRate'),
      paid: t('paid'),
      paidYes: t('paidYes'),
      paidNo: t('paidNo'),
      channel: t('channel'),
      link: t('link'),
      edit: tc('edit'),
      delete: tc('delete'),
    },
  });

  const columnMeta = [
    { id: 'number', label: t('number') },
    { id: 'fromAgent', label: t('from') },
    { id: 'toAgent', label: t('to') },
    { id: 'issuedAt', label: t('issuedAt') },
    { id: 'dueAt', label: t('dueAt') },
    { id: 'currency', label: t('currency') },
    { id: 'total', label: t('total') },
    { id: 'paid', label: t('paid') },
    { id: 'channel', label: t('channel') },
    { id: 'link', label: t('link') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'number', label: t('number'), extract: (r) => String(r.number ?? '') },
    { key: 'fromAgent', label: t('from'), extract: (r) => {
      const agent = r.fromAgent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'toAgent', label: t('to'), extract: (r) => {
      const agent = r.toAgent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'issuedAt', label: t('issuedAt'), extract: (r) => String(r.issuedAt ?? '') },
    { key: 'dueAt', label: t('dueAt'), extract: (r) => String(r.dueAt ?? '') },
    { key: 'currency', label: t('currency'), extract: (r) => {
      const c = r.currency as { name: string } | null;
      return c?.name ?? '';
    }},
    { key: 'total', label: t('total'), extract: (r) => String(r.total ?? '0.00') },
    { key: 'paid', label: t('paid'), extract: (r) => r.paid ? t('paidYes') : t('paidNo') },
    { key: 'channel', label: t('channel'), extract: (r) => {
      const ch = r.channel as { name: string } | null;
      return ch?.name ?? '';
    }},
    { key: 'link', label: t('link'), extract: (r) => String(r.link ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = 'page=1&limit=10000';
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (fromAgentFilter && fromAgentFilter !== 'all') qs += `&fromAgentId=${fromAgentFilter}`;
    if (toAgentFilter && toAgentFilter !== 'all') qs += `&toAgentId=${toAgentFilter}`;
    if (paidFilter && paidFilter !== 'all') qs += `&paid=${paidFilter}`;
    if (currencyFilter && currencyFilter !== 'all') qs += `&currencyId=${currencyFilter}`;
    if (channelFilter && channelFilter !== 'all') qs += `&channelId=${channelFilter}`;
    const result = await api.get<PaginatedResponse<InvoiceRow>>(`/invoices/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, fromAgentFilter, toAgentFilter, paidFilter, currencyFilter, channelFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (fromAgentFilter !== 'all') {
      const agent = agents.find((a) => a.id === fromAgentFilter);
      filters.push({
        key: 'fromAgent',
        label: t('from'),
        displayValue: agent?.name ?? fromAgentFilter,
        onClear: () => setFromAgentFilter('all'),
      });
    }
    if (toAgentFilter !== 'all') {
      const agent = agents.find((a) => a.id === toAgentFilter);
      filters.push({
        key: 'toAgent',
        label: t('to'),
        displayValue: agent?.name ?? toAgentFilter,
        onClear: () => setToAgentFilter('all'),
      });
    }
    if (paidFilter !== 'all') {
      filters.push({
        key: 'paid',
        label: t('paid'),
        displayValue: paidFilter === 'true' ? t('paidYes') : t('paidNo'),
        onClear: () => setPaidFilter('all'),
      });
    }
    if (currencyFilter !== 'all') {
      const currency = values.find((v) => v.id === currencyFilter);
      filters.push({
        key: 'currency',
        label: t('currency'),
        displayValue: currency?.name ?? currencyFilter,
        onClear: () => setCurrencyFilter('all'),
      });
    }
    if (channelFilter !== 'all') {
      const channel = channels.find((ch) => ch.id === channelFilter);
      filters.push({
        key: 'channel',
        label: t('channel'),
        displayValue: channel?.name ?? channelFilter,
        onClear: () => setChannelFilter('all'),
      });
    }
    return filters;
  }, [fromAgentFilter, toAgentFilter, paidFilter, currencyFilter, channelFilter, agents, values, channels, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelected}
      />
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createInvoice')}
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
        <Button variant="outline" size="sm" onClick={handleImportClick}>
          <FileUp className="mr-2 h-4 w-4" />
          {t('importFromPdf')}
        </Button>
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
          filenameBase="invoices"
        />
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('from')}</label>
          <Select value={fromAgentFilter} onValueChange={setFromAgentFilter}>
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
          <label className="text-sm font-medium">{t('to')}</label>
          <Select value={toAgentFilter} onValueChange={setToAgentFilter}>
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
          <label className="text-sm font-medium">{t('paid')}</label>
          <Select value={paidFilter} onValueChange={setPaidFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPaidStatuses')}</SelectItem>
              <SelectItem value="true">{t('paidYes')}</SelectItem>
              <SelectItem value="false">{t('paidNo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('currency')}</label>
          <ValueCombobox
            values={values}
            value={currencyFilter === 'all' ? null : currencyFilter}
            onSelect={(id) => setCurrencyFilter(id ?? 'all')}
            placeholder={t('allCurrencies')}
            noneLabel={t('allCurrencies')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('channel')}</label>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allChannels')}</SelectItem>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.name}
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
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(invoice) => router.push(`/admin/invoices/${invoice.id}`)} />
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

      <InvoiceFormDialog
        open={formOpen && !editingInvoice}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setImportPrefill(null);
        }}
        onSubmit={handleFormSubmit}
        prefill={importPrefill ?? undefined}
        isSubmitting={isSubmitting}
      />

      <ImportInvoiceDialog open={importing} onCancel={handleCancelImport} />

      <InvoiceFormDialog
        open={!!editingInvoice}
        onOpenChange={(open) => { if (!open) { setEditingInvoice(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        invoice={editingInvoice}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteInvoice')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.number ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
