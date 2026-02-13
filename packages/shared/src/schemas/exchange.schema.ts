import { z } from 'zod';
import { ExchangeState } from '../enums/exchange-state.enum';
import { AgentType } from '../enums/agent-type.enum';

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const valueInstanceSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const channelSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const userSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const decimalStringRegex = /^\d+(\.\d{1,2})?$/;

// --- Exchange Party ---

export const exchangePartyInputSchema = z.object({
  agentId: z.string().uuid(),
  role: z.string().min(1),
});

export const exchangePartySummarySchema = z.object({
  id: z.string().uuid(),
  agent: agentSummarySchema,
  role: z.string(),
});

// --- Exchange ---

export const createExchangeSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  description: z.string().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  channelId: z.string().uuid().nullable().optional(),
  link: z.string().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  parties: z.array(exchangePartyInputSchema).min(2),
});

export const updateExchangeSchema = z.object({
  name: z.string().min(1).optional(),
  purpose: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  valueStreamId: z.string().uuid().nullable().optional(),
  channelId: z.string().uuid().nullable().optional(),
  link: z.string().nullable().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  state: z.nativeEnum(ExchangeState).optional(),
  parties: z.array(exchangePartyInputSchema).min(2).optional(),
});

export const exchangeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  purpose: z.string(),
  description: z.string().nullable(),
  valueStream: valueStreamSummarySchema.nullable(),
  channel: channelSummarySchema.nullable(),
  state: z.nativeEnum(ExchangeState),
  openedAt: z.string(),
  completedAt: z.string().nullable(),
  link: z.string().nullable(),
  lead: userSummarySchema.nullable(),
  parties: z.array(exchangePartySummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Exchange Flow ---

export const createExchangeFlowSchema = z.object({
  valueId: z.string().uuid().nullable().optional(),
  valueInstanceId: z.string().uuid().nullable().optional(),
  fromAgentId: z.string().uuid(),
  toAgentId: z.string().uuid(),
  quantity: z.string().regex(decimalStringRegex, 'Must be a decimal string'),
}).refine(
  (data) => {
    const hasValue = data.valueId != null;
    const hasInstance = data.valueInstanceId != null;
    return (hasValue || hasInstance) && !(hasValue && hasInstance);
  },
  { message: 'Exactly one of valueId or valueInstanceId must be provided' },
);

export const updateExchangeFlowSchema = z.object({
  valueId: z.string().uuid().nullable().optional(),
  valueInstanceId: z.string().uuid().nullable().optional(),
  fromAgentId: z.string().uuid().optional(),
  toAgentId: z.string().uuid().optional(),
  quantity: z.string().regex(decimalStringRegex, 'Must be a decimal string').optional(),
});

export const exchangeFlowResponseSchema = z.object({
  id: z.string().uuid(),
  value: valueSummarySchema.nullable(),
  valueInstance: valueInstanceSummarySchema.nullable(),
  fromAgent: agentSummarySchema,
  toAgent: agentSummarySchema,
  quantity: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Types ---

export type ExchangePartyInput = z.infer<typeof exchangePartyInputSchema>;
export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type UpdateExchangeInput = z.infer<typeof updateExchangeSchema>;
export type ExchangeResponse = z.infer<typeof exchangeResponseSchema>;
export type CreateExchangeFlowInput = z.infer<typeof createExchangeFlowSchema>;
export type UpdateExchangeFlowInput = z.infer<typeof updateExchangeFlowSchema>;
export type ExchangeFlowResponse = z.infer<typeof exchangeFlowResponseSchema>;
