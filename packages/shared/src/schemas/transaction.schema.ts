import { z } from 'zod';

const accountSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createTransactionSchema = z.object({
  description: z.string().optional(),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  timestamp: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  description: z.string().optional(),
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  timestamp: z.string().optional(),
});

export const transactionResponseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().nullable(),
  fromAccount: accountSummarySchema,
  toAccount: accountSummarySchema,
  amount: z.string(),
  timestamp: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
