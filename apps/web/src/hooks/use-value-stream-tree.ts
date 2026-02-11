'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ValueStreamTreeNode } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useValueStreamTree() {
  const [tree, setTree] = useState<ValueStreamTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = useCallback(() => {
    api
      .get<ValueStreamTreeNode[]>('/value-streams/tree')
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, refresh: fetchTree };
}
