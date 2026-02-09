'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

interface TaxonomyOption {
  id: string;
  name: string;
}

interface TaxonomySearchResponse {
  data: TaxonomyOption[];
  meta: { total: number };
}

export function useTaxonomies() {
  const [taxonomies, setTaxonomies] = useState<TaxonomyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<TaxonomySearchResponse>('/taxonomies/search?limit=100')
      .then((res) => setTaxonomies(res.data))
      .catch(() => setTaxonomies([]))
      .finally(() => setLoading(false));
  }, []);

  return { taxonomies, loading };
}
