'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useTaxonomyTree() {
  const [tree, setTree] = useState<TaxonomyTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = useCallback(() => {
    api
      .get<TaxonomyTreeNode[]>('/taxonomies/tree')
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, refresh: fetchTree };
}
