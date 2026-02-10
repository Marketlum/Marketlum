import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AgentType),
  purpose: z.string().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AgentType).optional(),
  purpose: z.string().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
});

export const agentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
  purpose: z.string().nullable(),
  mainTaxonomy: taxonomySummarySchema.nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  image: fileSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
