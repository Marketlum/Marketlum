import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const userSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createTensionSchema = z.object({
  name: z.string().min(1),
  currentContext: z.string().nullable().optional(),
  potentialFuture: z.string().nullable().optional(),
  agentId: z.string().uuid(),
  leadUserId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(10).default(5).optional(),
});

export const updateTensionSchema = z.object({
  name: z.string().min(1).optional(),
  currentContext: z.string().nullable().optional(),
  potentialFuture: z.string().nullable().optional(),
  agentId: z.string().uuid().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(10).optional(),
});

export const tensionResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  currentContext: z.string().nullable(),
  potentialFuture: z.string().nullable(),
  score: z.number().int(),
  agent: agentSummarySchema,
  lead: userSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTensionInput = z.infer<typeof createTensionSchema>;
export type UpdateTensionInput = z.infer<typeof updateTensionSchema>;
export type TensionResponse = z.infer<typeof tensionResponseSchema>;
