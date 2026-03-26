'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PerspectiveResponse, PerspectiveConfig } from '@marketlum/shared';
import { api } from '../lib/api-client';

interface UsePerspectivesOptions {
  table: string;
  onApply: (config: PerspectiveConfig) => void;
  translations: {
    saved: string;
    updated: string;
    deleted: string;
    failedToLoad: string;
    failedToSave: string;
    failedToUpdate: string;
    failedToDelete: string;
  };
}

export function usePerspectives({ table, onApply, translations }: UsePerspectivesOptions) {
  const [perspectives, setPerspectives] = useState<PerspectiveResponse[]>([]);
  const [activePerspectiveId, setActivePerspectiveId] = useState<string | null>(null);
  const appliedDefault = useRef(false);

  const fetchPerspectives = useCallback(async () => {
    try {
      const result = await api.get<PerspectiveResponse[]>(`/perspectives?table=${table}`);
      setPerspectives(result);
      return result;
    } catch {
      toast.error(translations.failedToLoad);
      return [];
    }
  }, [table, translations.failedToLoad]);

  useEffect(() => {
    fetchPerspectives().then((result) => {
      if (appliedDefault.current) return;
      appliedDefault.current = true;
      const defaultPerspective = result.find((p) => p.isDefault);
      if (defaultPerspective) {
        setActivePerspectiveId(defaultPerspective.id);
        onApply(defaultPerspective.config);
      }
    });
  }, [fetchPerspectives, onApply]);

  const selectPerspective = useCallback(
    (id: string) => {
      const perspective = perspectives.find((p) => p.id === id);
      if (perspective) {
        setActivePerspectiveId(id);
        onApply(perspective.config);
      }
    },
    [perspectives, onApply],
  );

  const savePerspective = useCallback(
    async (name: string, config: PerspectiveConfig, isDefault = false) => {
      try {
        const result = await api.post<PerspectiveResponse>('/perspectives', {
          name,
          table,
          config,
          isDefault,
        });
        toast.success(translations.saved);
        setActivePerspectiveId(result.id);
        await fetchPerspectives();
      } catch {
        toast.error(translations.failedToSave);
      }
    },
    [table, translations.saved, translations.failedToSave, fetchPerspectives],
  );

  const updatePerspective = useCallback(
    async (id: string, data: { name?: string; config?: PerspectiveConfig; isDefault?: boolean }) => {
      try {
        await api.patch<PerspectiveResponse>(`/perspectives/${id}`, data);
        toast.success(translations.updated);
        await fetchPerspectives();
      } catch {
        toast.error(translations.failedToUpdate);
      }
    },
    [translations.updated, translations.failedToUpdate, fetchPerspectives],
  );

  const deletePerspective = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/perspectives/${id}`);
        toast.success(translations.deleted);
        if (activePerspectiveId === id) {
          setActivePerspectiveId(null);
        }
        await fetchPerspectives();
      } catch {
        toast.error(translations.failedToDelete);
      }
    },
    [activePerspectiveId, translations.deleted, translations.failedToDelete, fetchPerspectives],
  );

  const resetPerspective = useCallback(() => {
    setActivePerspectiveId(null);
    onApply({ columnVisibility: {}, filters: {}, sort: null });
  }, [onApply]);

  return {
    perspectives,
    activePerspectiveId,
    selectPerspective,
    savePerspective,
    updatePerspective,
    deletePerspective,
    resetPerspective,
  };
}
