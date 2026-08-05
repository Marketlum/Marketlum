import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
});

export const createAccountSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  valueId: z.string().uuid(),
  actorId: z.string().uuid(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  valueId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
});

export const accountResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  value: valueSummarySchema,
  actor: actorSummarySchema,
  balance: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountResponse = z.infer<typeof accountResponseSchema>;
