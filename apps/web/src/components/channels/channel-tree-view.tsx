'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ChannelTreeNode, CreateChannelInput, ChannelResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { ChannelTreeNodeComponent } from './channel-tree-node';
import { ChannelFormDialog } from './channel-form-dialog';

export function ChannelTreeView() {
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<ChannelTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formEditTarget, setFormEditTarget] = useState<ChannelResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<ChannelTreeNode[]>('/channels/tree');
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

  const handleOpenEdit = async (node: ChannelTreeNode) => {
    try {
      const full = await api.get<ChannelResponse>(`/channels/${node.id}`);
      setFormEditTarget(full);
      setFormParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (data: CreateChannelInput) => {
    setIsSubmitting(true);
    try {
      if (formEditTarget) {
        await api.patch(`/channels/${formEditTarget.id}`, data);
        toast.success(t('updated'));
      } else {
        await api.post('/channels', data);
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
      await api.delete(`/channels/${deleteTarget.id}`);
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
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addRoot')}
        </Button>
      </div>

      {tree.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {t('emptyState')}
        </div>
      ) : (
        <div className="rounded-md border p-2">
          {tree.map((node) => (
            <ChannelTreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              onEdit={handleOpenEdit}
              onAddChild={handleOpenAddChild}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
            />
          ))}
        </div>
      )}

      <ChannelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        channel={formEditTarget}
        parentId={formParentId}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteChannel')}
        description={t('deleteWithChildren', { name: deleteTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
