'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgreementTemplateResponse, PaginatedResponse } from '@marketlum/shared';
import { api } from '@/lib/api-client';

export function useAgreementTemplates(enabled = true) {
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplateResponse[]>([]);

  const refresh = useCallback(() => {
    api
      .get<PaginatedResponse<AgreementTemplateResponse>>('/agreement-templates/search?limit=10000')
      .then((result) => setAgreementTemplates(result.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  return { agreementTemplates, refresh };
}
