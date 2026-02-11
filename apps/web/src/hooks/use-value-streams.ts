'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ValueStreamResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useValueStreams(enabled = true) {
  const [valueStreams, setValueStreams] = useState<ValueStreamResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<ValueStreamResponse>>('/value-streams/search?limit=10000')
      .then((result) => setValueStreams(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { valueStreams, refresh };
}
