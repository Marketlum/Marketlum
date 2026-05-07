import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
import { TensionState } from '../enums/tension-state.enum';
import { TensionTransitionAction } from '../enums/tension-transition-action.enum';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
  image: fileSummarySchema.nullable(),
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

export const transitionTensionSchema = z.object({
  action: z.nativeEnum(TensionTransitionAction),
});

export const tensionResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  currentContext: z.string().nullable(),
  potentialFuture: z.string().nullable(),
  score: z.number().int(),
  state: z.nativeEnum(TensionState),
  agent: agentSummarySchema,
  lead: userSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTensionInput = z.infer<typeof createTensionSchema>;
export type UpdateTensionInput = z.infer<typeof updateTensionSchema>;
export type TransitionTensionInput = z.infer<typeof transitionTensionSchema>;
export type TensionResponse = z.infer<typeof tensionResponseSchema>;
