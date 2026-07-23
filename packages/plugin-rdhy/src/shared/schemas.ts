import { z } from 'zod';
import { codeSchema } from '@marketlum/shared';

export const RDHY_PLUGIN_ID = 'rdhy';

export * from './vam-schemas';
export * from './vam-performance';

export const createRdhyPlatformSchema = z.object({
  code: codeSchema,
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
});

/** `code` is intentionally absent — platform codes are immutable after creation. */
export const updateRdhyPlatformSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullish(),
});

export const assignRdhyPlatformSchema = z.object({
  platformId: z.string().uuid(),
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
});

const platformSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
});

export const rdhyPlatformResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const rdhyPlatformDetailResponseSchema = rdhyPlatformResponseSchema.extend({
  members: z.array(agentSummarySchema),
});

export const rdhyPlatformLookupResponseSchema = z.object({
  platform: platformSummarySchema.nullable(),
});

export type CreateRdhyPlatformInput = z.infer<typeof createRdhyPlatformSchema>;
export type UpdateRdhyPlatformInput = z.infer<typeof updateRdhyPlatformSchema>;
export type AssignRdhyPlatformInput = z.infer<typeof assignRdhyPlatformSchema>;
export type RdhyPlatformResponse = z.infer<typeof rdhyPlatformResponseSchema>;
export type RdhyPlatformDetailResponse = z.infer<typeof rdhyPlatformDetailResponseSchema>;
export type RdhyPlatformLookupResponse = z.infer<typeof rdhyPlatformLookupResponseSchema>;
export type RdhyAgentSummary = z.infer<typeof agentSummarySchema>;
