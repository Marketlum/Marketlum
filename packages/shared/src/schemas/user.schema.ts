import { z } from 'zod';
import { roleSummarySchema } from './role.schema';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  avatarId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  avatarId: z.string().uuid().nullable().optional(),
});

export const changeUserPasswordSchema = z.object({
  password: z.string().min(6),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatar: fileSummarySchema.nullable(),
  roles: z.array(roleSummarySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// /auth/me: the user plus their roles and resolved effective permissions.
export const authMeResponseSchema = userResponseSchema.extend({
  roles: z.array(roleSummarySchema),
  permissions: z.array(z.string()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
