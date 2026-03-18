'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import type { AgreementTemplateTreeNode, CreateAgreementTemplateInput, AgreementTemplateResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { AgreementTemplateTreeNodeComponent } from './agreement-template-tree-node';
import { AgreementTemplateFormDialog } from './agreement-template-form-dialog';

function RootDropZone({ children }: { children: React.ReactNode }) {
  const t = useTranslations('agreementTemplates');
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-root', data: { parentId: null } });

  return (
    <div ref={setNodeRef}>
      {children}
      <div className={`mt-2 rounded-md border-2 border-dashed p-3 text-center text-sm transition-colors ${isOver ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-transparent'}`}>
        {t('dropHere')}
      </div>
    </div>
  );
}

export function AgreementTemplateTreeView() {
  const t = useTranslations('agreementTemplates');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<AgreementTemplateTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedName, setDraggedName] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formEditTarget, setFormEditTarget] = useState<AgreementTemplateResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<AgreementTemplateTreeNode[]>('/agreement-templates/tree');
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

  const handleOpenEdit = async (node: AgreementTemplateTreeNode) => {
    try {
      const full = await api.get<AgreementTemplateResponse>(`/agreement-templates/${node.id}`);
      setFormEditTarget(full);
      setFormParentId(null);
      setFormOpen(true);
    } catch {
      toast.error(t('failedToLoad'));
    }
  };

  const handleFormSubmit = async (data: CreateAgreementTemplateInput) => {
    setIsSubmitting(true);
    try {
      if (formEditTarget) {
        await api.patch(`/agreement-templates/${formEditTarget.id}`, data);
        toast.success(t('updated'));
      } else {
        await api.post('/agreement-templates', data);
        toast.success(formParentId ? t('created') : t('rootCreated'));
      }
      setFormOpen(false);
      setFormEditTarget(null);
      fetchTree();
    } catch {
      toast.error(formEditTarget ? t('failedToUpdate') : t('failedToCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedName(event.active.data.current?.name ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedName(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const targetParentId = over.data.current?.parentId as string | null;

    if (targetParentId === draggedId) return;
    const dropTargetId = (over.id as string).replace('drop-', '');
    if (dropTargetId === draggedId) return;

    try {
      await api.patch(`/agreement-templates/${draggedId}/move`, { parentId: targetParentId });
      toast.success(t('moved'));
      fetchTree();
    } catch {
      toast.error(t('failedToMove'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/agreement-templates/${deleteTarget.id}`);
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <RootDropZone>
            <div className="rounded-md border p-2">
              {tree.map((node) => (
                <AgreementTemplateTreeNodeComponent
                  key={node.id}
                  node={node}
                  depth={0}
                  onEdit={handleOpenEdit}
                  onAddChild={handleOpenAddChild}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              ))}
            </div>
          </RootDropZone>
          <DragOverlay>
            {draggedName ? (
              <div className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-md">
                {draggedName}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <AgreementTemplateFormDialog
        open={formOpen && !formEditTarget}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        parentId={formParentId}
        isSubmitting={isSubmitting}
      />

      <AgreementTemplateFormDialog
        open={!!formEditTarget}
        onOpenChange={(open) => { if (!open) { setFormEditTarget(null); setFormOpen(false); } }}
        onSubmit={handleFormSubmit}
        template={formEditTarget}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteTemplate')}
        description={t('deleteConfirmation', { name: deleteTarget?.name ?? '' })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
