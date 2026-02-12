import { z } from 'zod';
import { OfferingState } from '../enums/offering-state.enum';
import { AgentType } from '../enums/agent-type.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createComponentSchema = z.object({
  valueId: z.string().uuid(),
  quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal string'),
  pricingFormula: z.string().optional(),
  pricingLink: z.string().optional(),
});

export const componentResponseSchema = z.object({
  id: z.string().uuid(),
  value: valueSummarySchema,
  quantity: z.string(),
  pricingFormula: z.string().nullable(),
  pricingLink: z.string().nullable(),
});

export const createOfferingSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  state: z.nativeEnum(OfferingState).default(OfferingState.DRAFT),
  activeFrom: z.string().optional(),
  activeUntil: z.string().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  components: z.array(createComponentSchema).optional(),
});

export const updateOfferingSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  state: z.nativeEnum(OfferingState).optional(),
  activeFrom: z.string().nullable().optional(),
  activeUntil: z.string().nullable().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  components: z.array(createComponentSchema).optional(),
});

export const offeringResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string().nullable(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  state: z.nativeEnum(OfferingState),
  activeFrom: z.string().nullable(),
  activeUntil: z.string().nullable(),
  valueStream: valueStreamSummarySchema.nullable(),
  agent: agentSummarySchema.nullable(),
  components: z.array(componentResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type OfferingResponse = z.infer<typeof offeringResponseSchema>;
