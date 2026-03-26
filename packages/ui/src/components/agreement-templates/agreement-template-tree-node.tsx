'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { AgreementTemplateTreeNode } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useIsMobile } from '../../hooks/use-mobile';

interface AgreementTemplateTreeNodeProps {
  node: AgreementTemplateTreeNode;
  depth: number;
  onEdit: (node: AgreementTemplateTreeNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function AgreementTemplateTreeNodeComponent({
  node,
  depth,
  onEdit,
  onAddChild,
  onDelete,
}: AgreementTemplateTreeNodeProps) {
  const t = useTranslations('agreementTemplates');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;

  const typeLabels: Record<string, string> = {
    main_agreement: t('typeMainAgreement'),
    annex: t('typeAnnex'),
    schedule: t('typeSchedule'),
    exhibit: t('typeExhibit'),
  };

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { name: node.name },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: { parentId: node.id },
  });

  return (
    <div ref={setDropRef} className={isOver ? 'rounded-md bg-primary/10' : ''}>
      <div
        ref={setDragRef}
        className={`group flex items-start gap-1 rounded-md px-1 py-1 hover:bg-secondary/50 ${isDragging ? 'opacity-50' : ''}`}
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
        <button
          className="mt-0.5 flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/50 hover:text-muted-foreground md:opacity-0 md:group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="mx-1 flex flex-1 items-start gap-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm">{node.name}</span>
              <Badge variant="outline" className="shrink-0 text-xs">
                {typeLabels[node.type] ?? node.type}
              </Badge>
            </div>
            {node.valueStream && (
              <p className="truncate text-xs text-muted-foreground">{node.valueStream.name}</p>
            )}
            {node.purpose && !node.valueStream && (
              <p className="truncate text-xs text-muted-foreground">{node.purpose}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
            onClick={() => {
              onAddChild(node.id);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddChild(node.id)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addChild')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="mr-2 h-4 w-4" />
                {tc('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(node.id, node.name)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AgreementTemplateTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
