import { BadRequestException } from '@nestjs/common';
import { TensionEventType, TensionState } from '@marketlum/shared';
import type { TensionAggregateState } from './tension.reducer';

/**
 * Lifecycle guards for the Tension aggregate (spec 027 Q12).
 *
 * These replaced the xstate `tensionMachine`, which was retired for this
 * aggregate. Exchanges and Orders keep their machines; only Tensions moved its
 * legality into the write model.
 *
 *                 resolve
 *        ┌────────────────────────►  resolved
 *        │                              │
 *      alive  ◄──────────────────────────┘  reopen
 *        │  drop
 *        └────────────────────────►  stale
 *        ▲                              │
 *        └──────────────────────────────┘  revive
 */
export type TensionTransition = 'resolve' | 'drop' | 'reopen' | 'revive';

const TRANSITIONS: Record<TensionTransition, { from: TensionState; event: TensionEventType }> = {
  resolve: { from: TensionState.ALIVE, event: TensionEventType.RESOLVED },
  drop: { from: TensionState.ALIVE, event: TensionEventType.DROPPED },
  reopen: { from: TensionState.RESOLVED, event: TensionEventType.REOPENED },
  revive: { from: TensionState.STALE, event: TensionEventType.REVIVED },
};

/**
 * Returns the event a legal transition produces, or throws with the same
 * message shape the pre-027 service produced so clients see no change.
 */
export function transitionEvent(
  state: TensionAggregateState,
  action: TensionTransition,
): TensionEventType {
  const rule = TRANSITIONS[action];
  if (state.state !== rule.from) {
    throw new BadRequestException(
      `Cannot transition from ${state.state} using action "${action}"`,
    );
  }
  return rule.event;
}
