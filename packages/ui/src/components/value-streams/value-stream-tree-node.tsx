'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { ValueStreamTreeNode } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { FileImagePreview } from '../shared/file-image-preview';
import { useIsMobile } from '../../hooks/use-mobile';

interface ValueStreamTreeNodeProps {
  node: ValueStreamTreeNode;
  depth: number;
  onEdit: (node: ValueStreamTreeNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, name: string) => void;
  searchTerm?: string;
  forceExpanded?: boolean;
}

export function ValueStreamTreeNodeComponent({
  node,
  depth,
  onEdit,
  onAddChild,
  onDelete,
  searchTerm,
  forceExpanded,
}: ValueStreamTreeNodeProps) {
  const t = useTranslations('valueStreams');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = forceExpanded || expanded;

  const isMatch =
    searchTerm &&
    (node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.purpose && node.purpose.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div>
      <div
        className={`group flex items-start gap-1 rounded-md px-1 py-1 hover:bg-secondary/50 ${isMatch ? 'bg-primary/10' : ''}`}
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
        <button
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        {node.image ? (
          <div className="mt-0.5 h-5 w-5 shrink-0 rounded overflow-hidden">
            <FileImagePreview
              fileId={node.image.id}
              mimeType={node.image.mimeType}
              alt={node.name}
              iconClassName="h-5 w-5 text-muted-foreground"
              imgClassName="h-5 w-5 object-cover"
            />
          </div>
        ) : isExpanded && hasChildren ? (
          <FolderOpen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="mx-1 flex flex-1 items-start gap-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="truncate text-sm hover:underline text-left"
                onClick={() => router.push(`/admin/value-streams/${node.id}`)}
              >
                {node.name}
              </button>
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

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ValueStreamTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              searchTerm={searchTerm}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
