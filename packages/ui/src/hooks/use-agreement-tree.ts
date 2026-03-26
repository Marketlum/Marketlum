'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgreementTreeNode } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useAgreementTree() {
  const [tree, setTree] = useState<AgreementTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = useCallback(() => {
    api
      .get<AgreementTreeNode[]>('/agreements/tree')
      .then(setTree)
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return { tree, loading, refresh: fetchTree };
}
