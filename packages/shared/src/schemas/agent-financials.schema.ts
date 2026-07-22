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

export const agentFinancialsQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .default(() => new Date().getUTCFullYear()),
});

/** Agent P&L: invoices the agent issued are revenue, invoices it received
 * are expense, reported in the agent's functional currency from the
 * per-agent snapshot totals. Null figures when the agent has no
 * functional currency. */
export const agentFinancialsResponseSchema = z.object({
  agentId: z.string().uuid(),
  year: z.number().int(),
  functionalCurrency: valueSummarySchema.nullable(),
  summary: financialsSummarySchema,
  byMonth: z.array(financialsMonthRowSchema).length(12),
  byQuarter: z.array(financialsQuarterRowSchema).length(4),
  invoiceCount: z.number().int(),
  notConvertedCount: z.number().int(),
});

export type AgentFinancialsQuery = z.infer<typeof agentFinancialsQuerySchema>;
export type AgentFinancialsResponse = z.infer<typeof agentFinancialsResponseSchema>;
