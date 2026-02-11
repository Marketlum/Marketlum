import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

export const createAccountSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  valueId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  valueId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

export const accountResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  value: valueSummarySchema,
  agent: agentSummarySchema,
  balance: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountResponse = z.infer<typeof accountResponseSchema>;
