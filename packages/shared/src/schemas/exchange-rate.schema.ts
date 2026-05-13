import { z } from 'zod';
import { ValueType } from '../enums/value-type.enum';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ValueType),
});

const rateStringRegex = /^\d+(\.\d{1,10})?$/;

export const createExchangeRateSchema = z
  .object({
    fromValueId: z.string().uuid(),
    toValueId: z.string().uuid(),
    rate: z.string().regex(rateStringRegex, 'Up to 10 fractional digits'),
    effectiveAt: z.string().datetime(),
    source: z.string().max(255).nullable().optional(),
  })
  .refine((data) => data.fromValueId !== data.toValueId, {
    message: 'fromValueId and toValueId must differ',
    path: ['toValueId'],
  })
  .refine((data) => parseFloat(data.rate) > 0, {
    message: 'rate must be > 0',
    path: ['rate'],
  });

export const updateExchangeRateSchema = z
  .object({
    fromValueId: z.string().uuid().optional(),
    toValueId: z.string().uuid().optional(),
    rate: z.string().regex(rateStringRegex, 'Up to 10 fractional digits').optional(),
    effectiveAt: z.string().datetime().optional(),
    source: z.string().max(255).nullable().optional(),
  })
  .refine(
    (data) =>
      data.fromValueId === undefined ||
      data.toValueId === undefined ||
      data.fromValueId !== data.toValueId,
    { message: 'fromValueId and toValueId must differ', path: ['toValueId'] },
  )
  .refine((data) => data.rate === undefined || parseFloat(data.rate) > 0, {
    message: 'rate must be > 0',
    path: ['rate'],
  });

export const exchangeRateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  fromValueId: z.string().uuid().optional(),
  toValueId: z.string().uuid().optional(),
  at: z.string().datetime().optional(),
});

export const exchangeRateResponseSchema = z.object({
  id: z.string().uuid(),
  fromValue: valueSummarySchema,
  toValue: valueSummarySchema,
  rate: z.string(),
  effectiveAt: z.string(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const exchangeRateLookupQuerySchema = z.object({
  fromValueId: z.string().uuid(),
  toValueId: z.string().uuid(),
  at: z.string().datetime().optional(),
});

export const exchangeRateLookupResponseSchema = z.object({
  rate: z.string(),
  sourceRowId: z.string().uuid(),
  effectiveAt: z.string(),
  fromValueId: z.string().uuid(),
  toValueId: z.string().uuid(),
});

// --- System settings ---

export const updateBaseValueSchema = z.object({
  baseValueId: z.string().uuid().nullable(),
});

export const systemSettingsBaseValueResponseSchema = z.object({
  baseValueId: z.string().uuid().nullable(),
  baseValue: valueSummarySchema.nullable(),
  snapshotsExist: z.boolean(),
});

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>;
export type ExchangeRateQuery = z.infer<typeof exchangeRateQuerySchema>;
export type ExchangeRateResponse = z.infer<typeof exchangeRateResponseSchema>;
export type ExchangeRateLookupQuery = z.infer<typeof exchangeRateLookupQuerySchema>;
export type ExchangeRateLookupResponse = z.infer<typeof exchangeRateLookupResponseSchema>;
export type UpdateBaseValueInput = z.infer<typeof updateBaseValueSchema>;
export type SystemSettingsBaseValueResponse = z.infer<
  typeof systemSettingsBaseValueResponseSchema
>;
