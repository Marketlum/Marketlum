'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgentResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useAgents(enabled = true) {
  const [agents, setAgents] = useState<AgentResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<AgentResponse>>('/agents?limit=100')
      .then((result) => setAgents(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { agents, refresh };
}
