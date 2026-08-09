import { z } from 'zod';
import { roleSummarySchema } from './role.schema';
import { UserType } from '../enums/user-type.enum';
import { ActorType } from '../enums/actor-type.enum';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const linkedActorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
});

// Spec 025: password required for humans, forbidden for agents; only agents
// may link to a market actor. Invalid states are unrepresentable here.
export const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6).optional(),
    name: z.string().min(1),
    avatarId: z.string().uuid().nullable().optional(),
    type: z.nativeEnum(UserType).default(UserType.HUMAN),
    actorId: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === UserType.AGENT) {
      if (value.password !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Agent users cannot have a password',
        });
      }
    } else {
      if (value.password === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password is required for human users',
        });
      }
      if (value.actorId != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actorId'],
          message: 'Only agent users can link to an actor',
        });
      }
    }
  });

// Strict: user type is immutable (spec 025) — a PATCH carrying `type` (or any
// unknown key) fails validation instead of being silently stripped.
export const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    avatarId: z.string().uuid().nullable().optional(),
    actorId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const changeUserPasswordSchema = z.object({
  password: z.string().min(6),
});

export const usersListQuerySchema = z.object({
  type: z.nativeEnum(UserType).optional(),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  type: z.nativeEnum(UserType),
  actorId: z.string().uuid().nullable(),
  actor: linkedActorSummarySchema.nullable(),
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
export type UsersListQuery = z.infer<typeof usersListQuerySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
