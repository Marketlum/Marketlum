'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ValueResponse, PaginatedResponse, CreateValueInput, PerspectiveConfig, TaxonomyTreeNode } from '@marketlum/shared';
import { ValueType, ValueLifecycleStage } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useTaxonomyTree } from '../../hooks/use-taxonomy-tree';
import { useAgents } from '../../hooks/use-agents';
import { useValueStreams } from '../../hooks/use-value-streams';
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
import { ValueFormDialog } from './value-form-dialog';
import { getValueColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TaxonomyTreeSelect } from '../shared/taxonomy-tree-select';
import { ExportDropdown } from '../shared/export-dropdown';
import type { FieldDef } from '../../lib/export-utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SlidersHorizontal, Share2 } from 'lucide-react';

function flattenTree(nodes: TaxonomyTreeNode[]): TaxonomyTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

const typeTranslationKeys: Record<string, string> = {
  [ValueType.PRODUCT]: 'typeProduct',
  [ValueType.SERVICE]: 'typeService',
  [ValueType.RELATIONSHIP]: 'typeRelationship',
  [ValueType.RIGHT]: 'typeRight',
};

const lifecycleTranslationKeys: Record<string, string> = {
  [ValueLifecycleStage.IDEA]: 'lifecycleIdea',
  [ValueLifecycleStage.ALPHA]: 'lifecycleAlpha',
  [ValueLifecycleStage.BETA]: 'lifecycleBeta',
  [ValueLifecycleStage.STABLE]: 'lifecycleStable',
  [ValueLifecycleStage.LEGACY]: 'lifecycleLegacy',
};

