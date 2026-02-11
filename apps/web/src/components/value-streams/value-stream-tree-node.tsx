'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ValueStreamTreeNode } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface ValueStreamTreeNodeProps {
  node: ValueStreamTreeNode;
  depth: number;
  onCreateChild: (parentId: string, data: { name: string; purpose?: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; purpose?: string }) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}

export function ValueStreamTreeNodeComponent({
  node,
  depth,
  onCreateChild,
  onUpdate,
  onDelete,
}: ValueStreamTreeNodeProps) {
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editPurpose, setEditPurpose] = useState(node.purpose ?? '');
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildPurpose, setNewChildPurpose] = useState('');

  const hasChildren = node.children && node.children.length > 0;

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedPurpose = editPurpose.trim();

    const data: { name?: string; purpose?: string } = {};
    if (trimmedName && trimmedName !== node.name) data.name = trimmedName;
    if (trimmedPurpose !== (node.purpose ?? '')) data.purpose = trimmedPurpose;

    if (Object.keys(data).length === 0) {
      setEditing(false);
      setEditName(node.name);
      setEditPurpose(node.purpose ?? '');
      return;
    }
    await onUpdate(node.id, data);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(node.name);
    setEditPurpose(node.purpose ?? '');
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) return;
    const data: { name: string; purpose?: string } = { name: newChildName.trim() };
    if (newChildPurpose.trim()) data.purpose = newChildPurpose.trim();
    await onCreateChild(node.id, data);
    setNewChildName('');
    setNewChildPurpose('');
    setAddingChild(false);
    setExpanded(true);
  };

  const handleCancelAddChild = () => {
    setAddingChild(false);
    setNewChildName('');
    setNewChildPurpose('');
  };

  return (
    <div>
      <div
        className="group flex items-start gap-1 rounded-md px-1 py-1 hover:bg-secondary/50"
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
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
              placeholder={t('namePlaceholder')}
              className="h-7 w-full text-sm md:max-w-xs"
              autoFocus
            />
            <Input
              value={editPurpose}
              onChange={(e) => setEditPurpose(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              placeholder={t('purposePlaceholder')}
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
                {node.lead && (
                  <span className="inline-flex items-center gap-0.5 shrink-0 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {node.lead.name}
                  </span>
                )}
              </div>
              {node.purpose && (
                <p className="truncate text-xs text-muted-foreground">{node.purpose}</p>
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
                    setEditPurpose(node.purpose ?? '');
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
            <ValueStreamTreeNodeComponent
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
              value={newChildPurpose}
              onChange={(e) => setNewChildPurpose(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') handleCancelAddChild();
              }}
              placeholder={t('purposePlaceholder')}
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
