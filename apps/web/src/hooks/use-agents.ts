'use client';

import { useState, useEffect } from 'react';
import type { AgentResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useAgents() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);

  useEffect(() => {
    api
      .get<PaginatedResponse<AgentResponse>>('/agents?limit=100')
      .then((result) => setAgents(result.data))
      .catch(() => {});
  }, []);

  return { agents };
}
