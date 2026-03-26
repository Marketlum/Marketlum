'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useIsMobile } from '../../hooks/use-mobile';

interface TaxonomyTreeNodeProps {
  node: TaxonomyTreeNode;
  depth: number;
  onCreateChild: (parentId: string, data: { name: string; description?: string; link?: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; description?: string; link?: string }) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}

export function TaxonomyTreeNodeComponent({
  node,
  depth,
  onCreateChild,
  onUpdate,
  onDelete,
}: TaxonomyTreeNodeProps) {
  const t = useTranslations('taxonomies');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editDescription, setEditDescription] = useState(node.description ?? '');
  const [editLink, setEditLink] = useState(node.link ?? '');
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDescription, setNewChildDescription] = useState('');
  const [newChildLink, setNewChildLink] = useState('');

  const hasChildren = node.children && node.children.length > 0;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { name: node.name },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${node.id}`,
    data: { parentId: node.id },
  });

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedDesc = editDescription.trim();
    const trimmedLink = editLink.trim();

    const data: { name?: string; description?: string; link?: string } = {};
    if (trimmedName && trimmedName !== node.name) data.name = trimmedName;
    if (trimmedDesc !== (node.description ?? '')) data.description = trimmedDesc;
    if (trimmedLink !== (node.link ?? '')) data.link = trimmedLink;

    if (Object.keys(data).length === 0) {
      setEditing(false);
      setEditName(node.name);
      setEditDescription(node.description ?? '');
      setEditLink(node.link ?? '');
      return;
    }
    await onUpdate(node.id, data);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(node.name);
    setEditDescription(node.description ?? '');
    setEditLink(node.link ?? '');
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) return;
    const data: { name: string; description?: string; link?: string } = { name: newChildName.trim() };
    if (newChildDescription.trim()) data.description = newChildDescription.trim();
    if (newChildLink.trim()) data.link = newChildLink.trim();
    await onCreateChild(node.id, data);
    setNewChildName('');
    setNewChildDescription('');
    setNewChildLink('');
    setAddingChild(false);
    setExpanded(true);
  };

  const handleCancelAddChild = () => {
    setAddingChild(false);
    setNewChildName('');
    setNewChildDescription('');
    setNewChildLink('');
  };

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

        {editing ? (
          <div className="mx-1 flex flex-1 flex-col gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('taxonomyNamePlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
              autoFocus
            />
            <Input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('descriptionPlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <Input
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('linkPlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={handleSaveEdit}>
                {tc('save')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelEdit}>
                {tc('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-1 flex flex-1 items-start gap-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm">{node.name}</span>
                {node.link && (
                  <a
                    href={node.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {node.description && (
                <p className="truncate text-xs text-muted-foreground">{node.description}</p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
              onClick={() => {
                setAddingChild(true);
                setExpanded(true);
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
                <DropdownMenuItem
                  onClick={() => {
                    setAddingChild(true);
                    setExpanded(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addChild')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(node.name);
                    setEditDescription(node.description ?? '');
                    setEditLink(node.link ?? '');
                    setEditing(true);
                  }}
                >
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
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TaxonomyTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreateChild={onCreateChild}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {addingChild && (
        <div
          className="flex flex-col gap-1 py-1"
          style={{ paddingLeft: (depth + 1) * (isMobile ? 16 : 24) + 4 }}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4" />
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('childNamePlaceholder')}
              className="mx-1 h-7 w-full text-sm md:max-w-xs"
              autoFocus
            />
          </div>
          <div className="ml-6 md:ml-12 flex flex-col gap-1">
            <Input
              value={newChildDescription}
              onChange={(e) => setNewChildDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('descriptionPlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <Input
              value={newChildLink}
              onChange={(e) => setNewChildLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('linkPlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCreateChild}>
                {tc('save')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelAddChild}>
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
