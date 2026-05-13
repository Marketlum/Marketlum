import { z } from 'zod';
import { AgentType } from '../enums/agent-type.enum';
import { RecurringFlowDirection } from '../enums/recurring-flow-direction.enum';
import { RecurringFlowFrequency } from '../enums/recurring-flow-frequency.enum';
import { RecurringFlowStatus } from '../enums/recurring-flow-status.enum';
import { RecurringFlowTransitionAction } from '../enums/recurring-flow-transition-action.enum';

const valueStreamSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const agentSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AgentType),
});

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const offeringSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const agreementSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const taxonomySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)');

const amountString = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Must be a positive decimal string with up to 4 fractional digits')
  .refine((v) => Number(v) > 0, { message: 'Amount must be greater than 0' });

const unitString = z.string().trim().min(1).max(32);

export const createRecurringFlowSchema = z
  .object({
    valueStreamId: z.string().uuid(),
    counterpartyAgentId: z.string().uuid(),
    valueId: z.string().uuid().nullable().optional(),
    offeringId: z.string().uuid().nullable().optional(),
    agreementId: z.string().uuid().nullable().optional(),
    direction: z.nativeEnum(RecurringFlowDirection),
    amount: amountString,
    unit: unitString,
    frequency: z.nativeEnum(RecurringFlowFrequency),
    interval: z.coerce.number().int().min(1).default(1),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    description: z.string().optional(),
    taxonomyIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    { message: 'endDate must be on or after startDate', path: ['endDate'] },
  );

export const updateRecurringFlowSchema = z
  .object({
    valueStreamId: z.string().uuid().optional(),
    counterpartyAgentId: z.string().uuid().optional(),
    valueId: z.string().uuid().nullable().optional(),
    offeringId: z.string().uuid().nullable().optional(),
    agreementId: z.string().uuid().nullable().optional(),
    direction: z.nativeEnum(RecurringFlowDirection).optional(),
    amount: amountString.optional(),
    unit: unitString.optional(),
    frequency: z.nativeEnum(RecurringFlowFrequency).optional(),
    interval: z.coerce.number().int().min(1).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.nullable().optional(),
    description: z.string().nullable().optional(),
    taxonomyIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate >= data.startDate,
    { message: 'endDate must be on or after startDate', path: ['endDate'] },
  );

export const transitionRecurringFlowSchema = z.object({
  action: z.nativeEnum(RecurringFlowTransitionAction),
  endDate: isoDate.optional(),
});

export const recurringFlowQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  valueStreamId: z.string().uuid().optional(),
  counterpartyAgentId: z.string().uuid().optional(),
  direction: z.nativeEnum(RecurringFlowDirection).optional(),
  status: z.union([z.nativeEnum(RecurringFlowStatus), z.array(z.nativeEnum(RecurringFlowStatus))]).optional(),
  frequency: z.union([z.nativeEnum(RecurringFlowFrequency), z.array(z.nativeEnum(RecurringFlowFrequency))]).optional(),
  unit: z.union([z.string(), z.array(z.string())]).optional(),
  taxonomyId: z.union([z.string().uuid(), z.array(z.string().uuid())]).optional(),
});

export const recurringFlowResponseSchema = z.object({
  id: z.string().uuid(),
  valueStream: valueStreamSummarySchema,
  counterpartyAgent: agentSummarySchema,
  value: valueSummarySchema.nullable(),
  offering: offeringSummarySchema.nullable(),
  agreement: agreementSummarySchema.nullable(),
  direction: z.nativeEnum(RecurringFlowDirection),
  amount: z.string(),
  unit: z.string(),
  frequency: z.nativeEnum(RecurringFlowFrequency),
  interval: z.number().int(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.nativeEnum(RecurringFlowStatus),
  description: z.string().nullable(),
  taxonomies: z.array(taxonomySummarySchema),
  rateUsed: z.string().nullable(),
  baseAmount: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringFlowRollupSchema = z.object({
  valueStreamId: z.string().uuid(),
  activeFlowCount: z.number().int(),
  byDirection: z.array(
    z.object({
      direction: z.nativeEnum(RecurringFlowDirection),
      totals: z.array(
        z.object({
          unit: z.string(),
          monthly: z.string(),
          annualized: z.string(),
        }),
      ),
    }),
  ),
  net: z.array(
    z.object({
      unit: z.string(),
      monthly: z.string(),
      annualized: z.string(),
    }),
  ),
});

export const recurringFlowProjectionSchema = z.object({
  valueStreamId: z.string().uuid(),
  horizonMonths: z.number().int(),
  months: z.array(
    z.object({
      month: z.string(),
      byDirection: z.array(
        z.object({
          direction: z.nativeEnum(RecurringFlowDirection),
          totals: z.array(z.object({ unit: z.string(), amount: z.string() })),
        }),
      ),
    }),
  ),
});

export type CreateRecurringFlowInput = z.infer<typeof createRecurringFlowSchema>;
export type UpdateRecurringFlowInput = z.infer<typeof updateRecurringFlowSchema>;
export type TransitionRecurringFlowInput = z.infer<typeof transitionRecurringFlowSchema>;
export type RecurringFlowQuery = z.infer<typeof recurringFlowQuerySchema>;
export type RecurringFlowResponse = z.infer<typeof recurringFlowResponseSchema>;
export type RecurringFlowRollup = z.infer<typeof recurringFlowRollupSchema>;
export type RecurringFlowProjection = z.infer<typeof recurringFlowProjectionSchema>;
