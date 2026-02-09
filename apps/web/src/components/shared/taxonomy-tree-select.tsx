'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Check, ChevronsUpDown } from 'lucide-react';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function flattenTree(nodes: TaxonomyTreeNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  function walk(list: TaxonomyTreeNode[]) {
    for (const node of list) {
      map[node.id] = node.name;
      if (node.children?.length) walk(node.children);
    }
  }
  walk(nodes);
  return map;
}

interface TreeNodeProps {
  node: TaxonomyTreeNode;
  depth: number;
  multiple?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect: (id: string) => void;
}

function TreeNode({ node, depth, multiple, selectedId, selectedIds, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = multiple
    ? selectedIds?.includes(node.id)
    : selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-sm px-1 py-1 text-sm hover:bg-accent cursor-pointer',
          !multiple && isSelected && 'bg-accent',
        )}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => onSelect(node.id)}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
            />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <span className="flex-1 truncate">{node.name}</span>

        {multiple && (
          <Check
            className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
          />
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              multiple={multiple}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaxonomyTreeSelectProps {
  tree: TaxonomyTreeNode[];
  placeholder: string;
  multiple?: boolean;
  value?: string | null;
  values?: string[];
  onSelect?: (id: string | null) => void;
  onToggle?: (id: string) => void;
  noneLabel?: string;
  className?: string;
}

export function TaxonomyTreeSelect({
  tree,
  placeholder,
  multiple,
  value,
  values,
  onSelect,
  onToggle,
  noneLabel,
  className,
}: TaxonomyTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const nameMap = flattenTree(tree);

  let triggerLabel: string;
  if (multiple) {
    const names = (values ?? []).map((id) => nameMap[id]).filter(Boolean);
    triggerLabel = names.length > 0 ? names.join(', ') : placeholder;
  } else {
    triggerLabel = value ? nameMap[value] ?? placeholder : placeholder;
  }

  const handleNodeSelect = (id: string) => {
    if (multiple) {
      onToggle?.(id);
    } else {
      onSelect?.(id);
      setOpen(false);
    }
  };

  const handleNoneSelect = () => {
    onSelect?.(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2" align="start">
        <div className="max-h-60 overflow-y-auto">
          {!multiple && noneLabel && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-sm px-1 py-1 text-sm hover:bg-accent cursor-pointer',
                !value && 'bg-accent',
              )}
              style={{ paddingLeft: 4 }}
              onClick={handleNoneSelect}
            >
              <span className="h-5 w-5 shrink-0" />
              <span className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{noneLabel}</span>
            </div>
          )}
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              multiple={multiple}
              selectedId={value}
              selectedIds={values}
              onSelect={handleNodeSelect}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
