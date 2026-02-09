'use client';

import { useState, useEffect } from 'react';
import type { TaxonomyTreeNode } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useTaxonomyTree() {
  const [tree, setTree] = useState<TaxonomyTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TaxonomyTreeNode[]>('/taxonomies/tree')
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  return { tree, loading };
}
