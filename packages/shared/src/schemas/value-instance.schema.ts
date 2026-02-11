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

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export const createValueInstanceSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  version: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  valueId: z.string().uuid(),
  fromAgentId: z.string().uuid().nullable().optional(),
  toAgentId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const updateValueInstanceSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  version: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  valueId: z.string().uuid().optional(),
  fromAgentId: z.string().uuid().nullable().optional(),
  toAgentId: z.string().uuid().nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const valueInstanceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  version: z.string().nullable(),
  expiresAt: z.string().nullable(),
  value: valueSummarySchema,
  fromAgent: agentSummarySchema.nullable(),
  toAgent: agentSummarySchema.nullable(),
  image: fileSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateValueInstanceInput = z.infer<typeof createValueInstanceSchema>;
export type UpdateValueInstanceInput = z.infer<typeof updateValueInstanceSchema>;
export type ValueInstanceResponse = z.infer<typeof valueInstanceResponseSchema>;
