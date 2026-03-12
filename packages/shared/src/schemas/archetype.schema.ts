import { z } from 'zod';

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createArchetypeSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  description: z.string().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
});

export const updateArchetypeSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
});

export const archetypeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateArchetypeInput = z.infer<typeof createArchetypeSchema>;
export type UpdateArchetypeInput = z.infer<typeof updateArchetypeSchema>;
export type ArchetypeResponse = z.infer<typeof archetypeResponseSchema>;
