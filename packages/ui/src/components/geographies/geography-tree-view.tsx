'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { GeographyTreeNode } from '@marketlum/shared';
import { GeographyType } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { GeographyTreeNodeComponent } from './geography-tree-node';

export function GeographyTreeView() {
  const t = useTranslations('geographies');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<GeographyTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [newRootCode, setNewRootCode] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<GeographyTreeNode[]>('/geographies/tree');
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
    if (!newRootName.trim() || !newRootCode.trim()) return;
    try {
      await api.post('/geographies', {
        name: newRootName.trim(),
        code: newRootCode.trim(),
        type: GeographyType.PLANET,
      });
      toast.success(t('rootCreated'));
      setNewRootName('');
      setNewRootCode('');
      setAddingRoot(false);
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleCancelAddRoot = () => {
    setAddingRoot(false);
    setNewRootName('');
    setNewRootCode('');
  };

  const handleCreateChild = async (
    parentId: string,
    data: { name: string; code: string; type: GeographyType },
  ) => {
    try {
      await api.post('/geographies', { ...data, parentId });
      toast.success(t('created'));
      fetchTree();
    } catch {
      toast.error(t('failedToCreate'));
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; code?: string }) => {
    try {
      await api.patch(`/geographies/${id}`, data);
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
      await api.delete(`/geographies/${deleteTarget.id}`);
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
          <div className="flex flex-col gap-2">
            <Input
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRoot();
                if (e.key === 'Escape') handleCancelAddRoot();
              }}
              placeholder={t('namePlaceholder')}
              className="w-full md:max-w-xs"
              autoFocus
            />
            <Input
              value={newRootCode}
              onChange={(e) => setNewRootCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRoot();
                if (e.key === 'Escape') handleCancelAddRoot();
              }}
              placeholder={t('codePlaceholder')}
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
            <GeographyTreeNodeComponent
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
        title={t('deleteGeography')}
        description={t('deleteWithChildren', { name: deleteTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
