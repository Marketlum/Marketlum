import { z } from 'zod';
import { AuditCategory } from '../enums/audit-category.enum';
import { AuditActorKind } from '../enums/audit-actor-kind.enum';

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  category: z.nativeEnum(AuditCategory),
  actorKind: z.nativeEnum(AuditActorKind),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable(),
  userName: z.string().nullable(),
  apiKeyId: z.string().uuid().nullable(),
  apiKeyName: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().uuid().nullable(),
  action: z.string().nullable(),
  context: z.record(z.unknown()),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

/** Filters for GET /audit-logs; combines with the shared pagination query. */
export const auditLogsQuerySchema = z.object({
  actorKind: z.nativeEnum(AuditActorKind).optional(),
  category: z.nativeEnum(AuditCategory).optional(),
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
