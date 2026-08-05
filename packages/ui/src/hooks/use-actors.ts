'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActorResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useActors(enabled = true) {
  const [actors, setActors] = useState<ActorResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<ActorResponse>>('/actors?limit=100')
      .then((result) => setActors(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { actors, refresh };
}
