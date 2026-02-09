'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaxonomyTreeNodeProps {
  node: TaxonomyTreeNode;
  depth: number;
  onCreateChild: (parentId: string, name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}

export function TaxonomyTreeNodeComponent({
  node,
  depth,
  onCreateChild,
  onUpdate,
  onDelete,
}: TaxonomyTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');

  const hasChildren = node.children && node.children.length > 0;

  const handleSaveEdit = async () => {
    if (!editName.trim() || editName.trim() === node.name) {
      setEditing(false);
      setEditName(node.name);
      return;
    }
    await onUpdate(node.id, editName.trim());
    setEditing(false);
  };

  const handleCreateChild = async () => {
    if (!newChildName.trim()) return;
    await onCreateChild(node.id, newChildName.trim());
    setNewChildName('');
    setAddingChild(false);
    setExpanded(true);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-secondary/50"
        style={{ paddingLeft: depth * 24 + 4 }}
      >
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
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {editing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditing(false);
                setEditName(node.name);
              }
            }}
            onBlur={handleSaveEdit}
            className="mx-1 h-7 max-w-xs text-sm"
            autoFocus
          />
        ) : (
          <span className="mx-1 flex-1 truncate text-sm">{node.name}</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
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
              Add child
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditName(node.name);
                setEditing(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(node.id, node.name)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: (depth + 1) * 24 + 4 }}
        >
          <span className="h-4 w-4" />
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChild();
              if (e.key === 'Escape') {
                setAddingChild(false);
                setNewChildName('');
              }
            }}
            placeholder="Child name..."
            className="mx-1 h-7 max-w-xs text-sm"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-7" onClick={handleCreateChild}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => {
              setAddingChild(false);
              setNewChildName('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
