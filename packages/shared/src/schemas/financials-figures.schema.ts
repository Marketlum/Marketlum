import { z } from 'zod';

/** Shared row/figure shapes for the invoice-derived financials endpoints
 * (value-stream financials and agent financials). Strings carry 2-decimal
 * amounts; null means "not computable" (no reporting currency configured). */

export const financialsFigureSchema = z.object({
  monthly: z.string().nullable(),
  quarterly: z.string().nullable(),
  annual: z.string().nullable(),
});

export const financialsMonthRowSchema = z.object({
  month: z.string(),
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

export const financialsQuarterRowSchema = z.object({
  quarter: z.string(),
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

export const financialsSummarySchema = z.object({
  revenue: financialsFigureSchema,
  expense: financialsFigureSchema,
  net: financialsFigureSchema,
});

export type FinancialsFigure = z.infer<typeof financialsFigureSchema>;
export type FinancialsMonthRow = z.infer<typeof financialsMonthRowSchema>;
export type FinancialsQuarterRow = z.infer<typeof financialsQuarterRowSchema>;
export type FinancialsSummary = z.infer<typeof financialsSummarySchema>;
