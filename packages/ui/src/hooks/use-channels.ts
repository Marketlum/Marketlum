'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChannelResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '../lib/api-client';

export function useChannels(enabled = true) {
  const [channels, setChannels] = useState<ChannelResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<ChannelResponse>>('/channels/search?limit=10000')
      .then((result) => setChannels(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { channels, refresh };
}
