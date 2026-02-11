'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useUsers(enabled = true) {
  const [users, setUsers] = useState<UserResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<UserResponse>>('/users?limit=100')
      .then((result) => setUsers(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { users, refresh };
}
