'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AccountResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useAccounts(enabled = true) {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<AccountResponse>>('/accounts?limit=100')
      .then((result) => setAccounts(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { accounts, refresh };
}
