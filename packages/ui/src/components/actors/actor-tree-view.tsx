'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ActorType, type ActorTreeNode } from '@marketlum/shared';
import { api } from '../../lib/api-client';
import { ActorTreeNodeComponent } from './actor-tree-node';

const typeTranslationKeys: Record<string, string> = {
  [ActorType.ORGANIZATION]: 'typeOrganization',
  [ActorType.INDIVIDUAL]: 'typeIndividual',
  [ActorType.VIRTUAL]: 'typeVirtual',
};

/** Read-only forest rendering of GET /actors/tree (moves happen on the
 * actor detail page). */
export function ActorTreeView() {
  const t = useTranslations('actors');
  const tc = useTranslations('common');
  const [tree, setTree] = useState<ActorTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = useCallback(async () => {
    try {
      const data = await api.get<ActorTreeNode[]>('/actors/tree');
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
  for (const actorType of Object.values(ActorType)) {
    typeLabels[actorType] = t(typeTranslationKeys[actorType]);
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
        <ActorTreeNodeComponent key={node.id} node={node} depth={0} typeLabels={typeLabels} />
      ))}
    </div>
  );
}
