'use client';

import { useState } from 'react';
import { ChevronRight, FileText, FolderOpen, Folder, MoreHorizontal, Plus, Pencil, Trash2, Users, Paperclip, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AgreementTreeNode } from '@marketlum/shared';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useIsMobile } from '../../hooks/use-mobile';

interface AgreementTreeNodeProps {
  node: AgreementTreeNode;
  depth: number;
  onEdit: (node: AgreementTreeNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, title: string) => void;
  searchTerm?: string;
  forceExpanded?: boolean;
}

export function AgreementTreeNodeComponent({
  node,
  depth,
  onEdit,
  onAddChild,
  onDelete,
  searchTerm,
  forceExpanded,
}: AgreementTreeNodeProps) {
  const t = useTranslations('agreements');
  const tc = useTranslations('common');
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = forceExpanded || expanded;

  const isMatch =
    searchTerm &&
    (node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.content && node.content.toLowerCase().includes(searchTerm.toLowerCase())));

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

        {isExpanded && hasChildren ? (
          <FolderOpen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : hasChildren ? (
          <Folder className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="mx-1 flex flex-1 items-start gap-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm">{node.title}</span>
              {node.parties && node.parties.length > 0 && (
                <span className="inline-flex items-center gap-0.5 shrink-0 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {node.parties.length}
                </span>
              )}
              {node.file && (
                <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              {node.link && (
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </div>
            {node.content && (
              <p className="truncate text-xs text-muted-foreground">{node.content}</p>
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
                onClick={() => onDelete(node.id, node.title)}
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
            <AgreementTreeNodeComponent
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
