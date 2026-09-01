import { z } from 'zod';
import { ActorType } from '../enums/actor-type.enum';
import { AuditActorKind } from '../enums/audit-actor-kind.enum';
import { TensionState } from '../enums/tension-state.enum';
import { TensionEventType } from '../events/tension-events';

const fileSummarySchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

const actorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ActorType),
  image: fileSummarySchema.nullable(),
});

const userSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const createTensionSchema = z.object({
  name: z.string().min(1),
  currentContext: z.string().nullable().optional(),
  potentialFuture: z.string().nullable().optional(),
  actorId: z.string().uuid(),
  leadUserId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(10).default(5).optional(),
});

/**
 * No endpoint consumes this since spec 027 replaced PATCH with per-command
 * endpoints — it remains the input contract for the MCP `update_tension` tool,
 * whose handler fans the fields out to individual commands (spec 027 Q14).
 */
export const updateTensionSchema = z.object({
  name: z.string().min(1).optional(),
  currentContext: z.string().nullable().optional(),
  potentialFuture: z.string().nullable().optional(),
  actorId: z.string().uuid().optional(),
  leadUserId: z.string().uuid().nullable().optional(),
  score: z.number().int().min(1).max(10).optional(),
});

// --- command inputs (spec 027 §5) ----------------------------------------

export const renameTensionSchema = z.object({
  name: z.string().min(1),
});

export const rescoreTensionSchema = z.object({
  score: z.number().int().min(1).max(10),
});

export const reviseTensionContextSchema = z
  .object({
    currentContext: z.string().nullable().optional(),
    potentialFuture: z.string().nullable().optional(),
  })
  .refine(
    (input) => input.currentContext !== undefined || input.potentialFuture !== undefined,
    { message: 'Supply currentContext, potentialFuture, or both' },
  );

export const assignTensionLeadSchema = z.object({
  leadUserId: z.string().uuid().nullable(),
});

export const reassignTensionSchema = z.object({
  actorId: z.string().uuid(),
});

// --- responses ------------------------------------------------------------

export const tensionResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  currentContext: z.string().nullable(),
  potentialFuture: z.string().nullable(),
  score: z.number().int(),
  state: z.nativeEnum(TensionState),
  /** Stream head the projection reflects (spec 027 §4). */
  version: z.number().int(),
  actor: actorSummarySchema,
  lead: userSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tensionHistoryActorSchema = z.object({
  kind: z.nativeEnum(AuditActorKind),
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  apiKeyName: z.string().nullable(),
});

/**
 * One rendered timeline entry (spec 027 §5.1). `summary` is English and always
 * present for API/MCP consumers; `summaryKey` + `summaryParams` let the
 * next-intl UI localise the same line.
 */
export const tensionHistoryEntrySchema = z.object({
  version: z.number().int(),
  type: z.nativeEnum(TensionEventType),
  occurredAt: z.string(),
  actor: tensionHistoryActorSchema,
  summary: z.string(),
  summaryKey: z.string(),
  summaryParams: z.record(z.union([z.string(), z.number(), z.null()])),
  payload: z.record(z.unknown()),
});

export type CreateTensionInput = z.infer<typeof createTensionSchema>;
export type UpdateTensionInput = z.infer<typeof updateTensionSchema>;
export type RenameTensionInput = z.infer<typeof renameTensionSchema>;
export type RescoreTensionInput = z.infer<typeof rescoreTensionSchema>;
export type ReviseTensionContextInput = z.infer<typeof reviseTensionContextSchema>;
export type AssignTensionLeadInput = z.infer<typeof assignTensionLeadSchema>;
export type ReassignTensionInput = z.infer<typeof reassignTensionSchema>;
export type TensionResponse = z.infer<typeof tensionResponseSchema>;
export type TensionHistoryEntry = z.infer<typeof tensionHistoryEntrySchema>;
