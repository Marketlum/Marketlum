import { z } from 'zod';
import {
  financialsMonthRowSchema,
  financialsQuarterRowSchema,
  financialsSummarySchema,
} from './financials-figures.schema';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export const actorFinancialsQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .default(() => new Date().getUTCFullYear()),
  // Not z.coerce.boolean(): that would turn the query string "false" into true.
  consolidated: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform((v) => v === true || v === 'true'),
});

/** Actor P&L: invoices the actor issued are revenue, invoices it received
 * are expense, reported in the actor's functional currency from the
 * per-actor snapshot totals. Null figures when the actor has no
 * functional currency. */
export const actorFinancialsResponseSchema = z.object({
  actorId: z.string().uuid(),
  year: z.number().int(),
  consolidated: z.boolean(),
  functionalCurrency: valueSummarySchema.nullable(),
  summary: financialsSummarySchema,
  byMonth: z.array(financialsMonthRowSchema).length(12),
  byQuarter: z.array(financialsQuarterRowSchema).length(4),
  invoiceCount: z.number().int(),
  notConvertedCount: z.number().int(),
});

export type ActorFinancialsQuery = z.infer<typeof actorFinancialsQuerySchema>;
export type ActorFinancialsResponse = z.infer<typeof actorFinancialsResponseSchema>;
