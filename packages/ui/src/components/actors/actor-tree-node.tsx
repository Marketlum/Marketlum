'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Bot } from 'lucide-react';
import type { AgentTreeNode } from '@marketlum/shared';
import { AgentTypeBadge } from './agent-type-badge';
import { FileImagePreview } from '../shared/file-image-preview';
import { useIsMobile } from '../../hooks/use-mobile';

interface AgentTreeNodeProps {
  node: AgentTreeNode;
  depth: number;
  typeLabels: Record<string, string>;
}

export function AgentTreeNodeComponent({ node, depth, typeLabels }: AgentTreeNodeProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-secondary/50"
        style={{ paddingLeft: depth * (isMobile ? 16 : 24) + 4 }}
      >
        <button
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-secondary"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'collapse' : 'expand'}
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/30">
          {node.image ? (
            <FileImagePreview
              fileId={node.image.id}
              mimeType={node.image.mimeType}
              alt={node.name}
              iconClassName="h-3.5 w-3.5 text-muted-foreground/50"
              imgClassName="h-full w-full object-cover"
            />
          ) : (
            <Bot className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </div>

        <Link
          href={`/admin/agents/${node.id}`}
          className="flex flex-1 items-center gap-1.5 overflow-hidden"
        >
          <span className="truncate text-sm underline-offset-2 hover:underline">{node.name}</span>
          <AgentTypeBadge type={node.type} label={typeLabels[node.type] ?? node.type} />
        </Link>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AgentTreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              typeLabels={typeLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
