'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ActorResponse, PaginatedResponse, CreateActorInput, PerspectiveConfig } from '@marketlum/shared';
import { ActorType } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { useTaxonomyTree } from '../../hooks/use-taxonomy-tree';
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
import { usePermissions } from '../../permissions/permissions-context';
import { ActorFormDialog } from './actor-form-dialog';
import { getActorColumns } from './columns';
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
import { SlidersHorizontal, MapIcon } from 'lucide-react';
import Link from 'next/link';
import type { TaxonomyTreeNode } from '@marketlum/shared';

function flattenTree(nodes: TaxonomyTreeNode[]): TaxonomyTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

const typeTranslationKeys: Record<string, string> = {
  [ActorType.ORGANIZATION]: 'typeOrganization',
  [ActorType.INDIVIDUAL]: 'typeIndividual',
  [ActorType.VIRTUAL]: 'typeVirtual',
};

export function ActorsDataTable() {
  const router = useRouter();
  const pagination = usePagination();
  const debouncedSearch = useDebounce(pagination.search, 300);
  const t = useTranslations('actors');
  const tc = useTranslations('common');
  const tp = useTranslations('perspectives');
  const tam = useTranslations('actorsMap');
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canWrite = can('actors', 'write');
  const { tree } = useTaxonomyTree();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<PaginatedResponse<ActorResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<ActorResponse | null>(null);
  const [deleteActor, setDeleteActor] = useState<ActorResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const onApplyPerspective = useCallback((config: PerspectiveConfig) => {
    setColumnVisibility(config.columnVisibility ?? {});
    setTypeFilter(config.filters?.type ?? 'all');
    setTaxonomyFilter(config.filters?.taxonomyId ?? 'all');
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
    table: 'actors',
    onApply: onApplyPerspective,
    translations: perspectiveTranslations,
  });

  const getCurrentConfig = useCallback((): PerspectiveConfig => ({
    columnVisibility,
    filters: {
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(taxonomyFilter !== 'all' ? { taxonomyId: taxonomyFilter } : {}),
    },
    sort: pagination.sortBy ? { sortBy: pagination.sortBy, sortOrder: pagination.sortOrder } : null,
  }), [columnVisibility, typeFilter, taxonomyFilter, pagination.sortBy, pagination.sortOrder]);

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
      const result = await api.get<PaginatedResponse<ActorResponse>>(`/actors?${qs}`);
      setData(result);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [pagination.toQueryString, typeFilter, taxonomyFilter]);

  useEffect(() => {
    fetchData();
  }, [debouncedSearch, pagination.page, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter, fetchData]);

  const handleCreate = async (input: CreateActorInput) => {
    setIsSubmitting(true);
    try {
      await api.post('/actors', input);
      toast.success(t('created'));
      setFormOpen(false);
      fetchData();
    } catch {
      toast.error(t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateActorInput) => {
    if (!editingActor) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/actors/${editingActor.id}`, input);
      toast.success(t('updated'));
      setEditingActor(null);
      fetchData();
    } catch {
      toast.error(t('failedToUpdate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteActor) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/actors/${deleteActor.id}`);
      toast.success(t('deleted'));
      setDeleteActor(null);
      fetchData();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabels: Record<string, string> = {};
  for (const actorType of Object.values(ActorType)) {
    typeLabels[actorType] = t(typeTranslationKeys[actorType]);
  }

  const allColumns = getActorColumns({
    onEdit: (actor) => setEditingActor(actor),
    onDelete: (actor) => setDeleteActor(actor),
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      type: tc('type'),
      taxonomy: t('taxonomy'),
      parent: t('parent'),
      image: t('image'),
      purpose: t('purpose'),
      created: tc('created'),
      edit: tc('edit'),
      delete: tc('delete'),
      typeLabels,
    },
  });
  const columns = canWrite ? allColumns : allColumns.filter((c) => c.id !== 'actions');

  const columnMeta = [
    { id: 'image', label: t('image') },
    { id: 'name', label: tc('name') },
    { id: 'type', label: tc('type') },
    { id: 'mainTaxonomy', label: t('taxonomy') },
    { id: 'parent', label: t('parent') },
    { id: 'purpose', label: t('purpose') },
    { id: 'createdAt', label: tc('created') },
  ];

  const allExportFields: FieldDef[] = [
    { key: 'name', label: tc('name'), extract: (r) => String(r.name ?? '') },
    { key: 'type', label: tc('type'), extract: (r) => String(r.type ?? '') },
    { key: 'purpose', label: t('purpose'), extract: (r) => String(r.purpose ?? '') },
    { key: 'mainTaxonomy', label: t('taxonomy'), extract: (r) => {
      const mt = r.mainTaxonomy as { name?: string } | null;
      return mt?.name ?? '';
    }},
    { key: 'taxonomies', label: t('taxonomies'), extract: (r) => {
      const taxs = r.taxonomies as { name: string }[] | undefined;
      return taxs?.map((tx) => tx.name).join(', ') ?? '';
    }},
    { key: 'parent', label: t('parent'), extract: (r) => {
      const parent = r.parent as { name: string } | null | undefined;
      return parent?.name ?? '';
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
    if (typeFilter && typeFilter !== 'all') qs += `&type=${typeFilter}`;
    if (taxonomyFilter && taxonomyFilter !== 'all') qs += `&taxonomyId=${taxonomyFilter}`;
    const result = await api.get<PaginatedResponse<ActorResponse>>(`/actors?${qs}`);
    return result.data as unknown as Record<string, unknown>[];
  }, [pagination.search, pagination.sortBy, pagination.sortOrder, typeFilter, taxonomyFilter]);

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
    return filters;
  }, [typeFilter, taxonomyFilter, tc, t, tree]);

  const activeFilterCount = activeFilters.length;

  return (
    <div>
      <DataTableToolbar
        searchValue={pagination.search}
        onSearchChange={pagination.setSearch}
        onCreateClick={canWrite ? () => setFormOpen(true) : undefined}
        createLabel={canWrite ? t('createActor') : undefined}
        primaryActions={
          <Link href="/admin/actors/map">
            <Button variant="outline" className="w-full sm:w-auto">
              <MapIcon className="mr-2 h-4 w-4" />
              {tam('viewMap')}
            </Button>
          </Link>
        }
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
          filenameBase="actors"
        />
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
              {Object.values(ActorType).map((actorType) => (
                <SelectItem key={actorType} value={actorType}>
                  {t(typeTranslationKeys[actorType])}
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
      </DataTableFilterSheet>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">{tc('loading')}</div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data ?? []} columnVisibility={mergedVisibility} onRowClick={(actor) => router.push(`/admin/actors/${actor.id}`)} />
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

      <ActorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <ActorFormDialog
        open={!!editingActor}
        onOpenChange={(open) => !open && setEditingActor(null)}
        onSubmit={handleEdit}
        actor={editingActor}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteActor}
        onOpenChange={(open) => !open && setDeleteActor(null)}
        onConfirm={handleDelete}
        title={t('deleteActor')}
        description={tc('confirmDeleteDescription', { name: deleteActor?.name ?? '' })}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
