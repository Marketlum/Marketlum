import { z } from 'zod';
import { codeSchema } from './code.schema';
import { permissionSchema } from '../permissions';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  code: codeSchema,
  parentId: z.string().uuid().nullable().optional(),
  permissions: z.array(permissionSchema).default([]),
});

// `code` is immutable after creation (entity-codes pattern, spec 008).
export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  permissions: z.array(permissionSchema).optional(),
});

export const assignUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const roleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  parentId: z.string().uuid().nullable(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const roleSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignUserRolesInput = z.infer<typeof assignUserRolesSchema>;
export type RoleResponse = z.infer<typeof roleResponseSchema>;
export type RoleSummary = z.infer<typeof roleSummarySchema>;
