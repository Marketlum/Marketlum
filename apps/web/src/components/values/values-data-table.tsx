'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ValueResponse, PaginatedResponse, CreateValueInput, PerspectiveConfig } from '@marketlum/shared';
import { ValueType } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { useTaxonomyTree } from '@/hooks/use-taxonomy-tree';
import { useAgents } from '@/hooks/use-agents';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { usePerspectives } from '@/hooks/use-perspectives';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { DataTableToolbar } from '@/components/shared/data-table-toolbar';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { ColumnVisibilityDropdown } from '@/components/shared/column-visibility-dropdown';
import { PerspectiveSelector } from '@/components/shared/perspective-selector';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility, mergeColumnVisibility } from '@/lib/column-visibility';
import { ValueFormDialog } from './value-form-dialog';
import { getValueColumns } from './columns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaxonomyTreeSelect } from '@/components/shared/taxonomy-tree-select';
import { ExportDropdown } from '@/components/shared/export-dropdown';
import type { FieldDef } from '@/lib/export-utils';

const typeTranslationKeys: Record<string, string> = {
  [ValueType.PRODUCT]: 'typeProduct',
  [ValueType.SERVICE]: 'typeService',
  [ValueType.RELATIONSHIP]: 'typeRelationship',
  [ValueType.RIGHT]: 'typeRight',
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ValueResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<ValueResponse | null>(null);
  const [deleteValue, setDeleteValue] = useState<ValueResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setTypeFilter(config.filters?.type ?? 'all');
    setTaxonomyFilter(config.filters?.taxonomyId ?? 'all');
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
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, typeFilter, taxonomyFilter, agentFilter, pagination.sortBy, pagination.sortOrder]);

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
      const result = await api.get<PaginatedResponse<ValueResponse>>(`/values?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter, taxonomyFilter, agentFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, agentFilter, fetchData]);

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

  const columns = getValueColumns({
    onEdit: (value) => setEditingValue(value),
    onDelete: (value) => setDeleteValue(value),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: tc('type'),
      taxonomy: t('taxonomy'),
      agent: t('agent'),
      image: t('image'),
      purpose: t('purpose'),
      created: tc('created'),
      edit: tc('edit'),
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
    const result = await api.get<PaginatedResponse<ValueResponse>>(`/values?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, agentFilter]);

  const mobileVisibility = getMobileColumnVisibility(columns, isMobile);
  const mergedVisibility = mergeColumnVisibility(columnVisibility, mobileVisibility);

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={() => setFormOpen(true)}
        createLabel={t('createValue')}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
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
        <TaxonomyTreeSelect
          tree={tree}
          value={taxonomyFilter === 'all' ? null : taxonomyFilter}
          onSelect={(id) => setTaxonomyFilter(id ?? 'all')}
          placeholder={t('allTaxonomies')}
          noneLabel={t('allTaxonomies')}
          className="w-[180px]"
        />
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[150px]">
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
      </DataTableToolbar>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(value) => router.push(`/app/values/${value.id}`)} />
          {data && (
            <DataTablePagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={pagination.setPage}
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
