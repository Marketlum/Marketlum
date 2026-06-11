import { z } from 'zod';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export const valueStreamFinancialsQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .default(() => new Date().getUTCFullYear()),
  directOnly: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(false),
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

export const valueStreamFinancialsResponseSchema = z.object({
  valueStreamId: z.string().uuid(),
  year: z.number().int(),
  directOnly: z.boolean(),
  presentationCurrency: valueSummarySchema.nullable(),
  summary: z.object({
    revenue: figureSchema,
    expense: figureSchema,
    net: figureSchema,
  }),
  byMonth: z.array(monthRowSchema).length(12),
  byQuarter: z.array(quarterRowSchema).length(4),
  invoiceCount: z.number().int(),
  notConvertedCount: z.number().int(),
});

export type ValueStreamFinancialsQuery = z.infer<typeof valueStreamFinancialsQuerySchema>;
export type ValueStreamFinancialsResponse = z.infer<typeof valueStreamFinancialsResponseSchema>;
