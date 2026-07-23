'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type {
  PaginatedResponse,
  PerspectiveConfig,
  CreateOrderInput,
} from '@marketlum/shared';
import { OrderState } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { usePagination } from '../../hooks/use-pagination';
import { useDebounce } from '../../hooks/use-debounce';
import { usePerspectives } from '../../hooks/use-perspectives';
import { useAgents } from '../../hooks/use-agents';
import { useValues } from '../../hooks/use-values';
import { useChannels } from '../../hooks/use-channels';
import { usePipelines } from '../../hooks/use-pipelines';
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
import { usePermissions } from '../../permissions/permissions-context';
import { OrderFormDialog } from './order-form-dialog';
import { getOrderColumns, type OrderRow } from './columns';
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

interface OrdersDataTableProps {
  /** Scope the table to orders involving one agent (either side): filters every query. */
  agentId?: string;
}

export function OrdersDataTable({ agentId: scopedAgentId }: OrdersDataTableProps = {}) {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canWrite = can('orders', 'write');
  const { agents } = useAgents();
  const { values } = useValues();
  const { channels } = useChannels();
  const { pipelines } = usePipelines();
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [fromAgentFilter, setFromAgentFilter] = useState<string>('all');
  const [toAgentFilter, setToAgentFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<OrderRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const stateLabels: Record<OrderState, string> = {
    [OrderState.DRAFT]: t('stateDraft'),
    [OrderState.NEW]: t('stateNew'),
    [OrderState.PROCESSING]: t('stateProcessing'),
    [OrderState.COMPLETED]: t('stateCompleted'),
    [OrderState.CANCELLED]: t('stateCancelled'),
  };

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setStateFilter(config.filters?.state ?? 'all');
    setFromAgentFilter(config.filters?.fromAgentId ?? 'all');
    setToAgentFilter(config.filters?.toAgentId ?? 'all');
    setCurrencyFilter(config.filters?.currencyId ?? 'all');
    setChannelFilter(config.filters?.channelId ?? 'all');
    setPipelineFilter(config.filters?.pipelineId ?? 'all');
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
    table: 'orders',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
      ...(fromAgentFilter !== 'all' ? { fromAgentId: fromAgentFilter } : {}),
      ...(toAgentFilter !== 'all' ? { toAgentId: toAgentFilter } : {}),
      ...(currencyFilter !== 'all' ? { currencyId: currencyFilter } : {}),
      ...(channelFilter !== 'all' ? { channelId: channelFilter } : {}),
      ...(pipelineFilter !== 'all' ? { pipelineId: pipelineFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, stateFilter, fromAgentFilter, toAgentFilter, currencyFilter, channelFilter, pipelineFilter, pagination.sortBy, pagination.sortOrder]);

  const buildFilterQuery = useCallback(() => {
    let qs = '';
    if (stateFilter && stateFilter !== 'all') qs += `&state=${stateFilter}`;
    if (fromAgentFilter && fromAgentFilter !== 'all') qs += `&fromAgentId=${fromAgentFilter}`;
    if (toAgentFilter && toAgentFilter !== 'all') qs += `&toAgentId=${toAgentFilter}`;
    if (currencyFilter && currencyFilter !== 'all') qs += `&currencyId=${currencyFilter}`;
    if (channelFilter && channelFilter !== 'all') qs += `&channelId=${channelFilter}`;
    if (pipelineFilter && pipelineFilter !== 'all') qs += `&pipelineId=${pipelineFilter}`;
    if (scopedAgentId) qs += `&agentId=${scopedAgentId}`;
    return qs;
  }, [stateFilter, fromAgentFilter, toAgentFilter, currencyFilter, channelFilter, pipelineFilter, scopedAgentId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = pagination.toQueryString() + buildFilterQuery();
      const result = await api.get<PaginatedResponse<OrderRow>>(`/orders/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, buildFilterQuery]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, stateFilter, fromAgentFilter, toAgentFilter, currencyFilter, channelFilter, pipelineFilter, fetchData]);

  const handleFormSubmit = async (input: CreateOrderInput) => {
    setIsSubmitting(true);
    try {
      const created = await api.post<OrderRow>('/orders', input);
      toast.success(t('created'));
      setFormOpen(false);
      router.push(`/admin/orders/${created.id}`);
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/orders/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const allColumns = getOrderColumns({
    onDelete: (order) => setDeleteTarget(order),
    onSort: pagination.setSort,
    hideAgentColumns: !!scopedAgentId,
    translations: {
      number: t('number'),
      state: t('state'),
      stateLabels,
      from: t('from'),
      to: t('to'),
      total: t('total'),
      currency: t('currency'),
      channel: t('channel'),
      pipeline: t('pipeline'),
      placedAt: t('placedAt'),
      delete: tc('delete'),
    },
  });
  const columns = canWrite ? allColumns : allColumns.filter((c) => c.id !== 'actions');

  const columnMeta = [
    { id: 'number', label: t('number') },
    { id: 'state', label: t('state') },
    ...(!scopedAgentId
      ? [
          { id: 'fromAgent', label: t('from') },
          { id: 'toAgent', label: t('to') },
        ]
      : []),
    { id: 'total', label: t('total') },
    { id: 'channel', label: t('channel') },
    { id: 'pipeline', label: t('pipeline') },
    { id: 'placedAt', label: t('placedAt') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'number', label: t('number'), extract: (r) => String(r.number ?? '') },
    { key: 'state', label: t('state'), extract: (r) => stateLabels[r.state as OrderState] ?? String(r.state) },
    { key: 'fromAgent', label: t('from'), extract: (r) => {
      const agent = r.fromAgent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'toAgent', label: t('to'), extract: (r) => {
      const agent = r.toAgent as { name: string } | null;
      return agent?.name ?? '';
    }},
    { key: 'total', label: t('total'), extract: (r) => String(r.total ?? '0.00') },
    { key: 'currency', label: t('currency'), extract: (r) => {
      const c = r.currency as { name: string } | null;
      return c?.name ?? '';
    }},
    { key: 'channel', label: t('channel'), extract: (r) => {
      const ch = r.channel as { name: string } | null;
      return ch?.name ?? '';
    }},
    { key: 'pipeline', label: t('pipeline'), extract: (r) => {
      const p = r.pipeline as { name: string } | null;
      return p?.name ?? '';
    }},
    { key: 'placedAt', label: t('placedAt'), extract: (r) => String(r.placedAt ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = 'page=1&limit=10000';
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    qs += buildFilterQuery();
    const result = await api.get<PaginatedResponse<OrderRow>>(`/orders/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, buildFilterQuery]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (stateFilter !== 'all') {
      filters.push({
        key: 'state',
        label: t('state'),
        displayValue: stateLabels[stateFilter as OrderState] ?? stateFilter,
        onClear: () => setStateFilter('all'),
      });
    }
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
    if (pipelineFilter !== 'all') {
      const pipeline = pipelines.find((p) => p.id === pipelineFilter);
      filters.push({
        key: 'pipeline',
        label: t('pipeline'),
        displayValue: pipeline?.name ?? pipelineFilter,
        onClear: () => setPipelineFilter('all'),
      });
    }
    return filters;
  }, [stateFilter, fromAgentFilter, toAgentFilter, currencyFilter, channelFilter, pipelineFilter, agents, values, channels, pipelines, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={canWrite ? () => setFormOpen(true) : undefined}
        createLabel={canWrite ? t('createOrder') : undefined}
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
          filenameBase="orders"
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
              {Object.values(OrderState).map((state) => (
                <SelectItem key={state} value={state}>
                  {stateLabels[state]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!scopedAgentId && (
          <>
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
          </>
        )}
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
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('pipeline')}</label>
          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPipelines')}</SelectItem>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
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
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            columnVisibility={mergedVisibility}
            onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
          />
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

      <OrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        defaultFromAgentId={scopedAgentId}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteOrder')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.number ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
