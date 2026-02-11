import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchResult {
  id: string;
  type: 'value' | 'agent' | 'user' | 'value_instance';
  name: string;
  subtitle: string | null;
  rank: number;
}

export interface SearchResponse {
  data: SearchResult[];
  meta: {
    total: number;
    limit: number;
    query: string;
  };
}
