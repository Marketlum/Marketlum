'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ValueResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useValues(enabled = true) {
  const [values, setValues] = useState<ValueResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<ValueResponse>>('/values?limit=100')
      .then((result) => setValues(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { values, refresh };
}
