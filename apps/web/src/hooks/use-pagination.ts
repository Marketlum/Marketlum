'use client';

import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export function usePagination(defaults?: Partial<PaginationState>) {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: '',
    sortOrder: 'ASC',
    ...defaults,
  });

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);
  const setLimit = useCallback((limit: number) => setState((s) => ({ ...s, limit, page: 1 })), []);
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search, page: 1 })), []);
  const setSort = useCallback((sortBy: string) => {
    setState((s) => ({
      ...s,
      sortBy,
      sortOrder: s.sortBy === sortBy && s.sortOrder === 'ASC' ? 'DESC' : 'ASC',
      page: 1,
    }));
  }, []);

  const toQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    if (state.search) params.set('search', state.search);
    if (state.sortBy) {
      params.set('sortBy', state.sortBy);
      params.set('sortOrder', state.sortOrder);
    }
    return params.toString();
  }, [state]);

  return { ...state, setPage, setLimit, setSearch, setSort, toQueryString };
}
