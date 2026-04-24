'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, List, CircleDot } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ValueStreamTreeNode, CreateValueStreamInput, ValueStreamResponse } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ConfirmDeleteDialog } from '../shared/confirm-delete-dialog';
import { ValueStreamTreeNodeComponent } from './value-stream-tree-node';
import { ValueStreamFormDialog } from './value-stream-form-dialog';
import { ValueStreamCirclePacking } from './value-stream-circle-packing';
import { useDebounce } from '../../hooks/use-debounce';

function filterTree(nodes: ValueStreamTreeNode[], term: string): ValueStreamTreeNode[] {
  const lower = term.toLowerCase();

  return nodes.reduce<ValueStreamTreeNode[]>((acc, node) => {
    const nameMatch = node.name.toLowerCase().includes(lower);
    const purposeMatch = node.purpose ? node.purpose.toLowerCase().includes(lower) : false;
    const selfMatch = nameMatch || purposeMatch;
    const filteredChildren = filterTree(node.children ?? [], term);

    if (selfMatch || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children ?? [] });
    }

    return acc;
  }, []);
}

export function ValueStreamTreeView() {
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');
  const [viewMode, setViewMode] = useState<'tree' | 'circles'>('tree');
  const [tree, setTree] = useState<ValueStreamTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formEditTarget, setFormEditTarget] = useState<ValueStreamResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSearching = debouncedSearch.length > 0;

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<ValueStreamTreeNode[]>('/value-streams/tree');
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

  const handleOpenEdit = async (node: ValueStreamTreeNode) => {
    try {
      const full = await api.get<ValueStreamResponse>(`/value-streams/${node.id}`);
      setFormEditTarget(full);
      setFormParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (data: CreateValueStreamInput) => {
    setIsSubmitting(true);
    try {
      if (formEditTarget) {
        await api.patch(`/value-streams/${formEditTarget.id}`, data);
        toast.success(t('updated'));
      } else {
        await api.post('/value-streams', data);
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
      await api.delete(`/value-streams/${deleteTarget.id}`);
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
        <div className="flex rounded-md border">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`inline-flex items-center justify-center p-2 rounded-l-md transition-colors ${viewMode === 'tree' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title={t('treeView')}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('circles')}
            className={`inline-flex items-center justify-center p-2 rounded-r-md transition-colors ${viewMode === 'circles' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title={t('circleView')}
          >
            <CircleDot className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addRoot')}
        </Button>
      </div>

      {viewMode === 'circles' ? (
        <ValueStreamCirclePacking tree={filteredTree} />
      ) : filteredTree.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          {isSearching ? t('noResults') : t('emptyState')}
        </div>
      ) : (
        <div className="rounded-md border p-2">
          {filteredTree.map((node) => (
            <ValueStreamTreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              onEdit={handleOpenEdit}
              onAddChild={handleOpenAddChild}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              searchTerm={isSearching ? debouncedSearch : undefined}
              forceExpanded={isSearching}
            />
          ))}
        </div>
      )}

      <ValueStreamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        valueStream={formEditTarget}
        parentId={formParentId}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteValueStream')}
        description={t('deleteWithChildren', { name: deleteTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
