import { z } from 'zod';

/**
 * The Tension aggregate's event vocabulary (spec 027 §2.1). Eleven commands
 * produce these twelve event types; every event is a past-tense fact and
 * carries the previous value of what it changes, so a history timeline renders
 * without replaying the stream (spec 027 Q9).
 */
export enum TensionEventType {
  SENSED = 'TensionSensed',
  RENAMED = 'TensionRenamed',
  RESCORED = 'TensionRescored',
  CONTEXT_REVISED = 'TensionContextRevised',
  LEAD_ASSIGNED = 'TensionLeadAssigned',
  LEAD_UNASSIGNED = 'TensionLeadUnassigned',
  REASSIGNED = 'TensionReassigned',
  RESOLVED = 'TensionResolved',
  DROPPED = 'TensionDropped',
  REOPENED = 'TensionReopened',
  REVIVED = 'TensionRevived',
  DISCARDED = 'TensionDiscarded',
}

/** `domain_events.aggregateType` for this aggregate. */
export const TENSION_AGGREGATE_TYPE = 'tension';

/** Current payload schema version written by this build (spec 027 Q22). */
export const TENSION_EVENT_SCHEMA_VERSION = 1;

/**
 * Bus verb per event type — emitted as `marketlum.tension.<verb>` (spec 027 §8),
 * replacing the TypeORM-derived created/updated/deleted triplet.
 */
export const TENSION_EVENT_VERBS: Record<TensionEventType, string> = {
  [TensionEventType.SENSED]: 'sensed',
  [TensionEventType.RENAMED]: 'renamed',
  [TensionEventType.RESCORED]: 'rescored',
  [TensionEventType.CONTEXT_REVISED]: 'context_revised',
  [TensionEventType.LEAD_ASSIGNED]: 'lead_assigned',
  [TensionEventType.LEAD_UNASSIGNED]: 'lead_unassigned',
  [TensionEventType.REASSIGNED]: 'reassigned',
  [TensionEventType.RESOLVED]: 'resolved',
  [TensionEventType.DROPPED]: 'dropped',
  [TensionEventType.REOPENED]: 'reopened',
  [TensionEventType.REVIVED]: 'revived',
  [TensionEventType.DISCARDED]: 'discarded',
};

export const TENSION_EVENT_TYPES = Object.values(TensionEventType);

/** All twelve bus verbs — used to widen the audit trail's verb filter. */
export const TENSION_BUS_VERBS = Object.values(TENSION_EVENT_VERBS);

// --- payloads -------------------------------------------------------------

export const tensionSensedPayloadSchema = z.object({
  name: z.string(),
  currentContext: z.string().nullable(),
  potentialFuture: z.string().nullable(),
  score: z.number().int(),
  actorId: z.string().uuid(),
  leadUserId: z.string().uuid().nullable(),
});

export const tensionRenamedPayloadSchema = z.object({
  name: z.string(),
  previousName: z.string(),
});

export const tensionRescoredPayloadSchema = z.object({
  score: z.number().int(),
  previousScore: z.number().int(),
});

/** Carries only the prose fields actually supplied and changed. */
export const tensionContextRevisedPayloadSchema = z.object({
  currentContext: z.string().nullable().optional(),
  potentialFuture: z.string().nullable().optional(),
  previousCurrentContext: z.string().nullable().optional(),
  previousPotentialFuture: z.string().nullable().optional(),
});

export const tensionLeadAssignedPayloadSchema = z.object({
  leadUserId: z.string().uuid(),
  previousLeadUserId: z.string().uuid().nullable(),
});

export const tensionLeadUnassignedPayloadSchema = z.object({
  previousLeadUserId: z.string().uuid(),
});

export const tensionReassignedPayloadSchema = z.object({
  actorId: z.string().uuid(),
  previousActorId: z.string().uuid(),
});

/** Lifecycle transitions and discard carry no payload — the type is the fact. */
export const emptyTensionPayloadSchema = z.object({});

// --- the event union ------------------------------------------------------

export const tensionEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(TensionEventType.SENSED), payload: tensionSensedPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.RENAMED), payload: tensionRenamedPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.RESCORED), payload: tensionRescoredPayloadSchema }),
  z.object({
    type: z.literal(TensionEventType.CONTEXT_REVISED),
    payload: tensionContextRevisedPayloadSchema,
  }),
  z.object({
    type: z.literal(TensionEventType.LEAD_ASSIGNED),
    payload: tensionLeadAssignedPayloadSchema,
  }),
  z.object({
    type: z.literal(TensionEventType.LEAD_UNASSIGNED),
    payload: tensionLeadUnassignedPayloadSchema,
  }),
  z.object({ type: z.literal(TensionEventType.REASSIGNED), payload: tensionReassignedPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.RESOLVED), payload: emptyTensionPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.DROPPED), payload: emptyTensionPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.REOPENED), payload: emptyTensionPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.REVIVED), payload: emptyTensionPayloadSchema }),
  z.object({ type: z.literal(TensionEventType.DISCARDED), payload: emptyTensionPayloadSchema }),
]);

export type TensionEvent = z.infer<typeof tensionEventSchema>;

export type TensionSensedPayload = z.infer<typeof tensionSensedPayloadSchema>;
export type TensionRenamedPayload = z.infer<typeof tensionRenamedPayloadSchema>;
export type TensionRescoredPayload = z.infer<typeof tensionRescoredPayloadSchema>;
export type TensionContextRevisedPayload = z.infer<typeof tensionContextRevisedPayloadSchema>;
export type TensionLeadAssignedPayload = z.infer<typeof tensionLeadAssignedPayloadSchema>;
export type TensionLeadUnassignedPayload = z.infer<typeof tensionLeadUnassignedPayloadSchema>;
export type TensionReassignedPayload = z.infer<typeof tensionReassignedPayloadSchema>;

/** `marketlum.tension.<verb>` for the given event type. */
export function tensionEventBusName(type: TensionEventType): string {
  return `marketlum.tension.${TENSION_EVENT_VERBS[type]}`;
}
