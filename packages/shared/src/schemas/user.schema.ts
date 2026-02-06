import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
