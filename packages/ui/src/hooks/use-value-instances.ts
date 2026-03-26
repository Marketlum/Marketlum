'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ValueInstanceResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useValueInstances(enabled = true) {
  const [valueInstances, setValueInstances] = useState<ValueInstanceResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<ValueInstanceResponse>>('/value-instances?limit=100')
      .then((result) => setValueInstances(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { valueInstances, refresh };
}
