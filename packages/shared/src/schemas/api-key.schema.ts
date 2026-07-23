import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.coerce
    .date()
    .refine((date) => date.getTime() > Date.now(), {
      message: 'Expiration date must be in the future',
    })
    .optional(),
});

export const apiKeySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export const apiKeyCreatedSchema = apiKeySummarySchema.extend({
  key: z.string(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ApiKeySummary = z.infer<typeof apiKeySummarySchema>;
export type ApiKeyCreated = z.infer<typeof apiKeyCreatedSchema>;
