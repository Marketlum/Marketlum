import { z } from 'zod';

export const createTaxonomySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export const updateTaxonomySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const moveTaxonomySchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const taxonomyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  level: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTaxonomyInput = z.infer<typeof createTaxonomySchema>;
export type UpdateTaxonomyInput = z.infer<typeof updateTaxonomySchema>;
export type MoveTaxonomyInput = z.infer<typeof moveTaxonomySchema>;
export type TaxonomyResponse = z.infer<typeof taxonomyResponseSchema>;

export interface TaxonomyTreeNode {
  id: string;
  name: string;
  description: string | null;
  level: number;
  createdAt: string;
  updatedAt: string;
  children: TaxonomyTreeNode[];
}
