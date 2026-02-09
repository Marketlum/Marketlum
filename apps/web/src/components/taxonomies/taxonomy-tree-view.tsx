'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { TaxonomyTreeNodeComponent } from './taxonomy-tree-node';

export function TaxonomyTreeView() {
  const t = useTranslations('taxonomies');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<TaxonomyTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateRoot = async () => {
    if (!newRootName.trim()) return;
    try {
      await api.post('/taxonomies', { name: newRootName.trim() });
      toast.success(t('rootCreated'));
      setNewRootName('');
      setAddingRoot(false);
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleCreateChild = async (parentId: string, name: string) => {
    try {
      await api.post('/taxonomies', { name, parentId });
      toast.success(t('created'));
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleUpdate = async (id: string, name: string) => {
    try {
      await api.patch(`/taxonomies/${id}`, { name });
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
        {addingRoot ? (
          <div className="flex items-center gap-2">
            <Input
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRoot();
                if (e.key === 'Escape') {
                  setAddingRoot(false);
                  setNewRootName('');
                }
              }}
              placeholder={t('taxonomyNamePlaceholder')}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleCreateRoot}>
              {tc('save')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAddingRoot(false);
                setNewRootName('');
              }}
            >
              {tc('cancel')}
            </Button>
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
