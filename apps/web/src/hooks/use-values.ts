'use client';

import { useState, useEffect } from 'react';
import type { ValueResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useValues() {
  const [values, setValues] = useState<ValueResponse[]>([]);

  useEffect(() => {
    api
      .get<PaginatedResponse<ValueResponse>>('/values?limit=100')
      .then((result) => setValues(result.data))
      .catch(() => {});
  }, []);

  return { values };
}
