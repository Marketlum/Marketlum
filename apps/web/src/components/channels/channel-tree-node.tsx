'use client';

import { useState } from 'react';
import { ChevronRight, FolderOpen, Folder, Hash, MoreHorizontal, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ChannelTreeNode } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChannelTreeNodeProps {
  node: ChannelTreeNode;
  depth: number;
  onEdit: (node: ChannelTreeNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function ChannelTreeNodeComponent({
  node,
  depth,
  onEdit,
  onAddChild,
  onDelete,
}: ChannelTreeNodeProps) {
  const t = useTranslations('channels');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;

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
        className={`group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-secondary/50 ${isDragging ? 'opacity-50' : ''}`}
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
        <button
          className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/50 hover:text-muted-foreground md:opacity-0 md:group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
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
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : hasChildren ? (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div
          className="h-3 w-3 shrink-0 rounded-full border"
          style={{ backgroundColor: node.color }}
        />

        <div className="mx-1 flex flex-1 items-center gap-1 overflow-hidden">
          <span className="truncate text-sm">{node.name}</span>
          {node.agent && (
            <span className="truncate text-xs text-muted-foreground">
              ({node.agent.name})
            </span>
          )}
        </div>

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

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ChannelTreeNodeComponent
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
