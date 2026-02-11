'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { AgreementTreeNode, CreateAgreementInput, AgreementResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { AgreementTreeNodeComponent } from './agreement-tree-node';
import { AgreementFormDialog } from './agreement-form-dialog';
import { useDebounce } from '@/hooks/use-debounce';

function filterTree(nodes: AgreementTreeNode[], term: string): AgreementTreeNode[] {
  const lower = term.toLowerCase();

  return nodes.reduce<AgreementTreeNode[]>((acc, node) => {
    const titleMatch = node.title.toLowerCase().includes(lower);
    const contentMatch = node.content ? node.content.toLowerCase().includes(lower) : false;
    const selfMatch = titleMatch || contentMatch;
    const filteredChildren = filterTree(node.children ?? [], term);

    if (selfMatch || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children ?? [] });
    }

    return acc;
  }, []);
}

export function AgreementTreeView() {
  const t = useTranslations('agreements');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<AgreementTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formEditTarget, setFormEditTarget] = useState<AgreementResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearching = debouncedSearch.length > 0;

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<AgreementTreeNode[]>('/agreements/tree');
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

  const filteredTree = useMemo(() => {
    if (!isSearching) return tree;
    return filterTree(tree, debouncedSearch);
  }, [tree, debouncedSearch, isSearching]);

  const handleOpenCreate = () => {
    setFormEditTarget(null);
    setFormParentId(null);
    setFormOpen(true);
  };

  const handleOpenAddChild = (parentId: string) => {
    setFormEditTarget(null);
    setFormParentId(parentId);
    setFormOpen(true);
  };

  const handleOpenEdit = async (node: AgreementTreeNode) => {
    try {
      const full = await api.get<AgreementResponse>(`/agreements/${node.id}`);
      setFormEditTarget(full);
      setFormParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (data: CreateAgreementInput) => {
    setIsSubmitting(true);
    try {
      if (formEditTarget) {
        await api.patch(`/agreements/${formEditTarget.id}`, data);
        toast.success(t('updated'));
      } else {
        await api.post('/agreements', data);
        toast.success(formParentId ? t('created') : t('rootCreated'));
      }
      setFormOpen(false);
      fetchTree();
    } catch {
      toast.error(formEditTarget ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/agreements/${deleteTarget.id}`);
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
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tc('search')}
            className="pl-8"
          />
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addRoot')}
        </Button>
      </div>

      {filteredTree.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {isSearching ? t('noResults') : t('emptyState')}
        </div>
      ) : (
        <div className="rounded-md border p-2">
          {filteredTree.map((node) => (
            <AgreementTreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              onEdit={handleOpenEdit}
              onAddChild={handleOpenAddChild}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
              searchTerm={isSearching ? debouncedSearch : undefined}
              forceExpanded={isSearching}
            />
          ))}
        </div>
      )}

      <AgreementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        agreement={formEditTarget}
        parentId={formParentId}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteAgreement')}
        description={t('deleteWithChildren', { name: deleteTarget?.title ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
