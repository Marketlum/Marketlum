import { z } from 'zod';

const accountSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const optionalAccountId = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().uuid().nullable(),
).optional();

export const createTransactionSchema = z.object({
  description: z.string().optional(),
  fromAccountId: optionalAccountId,
  toAccountId: optionalAccountId,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  timestamp: z.string().optional(),
}).refine(
  (data) => data.fromAccountId || data.toAccountId,
  { message: 'At least one account must be provided', path: ['fromAccountId'] },
);

export const updateTransactionSchema = z.object({
  description: z.string().optional(),
  fromAccountId: optionalAccountId,
  toAccountId: optionalAccountId,
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  timestamp: z.string().optional(),
});

export const transactionResponseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().nullable(),
  fromAccount: accountSummarySchema.nullable(),
  toAccount: accountSummarySchema.nullable(),
  amount: z.string(),
  timestamp: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
