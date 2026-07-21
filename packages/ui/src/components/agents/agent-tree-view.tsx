'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { AgentType, type AgentTreeNode } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { AgentTreeNodeComponent } from './agent-tree-node';

const typeTranslationKeys: Record<string, string> = {
  [AgentType.ORGANIZATION]: 'typeOrganization',
  [AgentType.INDIVIDUAL]: 'typeIndividual',
  [AgentType.VIRTUAL]: 'typeVirtual',
};

/** Read-only forest rendering of GET /agents/tree (moves happen on the
 * agent detail page). */
export function AgentTreeView() {
  const t = useTranslations('agents');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<AgentTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<AgentTreeNode[]>('/agents/tree');
      setTree(data);
    } catch {
      toast.error(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const typeLabels: Record<string, string> = {};
  for (const agentType of Object.values(AgentType)) {
    typeLabels[agentType] = t(typeTranslationKeys[agentType]);
  }

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {tc('loading')}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {t('emptyTree')}
      </div>
    );
  }

  return (
    <div className="rounded-md border p-2">
      {tree.map((node) => (
        <AgentTreeNodeComponent key={node.id} node={node} depth={0} typeLabels={typeLabels} />
      ))}
    </div>
  );
}
