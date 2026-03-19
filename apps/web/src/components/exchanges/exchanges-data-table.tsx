'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import type { PaginatedResponse, PerspectiveConfig, CreateExchangeInput } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { useAgents } from '@/hooks/use-agents';
import { useValueStreams } from '@/hooks/use-value-streams';
import { useUsers } from '@/hooks/use-users';
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
import { ExchangeFormDialog } from './exchange-form-dialog';
import { ExchangeFlowsPanel } from './exchange-flows-panel';
import { getExchangeColumns } from './columns';
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

interface ExchangeRow {
  id: string;
  name: string;
  purpose: string;
  description: string | null;
  valueStream: { id: string; name: string } | null;
  channel: { id: string; name: string } | null;
  state: string;
  openedAt: string;
  completedAt: string | null;
  link: string | null;
  lead: { id: string; name: string } | null;
  parties: { id: string; agent: { id: string; name: string }; role: string }[];
  createdAt: string;
  updatedAt: string;
}

export function ExchangesDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('exchanges');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { agents } = useAgents();
  const { valueStreams } = useValueStreams();
  const { users } = useUsers();
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [valueStreamFilter, setValueStreamFilter] = useState<string>('all');
  const [partyAgentFilter, setPartyAgentFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ExchangeRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExchange, setEditingExchange] = useState<ExchangeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [flowsExchange, setFlowsExchange] = useState<ExchangeRow | null>(null);

  // Load channels for filter and form
  useEffect(() => {
    api.get<PaginatedResponse<{ id: string; name: string }>>('/channels/search?limit=1000')
      .then((res) => setChannels(res.data))
      .catch(() => {});
  }, []);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setStateFilter(config.filters?.state ?? 'all');
    setChannelFilter(config.filters?.channelId ?? 'all');
    setValueStreamFilter(config.filters?.valueStreamId ?? 'all');
    setPartyAgentFilter(config.filters?.partyAgentId ?? 'all');
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
    table: 'exchanges',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
      ...(channelFilter !== 'all' ? { channelId: channelFilter } : {}),
      ...(valueStreamFilter !== 'all' ? { valueStreamId: valueStreamFilter } : {}),
      ...(partyAgentFilter !== 'all' ? { partyAgentId: partyAgentFilter } : {}),
      ...(leadFilter !== 'all' ? { leadUserId: leadFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, stateFilter, channelFilter, valueStreamFilter, partyAgentFilter, leadFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (stateFilter && stateFilter !== 'all') qs += `&state=${stateFilter}`;
      if (channelFilter && channelFilter !== 'all') qs += `&channelId=${channelFilter}`;
      if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
      if (partyAgentFilter && partyAgentFilter !== 'all') qs += `&partyAgentId=${partyAgentFilter}`;
      if (leadFilter && leadFilter !== 'all') qs += `&leadUserId=${leadFilter}`;
      const result = await api.get<PaginatedResponse<ExchangeRow>>(`/exchanges/search?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, stateFilter, channelFilter, valueStreamFilter, partyAgentFilter, leadFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, pagination.limit, stateFilter, channelFilter, valueStreamFilter, partyAgentFilter, leadFilter, fetchData]);

  const handleOpenCreate = () => {
    setEditingExchange(null);
    setFormOpen(true);
  };

  const handleOpenEdit = async (exchange: ExchangeRow) => {
    try {
      const full = await api.get<ExchangeRow>(`/exchanges/${exchange.id}`);
      setEditingExchange(full);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleOpenFlows = async (exchange: ExchangeRow) => {
    try {
      const full = await api.get<ExchangeRow>(`/exchanges/${exchange.id}`);
      setFlowsExchange(full);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (input: CreateExchangeInput) => {
    setIsSubmitting(true);
    try {
      if (editingExchange) {
        await api.patch(`/exchanges/${editingExchange.id}`, input);
        toast.success(t('updated'));
      } else {
        await api.post('/exchanges', input);
        toast.success(t('created'));
      }
      setFormOpen(false);
      setEditingExchange(null);
      fetchData();
    } catch {
      toast.error(editingExchange ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/exchanges/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = getExchangeColumns({
    onEdit: handleOpenEdit,
    onDelete: (exchange) => setDeleteTarget(exchange),
    onFlows: handleOpenFlows,
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      purpose: t('purpose'),
      state: t('state'),
      channel: t('channel'),
      valueStream: t('valueStream'),
      lead: t('lead'),
      parties: t('parties'),
      openedAt: t('openedAt'),
      completedAt: t('completedAt'),
      link: t('link'),
      edit: tc('edit'),
      delete: tc('delete'),
      flows: t('flows'),
    },
  });

  const columnMeta = [
    { id: 'name', label: tc('name') },
    { id: 'purpose', label: t('purpose') },
    { id: 'state', label: t('state') },
    { id: 'channel', label: t('channel') },
    { id: 'valueStream', label: t('valueStream') },
    { id: 'lead', label: t('lead') },
    { id: 'parties', label: t('parties') },
    { id: 'openedAt', label: t('openedAt') },
    { id: 'completedAt', label: t('completedAt') },
    { id: 'link', label: t('link') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'state', label: t('state'), extract: (r) => String(r.state ?? '') },
    { key: 'channel', label: t('channel'), extract: (r) => {
      const ch = r.channel as { name: string } | null;
      return ch?.name ?? '';
    }},
    { key: 'valueStream', label: t('valueStream'), extract: (r) => {
      const vs = r.valueStream as { name: string } | null;
      return vs?.name ?? '';
    }},
    { key: 'lead', label: t('lead'), extract: (r) => {
      const l = r.lead as { name: string } | null;
      return l?.name ?? '';
    }},
    { key: 'parties', label: t('parties'), extract: (r) => {
      const parties = r.parties as { agent: { name: string }; role: string }[] | undefined;
      return parties?.map((p) => `${p.agent.name} (${p.role})`).join(', ') ?? '';
    }},
    { key: 'openedAt', label: t('openedAt'), extract: (r) => String(r.openedAt ?? '') },
    { key: 'completedAt', label: t('completedAt'), extract: (r) => String(r.completedAt ?? '') },
    { key: 'link', label: t('link'), extract: (r) => String(r.link ?? '') },
  ];

  const visibleExportFields = allExportFields.filter(
    (f) => columnVisibility[f.key] !== false,
  );

  const fetchAllData = useCallback(async () => {
    let qs = 'page=1&limit=10000';
    if (pagination.search) qs += `&search=${encodeURIComponent(pagination.search)}`;
    if (pagination.sortBy) qs += `&sortBy=${pagination.sortBy}&sortOrder=${pagination.sortOrder}`;
    if (stateFilter && stateFilter !== 'all') qs += `&state=${stateFilter}`;
    if (channelFilter && channelFilter !== 'all') qs += `&channelId=${channelFilter}`;
    if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
    if (partyAgentFilter && partyAgentFilter !== 'all') qs += `&partyAgentId=${partyAgentFilter}`;
    if (leadFilter && leadFilter !== 'all') qs += `&leadUserId=${leadFilter}`;
    const result = await api.get<PaginatedResponse<ExchangeRow>>(`/exchanges/search?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, stateFilter, channelFilter, valueStreamFilter, partyAgentFilter, leadFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (stateFilter !== 'all') {
      filters.push({
        key: 'state',
        label: t('state'),
        displayValue: stateFilter,
        onClear: () => setStateFilter('all'),
      });
    }
    if (channelFilter !== 'all') {
      const ch = channels.find((c) => c.id === channelFilter);
      filters.push({
        key: 'channel',
        label: t('channel'),
        displayValue: ch?.name ?? channelFilter,
        onClear: () => setChannelFilter('all'),
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
    if (partyAgentFilter !== 'all') {
      const agent = agents.find((a) => a.id === partyAgentFilter);
      filters.push({
        key: 'partyAgent',
        label: t('partyAgent'),
        displayValue: agent?.name ?? partyAgentFilter,
        onClear: () => setPartyAgentFilter('all'),
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
  }, [stateFilter, channelFilter, valueStreamFilter, partyAgentFilter, leadFilter, channels, valueStreams, agents, users, t]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={handleOpenCreate}
        createLabel={t('createExchange')}
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
          filenameBase="exchanges"
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
              <SelectItem value="open">{t('stateOpen')}</SelectItem>
              <SelectItem value="closed">{t('stateClosed')}</SelectItem>
              <SelectItem value="completed">{t('stateCompleted')}</SelectItem>
            </SelectContent>
          </Select>
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
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
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
                <SelectItem key={vs.id} value={vs.id}>{vs.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('partyAgent')}</label>
          <Select value={partyAgentFilter} onValueChange={setPartyAgentFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allAgents')}</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
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
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(exchange) => router.push(`/app/exchanges/${exchange.id}`)} />
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

      <ExchangeFormDialog
        open={formOpen && !editingExchange}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        channels={channels}
      />

      <ExchangeFormDialog
        open={!!editingExchange}
        onOpenChange={(open) => { if (!open) { setEditingExchange(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        exchange={editingExchange}
        isSubmitting={isSubmitting}
        channels={channels}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteExchange')}
        description={tc('confirmDeleteDescription', { name: deleteTarget?.name ?? '' })}
        isDeleting={isSubmitting}
      />

      {flowsExchange && (
        <ExchangeFlowsPanel
          open={!!flowsExchange}
          onOpenChange={(open) => !open && setFlowsExchange(null)}
          exchangeId={flowsExchange.id}
          exchangeName={flowsExchange.name}
          partyAgents={flowsExchange.parties.map((p) => ({ id: p.agent.id, name: p.agent.name }))}
        />
      )}
    </div>
  );
}
