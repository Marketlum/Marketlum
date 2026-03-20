'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PipelineResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function usePipelines(enabled = true) {
  const [pipelines, setPipelines] = useState<PipelineResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<PipelineResponse>>('/pipelines/search?limit=10000')
      .then((result) => setPipelines(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { pipelines, refresh };
}
