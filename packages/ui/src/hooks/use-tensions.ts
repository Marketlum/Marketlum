'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TensionResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useTensions(enabled = true) {
  const [tensions, setTensions] = useState<TensionResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<TensionResponse>>('/tensions/search?limit=100')
      .then((result) => setTensions(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { tensions, refresh };
}