export function ValuesDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('values');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const isMobile = useIsMobile();
  const { tree } = useTaxonomyTree();
  const { agents } = useAgents();
  const { valueStreams } = useValueStreams();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [valueStreamFilter, setValueStreamFilter] = useState<string>('all');
  const [lifecycleStageFilter, setLifecycleStageFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ValueResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<ValueResponse | null>(null);
  const [duplicatingValue, setDuplicatingValue] = useState<ValueResponse | null>(null);
  const [deleteValue, setDeleteValue] = useState<ValueResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setTypeFilter(config.filters?.type ?? 'all');
    setTaxonomyFilter(config.filters?.taxonomyId ?? 'all');
    setAgentFilter(config.filters?.agentId ?? 'all');
    setValueStreamFilter(config.filters?.valueStreamId ?? 'all');
    setLifecycleStageFilter(config.filters?.lifecycleStage ?? 'all');
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
    table: 'values',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(taxonomyFilter !== 'all' ? { taxonomyId: taxonomyFilter } : {}),
      ...(agentFilter !== 'all' ? { agentId: agentFilter } : {}),
      ...(valueStreamFilter !== 'all' ? { valueStreamId: valueStreamFilter } : {}),
      ...(lifecycleStageFilter !== 'all' ? { lifecycleStage: lifecycleStageFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, typeFilter, taxonomyFilter, agentFilter, valueStreamFilter, lifecycleStageFilter, pagination.sortBy, pagination.sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let qs = pagination.toQueryString();
      if (typeFilter && typeFilter !== 'all') {
        qs += `&type=${typeFilter}`;
      }
      if (taxonomyFilter && taxonomyFilter !== 'all') {
        qs += `&taxonomyId=${taxonomyFilter}`;
      }
      if (agentFilter && agentFilter !== 'all') {
        qs += `&agentId=${agentFilter}`;
      }
      if (valueStreamFilter && valueStreamFilter !== 'all') {
        qs += `&valueStreamId=${valueStreamFilter}`;
      }
      if (lifecycleStageFilter && lifecycleStageFilter !== 'all') {
        qs += `&lifecycleStage=${lifecycleStageFilter}`;
      }
      const result = await api.get<PaginatedResponse<ValueResponse>>(`/values?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter, taxonomyFilter, agentFilter, valueStreamFilter, lifecycleStageFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, agentFilter, valueStreamFilter, lifecycleStageFilter, fetchData]);

  const handleCreate = async (input: CreateValueInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/values', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (value: ValueResponse) => {
    try {
      const full = await api.get<ValueResponse>(`/values/${value.id}`);
      setDuplicatingValue(full);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleDuplicateSubmit = async (input: CreateValueInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/values', input);
      toast.success(t('created'));
      setDuplicatingValue(null);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateValueInput) => {
    if (!editingValue) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/values/${editingValue.id}`, input);
      toast.success(t('updated'));
      setEditingValue(null);
      fetchData();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteValue) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/values/${deleteValue.id}`);
      toast.success(t('deleted'));
      setDeleteValue(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabels: Record<string, string> = {};
  for (const valueType of Object.values(ValueType)) {
    typeLabels[valueType] = t(typeTranslationKeys[valueType]);
  }

  const lifecycleStageLabels: Record<string, string> = {};
  for (const stage of Object.values(ValueLifecycleStage)) {
    lifecycleStageLabels[stage] = t(lifecycleTranslationKeys[stage]);
  }

  const columns = getValueColumns({
    onEdit: (value) => setEditingValue(value),
    onDuplicate: handleDuplicate,
    onDelete: (value) => setDeleteValue(value),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: tc('type'),
      taxonomy: t('taxonomy'),
      agent: t('agent'),
      valueStream: t('valueStream'),
      abstract: t('abstract'),
      lifecycleStage: t('lifecycleStage'),
      lifecycleStageLabels,
      image: t('image'),
      purpose: t('purpose'),
      created: tc('created'),
      edit: tc('edit'),
      duplicate: tc('duplicate'),
      delete: tc('delete'),
      typeLabels,
    },
  });

  const columnMeta = [
    { id: 'image', label: t('image') },
    { id: 'name', label: tc('name') },
    { id: 'type', label: tc('type') },
    { id: 'mainTaxonomy', label: t('taxonomy') },
    { id: 'agent', label: t('agent') },
    { id: 'valueStream', label: t('valueStream') },
    { id: 'purpose', label: t('purpose') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'type', label: tc('type'), extract: (r) => String(r.type ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'description', label: t('valueDescription'), extract: (r) => String(r.description ?? '') },
    { key: 'link', label: t('link'), extract: (r) => String(r.link ?? '') },
    { key: 'mainTaxonomy', label: t('taxonomy'), extract: (r) => {
      const mt = r.mainTaxonomy as { name?: string } | null;
      return mt?.name ?? '';
    }},
    { key: 'taxonomies', label: t('taxonomies'), extract: (r) => {
      const taxs = r.taxonomies as { name: string }[] | undefined;
      return taxs?.map((tx) => tx.name).join(', ') ?? '';
    }},
    { key: 'agent', label: t('agent'), extract: (r) => {
      const ag = r.agent as { name?: string } | null;
      return ag?.name ?? '';
    }},
    { key: 'valueStream', label: t('valueStream'), extract: (r) => {
      const vs = r.valueStream as { name?: string } | null;
      return vs?.name ?? '';
    }},
    { key: 'parent', label: t('parent'), extract: (r) => {
      const p = r.parent as { name?: string } | null;
      return p?.name ?? '';
    }},
    { key: 'parentType', label: t('parentType'), extract: (r) => String(r.parentType ?? '') },
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
    if (typeFilter && typeFilter !== 'all') qs += `&type=${typeFilter}`;
    if (taxonomyFilter && taxonomyFilter !== 'all') qs += `&taxonomyId=${taxonomyFilter}`;
    if (agentFilter && agentFilter !== 'all') qs += `&agentId=${agentFilter}`;
    if (valueStreamFilter && valueStreamFilter !== 'all') qs += `&valueStreamId=${valueStreamFilter}`;
    if (lifecycleStageFilter && lifecycleStageFilter !== 'all') qs += `&lifecycleStage=${lifecycleStageFilter}`;
    const result = await api.get<PaginatedResponse<ValueResponse>>(`/values?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, agentFilter, valueStreamFilter, lifecycleStageFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (typeFilter !== 'all') {
      filters.push({
        key: 'type',
        label: tc('type'),
        displayValue: t(typeTranslationKeys[typeFilter]),
        onClear: () => setTypeFilter('all'),
      });
    }
    if (taxonomyFilter !== 'all') {
      const node = flattenTree(tree).find((n) => n.id === taxonomyFilter);
      filters.push({
        key: 'taxonomy',
        label: t('taxonomy'),
        displayValue: node?.name ?? taxonomyFilter,
        onClear: () => setTaxonomyFilter('all'),
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
    if (valueStreamFilter !== 'all') {
      const vs = valueStreams.find((v) => v.id === valueStreamFilter);
      filters.push({
        key: 'valueStream',
        label: t('valueStream'),
        displayValue: vs?.name ?? valueStreamFilter,
        onClear: () => setValueStreamFilter('all'),
      });
    }
    if (lifecycleStageFilter !== 'all') {
      filters.push({
        key: 'lifecycleStage',
        label: t('lifecycleStage'),
        displayValue: t(lifecycleTranslationKeys[lifecycleStageFilter]),
        onClear: () => setLifecycleStageFilter('all'),
      });
    }
    return filters;
  }, [typeFilter, taxonomyFilter, agentFilter, valueStreamFilter, tc, t, tree, agents, valueStreams]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createValue')}
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
          filenameBase="values"
        />
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/values/graph">
            <Share2 className="mr-2 h-4 w-4" />
            {t('viewGraph')}
          </Link>
        </Button>
      </DataTableToolbar>

      <ActiveFilters filters={activeFilters} />

      <DataTableFilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="space-y-1">
          <label className="text-sm font-medium">{tc('type')}</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              {Object.values(ValueType).map((vt) => (
                <SelectItem key={vt} value={vt}>
                  {t(typeTranslationKeys[vt])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('taxonomy')}</label>
          <TaxonomyTreeSelect
            tree={tree}
            value={taxonomyFilter === 'all' ? null : taxonomyFilter}
            onSelect={(id) => setTaxonomyFilter(id ?? 'all')}
            placeholder={t('allTaxonomies')}
            noneLabel={t('allTaxonomies')}
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
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('lifecycleStage')}</label>
          <Select value={lifecycleStageFilter} onValueChange={setLifecycleStageFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('allLifecycleStages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allLifecycleStages')}</SelectItem>
              {Object.values(ValueLifecycleStage).map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {t(lifecycleTranslationKeys[stage])}
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
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(value) => router.push(`/admin/values/${value.id}`)} />
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

      <ValueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <ValueFormDialog
        open={!!editingValue}
        onOpenChange={(open) => !open && setEditingValue(null)}
        onSubmit={handleEdit}
        value={editingValue}
        isSubmitting={isSubmitting}
      />

      <ValueFormDialog
        open={!!duplicatingValue}
        onOpenChange={(open) => !open && setDuplicatingValue(null)}
        onSubmit={handleDuplicateSubmit}
        initialData={duplicatingValue}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteValue}
        onOpenChange={(open) => !open && setDeleteValue(null)}
        onConfirm={handleDelete}
        title={t('deleteValue')}
        description={tc('confirmDeleteDescription', { name: deleteValue?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
