'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { TaxonomyTreeNodeComponent } from './taxonomy-tree-node';

export function TaxonomyTreeView() {
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
      toast.error('Failed to load taxonomies');
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
      toast.success('Root taxonomy created');
      setNewRootName('');
      setAddingRoot(false);
      fetchTree();
    } catch {
      toast.error('Failed to create taxonomy');
    }
  };

  const handleCreateChild = async (parentId: string, name: string) => {
    try {
      await api.post('/taxonomies', { name, parentId });
      toast.success('Taxonomy created');
      fetchTree();
    } catch {
      toast.error('Failed to create taxonomy');
    }
  };

  const handleUpdate = async (id: string, name: string) => {
    try {
      await api.patch(`/taxonomies/${id}`, { name });
      toast.success('Taxonomy updated');
      fetchTree();
    } catch {
      toast.error('Failed to update taxonomy');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/taxonomies/${deleteTarget.id}`);
      toast.success('Taxonomy deleted');
      setDeleteTarget(null);
      fetchTree();
    } catch {
      toast.error('Failed to delete taxonomy');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        Loading...
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
              placeholder="Taxonomy name..."
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleCreateRoot}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAddingRoot(false);
                setNewRootName('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setAddingRoot(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root
          </Button>
        )}
      </div>

      {tree.length === 0 && !addingRoot ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          No taxonomies yet. Click "Add Root" to get started.
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
        title="Delete Taxonomy"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all child taxonomies. This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
