import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
import { addressResponseSchema } from './address.schema';

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AgentType),
  purpose: z.string().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
  // Required at the form layer, optional at the API boundary so seeders and
  // unrelated tests can omit it. Service validates type='currency' when set.
  functionalCurrencyId: z.string().uuid().nullable().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AgentType).optional(),
  purpose: z.string().optional(),
  mainTaxonomyId: z.string().uuid().nullable().optional(),
  taxonomyIds: z.array(z.string().uuid()).optional(),
  imageId: z.string().uuid().nullable().optional(),
  functionalCurrencyId: z.string().uuid().nullable().optional(),
});

export const agentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
  purpose: z.string().nullable(),
  mainTaxonomy: taxonomySummarySchema.nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  image: fileSummarySchema.nullable(),
  addresses: z.array(addressResponseSchema).default([]),
  functionalCurrency: valueSummarySchema.nullable(),
  functionalCurrencyId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const agentSnapshotReferencesResponseSchema = z.object({
  invoiceItems: z.number().int().nonnegative(),
  recurringFlows: z.number().int().nonnegative(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type AgentSnapshotReferencesResponse = z.infer<typeof agentSnapshotReferencesResponseSchema>;
