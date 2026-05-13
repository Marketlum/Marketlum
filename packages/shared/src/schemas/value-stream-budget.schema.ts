import { z } from 'zod';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const valueStreamBudgetQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .default(() => new Date().getUTCFullYear()),
  directOnly: z.coerce.boolean().default(false),
});

const figureSchema = z.object({
  monthly: z.string().nullable(),
  quarterly: z.string().nullable(),
  annual: z.string().nullable(),
});

const monthRowSchema = z.object({
  month: z.string(),
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

const quarterRowSchema = z.object({
  quarter: z.string(),
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

export const valueStreamBudgetResponseSchema = z.object({
  valueStreamId: z.string().uuid(),
  year: z.number().int(),
  directOnly: z.boolean(),
  baseValue: valueSummarySchema.nullable(),
  summary: z.object({
    revenue: figureSchema,
    expense: figureSchema,
    net: figureSchema,
  }),
  byMonth: z.array(monthRowSchema).length(12),
  byQuarter: z.array(quarterRowSchema).length(4),
  activeFlowCount: z.number().int(),
  skippedFlows: z.number().int(),
});

export type ValueStreamBudgetQuery = z.infer<typeof valueStreamBudgetQuerySchema>;
export type ValueStreamBudgetResponse = z.infer<typeof valueStreamBudgetResponseSchema>;
