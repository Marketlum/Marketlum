'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GeographyResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useCountries(enabled = true) {
  const [countries, setCountries] = useState<GeographyResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<GeographyResponse>>('/geographies?type=country&limit=500')
      .then((result) => setCountries(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { countries, refresh };
}
