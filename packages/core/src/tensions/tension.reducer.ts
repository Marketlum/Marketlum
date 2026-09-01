import {
  TensionEventType,
  TensionState,
  type TensionContextRevisedPayload,
  type TensionLeadAssignedPayload,
  type TensionReassignedPayload,
  type TensionRenamedPayload,
  type TensionRescoredPayload,
  type TensionSensedPayload,
} from '@marketlum/shared';

/**
 * One stored event, reduced to what state reconstruction needs.
 * (Named `TensionAggregateState` rather than the spec's `TensionState` to avoid
 * colliding with the `TensionState` lifecycle enum from @marketlum/shared.)
 */
export interface TensionStreamEvent {
  type: TensionEventType;
  payload: Record<string, unknown>;
  version: number;
  occurredAt: Date;
}

export interface TensionAggregateState {
  id: string;
  name: string;
  currentContext: string | null;
  potentialFuture: string | null;
  score: number;
  state: TensionState;
  actorId: string;
  leadUserId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  /** True once TensionDiscarded is seen — the projection row must not exist. */
  discarded: boolean;
}

/**
 * The single reducer behind both aggregate reconstitution (command handlers)
 * and the read-model projection (spec 027 §2.3) — one function, so the write
 * model and read model cannot disagree.
 */
export function applyTensionEvent(
  state: TensionAggregateState | null,
  event: TensionStreamEvent,
  aggregateId: string,
): TensionAggregateState | null {
  if (event.type === TensionEventType.SENSED) {
    const payload = event.payload as unknown as TensionSensedPayload;
    return {
      id: aggregateId,
      name: payload.name,
      currentContext: payload.currentContext,
      potentialFuture: payload.potentialFuture,
      score: payload.score,
      state: TensionState.ALIVE,
      actorId: payload.actorId,
      leadUserId: payload.leadUserId,
      version: event.version,
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
      discarded: false,
    };
  }

  // Every other event presupposes a sensed tension.
  if (!state) return null;

  const next: TensionAggregateState = {
    ...state,
    version: event.version,
    updatedAt: event.occurredAt,
  };

  switch (event.type) {
    case TensionEventType.RENAMED:
      next.name = (event.payload as unknown as TensionRenamedPayload).name;
      break;
    case TensionEventType.RESCORED:
      next.score = (event.payload as unknown as TensionRescoredPayload).score;
      break;
    case TensionEventType.CONTEXT_REVISED: {
      const payload = event.payload as unknown as TensionContextRevisedPayload;
      if (payload.currentContext !== undefined) next.currentContext = payload.currentContext;
      if (payload.potentialFuture !== undefined) next.potentialFuture = payload.potentialFuture;
      break;
    }
    case TensionEventType.LEAD_ASSIGNED:
      next.leadUserId = (event.payload as unknown as TensionLeadAssignedPayload).leadUserId;
      break;
    case TensionEventType.LEAD_UNASSIGNED:
      next.leadUserId = null;
      break;
    case TensionEventType.REASSIGNED:
      next.actorId = (event.payload as unknown as TensionReassignedPayload).actorId;
      break;
    case TensionEventType.RESOLVED:
      next.state = TensionState.RESOLVED;
      break;
    case TensionEventType.DROPPED:
      next.state = TensionState.STALE;
      break;
    case TensionEventType.REOPENED:
    case TensionEventType.REVIVED:
      next.state = TensionState.ALIVE;
      break;
    case TensionEventType.DISCARDED:
      next.discarded = true;
      break;
  }

  return next;
}

/** Folds a full stream. Returns null when the stream is empty. */
export function reconstitute(
  aggregateId: string,
  events: TensionStreamEvent[],
): TensionAggregateState | null {
  return events.reduce<TensionAggregateState | null>(
    (state, event) => applyTensionEvent(state, event, aggregateId),
    null,
  );
}

/** True when the stream describes a tension that currently exists. */
export function isLive(state: TensionAggregateState | null): state is TensionAggregateState {
  return state !== null && !state.discarded;
}
