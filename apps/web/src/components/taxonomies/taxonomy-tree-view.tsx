'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { TaxonomyTreeNode, TaxonomyResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { DataTablePagination } from '@/components/shared/data-table-pagination';
import { TaxonomyTreeNodeComponent } from './taxonomy-tree-node';
import { getTaxonomySearchColumns } from './taxonomy-search-columns';
import { usePagination } from '@/hooks/use-pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { getMobileColumnVisibility } from '@/lib/column-visibility';

export function TaxonomyTreeView() {
  const t = useTranslations('taxonomies');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<TaxonomyTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [newRootDescription, setNewRootDescription] = useState('');
  const [newRootLink, setNewRootLink] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const pagination = usePagination();
  const [searchResults, setSearchResults] = useState<PaginatedResponse<TaxonomyResponse> | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const isMobile = useIsMobile();

  const isSearching = debouncedSearch.length > 0;

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<TaxonomyTreeNode[]>('/taxonomies/tree');
      setTree(data);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Fetch search results when search term or pagination changes
  useEffect(() => {
    if (!isSearching) {
      setSearchResults(null);
      return;
    }

    const fetchSearch = async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('search', debouncedSearch);
        params.set('page', String(pagination.page));
        params.set('limit', String(pagination.limit));
        if (pagination.sortBy) {
          params.set('sortBy', pagination.sortBy);
          params.set('sortOrder', pagination.sortOrder);
        }
        const data = await api.get<PaginatedResponse<TaxonomyResponse>>(
          `/taxonomies/search?${params.toString()}`,
        );
        setSearchResults(data);
      } catch {
        toast.error(t('failedToLoad'));
      } finally {
        setSearchLoading(false);
      }
    };

    fetchSearch();
  }, [debouncedSearch, pagination.page, pagination.limit, pagination.sortBy, pagination.sortOrder]);

  // Reset page when search changes
  useEffect(() => {
    pagination.setPage(1);
  }, [debouncedSearch]);

  const columns = getTaxonomySearchColumns({
    onSort: pagination.setSort,
    translations: {
      name: tc('name'),
      description: t('description'),
      link: t('link'),
      created: tc('created'),
    },
  });

  const handleCreateRoot = async () => {
    if (!newRootName.trim()) return;
    try {
      const body: Record<string, string> = { name: newRootName.trim() };
      if (newRootDescription.trim()) body.description = newRootDescription.trim();
      if (newRootLink.trim()) body.link = newRootLink.trim();
      await api.post('/taxonomies', body);
      toast.success(t('rootCreated'));
      setNewRootName('');
      setNewRootDescription('');
      setNewRootLink('');
      setAddingRoot(false);
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleCancelAddRoot = () => {
    setAddingRoot(false);
    setNewRootName('');
    setNewRootDescription('');
    setNewRootLink('');
  };

  const handleCreateChild = async (parentId: string, data: { name: string; description?: string; link?: string }) => {
    try {
      await api.post('/taxonomies', { ...data, parentId });
      toast.success(t('created'));
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; link?: string }) => {
    try {
      await api.patch(`/taxonomies/${id}`, data);
      toast.success(t('updated'));
      fetchTree();
    } catch {
      toast.error(t('failedToUpdate'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/taxonomies/${deleteTarget.id}`);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchTree();
    } catch {
      toast.error(t('failedToDelete'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tc('search')}
            className="pl-8"
          />
        </div>
      </div>

      {isSearching ? (
        <div>
          {searchLoading ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              {tc('loading')}
            </div>
          ) : searchResults ? (
            <>
              <DataTable columns={columns} data={searchResults.data} columnVisibility={getMobileColumnVisibility(columns, isMobile)} />
              <DataTablePagination
                page={searchResults.meta.page}
                totalPages={searchResults.meta.totalPages}
                total={searchResults.meta.total}
                onPageChange={pagination.setPage}
              />
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-4">
            {addingRoot ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={newRootName}
                  onChange={(e) => setNewRootName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRoot();
                    if (e.key === 'Escape') handleCancelAddRoot();
                  }}
                  placeholder={t('taxonomyNamePlaceholder')}
                  className="w-full md:max-w-xs"
                  autoFocus
                />
                <Input
                  value={newRootDescription}
                  onChange={(e) => setNewRootDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRoot();
                    if (e.key === 'Escape') handleCancelAddRoot();
                  }}
                  placeholder={t('descriptionPlaceholder')}
                  className="w-full md:max-w-xs"
                />
                <Input
                  value={newRootLink}
                  onChange={(e) => setNewRootLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRoot();
                    if (e.key === 'Escape') handleCancelAddRoot();
                  }}
                  placeholder={t('linkPlaceholder')}
                  className="w-full md:max-w-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateRoot}>
                    {tc('save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelAddRoot}>
                    {tc('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setAddingRoot(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addRoot')}
              </Button>
            )}
          </div>

          {tree.length === 0 && !addingRoot ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              {t('emptyState')}
            </div>
          ) : (
            <div className="rounded-md border p-2">
              {tree.map((node) => (
                <TaxonomyTreeNodeComponent
                  key={node.id}
                  node={node}
                  depth={0}
                  onCreateChild={handleCreateChild}
                  onUpdate={handleUpdate}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteTaxonomy')}
        description={t('deleteWithChildren', { name: deleteTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
