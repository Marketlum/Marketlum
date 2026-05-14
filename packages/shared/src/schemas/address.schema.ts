import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(255),
  region: z.string().trim().max(255).optional(),
  postalCode: z.string().trim().min(1).max(20),
  countryId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressResponseSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  label: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  region: z.string().nullable(),
  postalCode: z.string(),
  country: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
  }),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressResponse = z.infer<typeof addressResponseSchema>;
