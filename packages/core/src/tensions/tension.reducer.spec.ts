import { TensionEventType, TensionState } from '@marketlum/shared';
import {
  applyTensionEvent,
  isLive,
  reconstitute,
  type TensionStreamEvent,
} from './tension.reducer';

const AGG = '11111111-1111-1111-1111-111111111111';
const ACTOR = '22222222-2222-2222-2222-222222222222';
const ACTOR_B = '33333333-3333-3333-3333-333333333333';
const USER = '44444444-4444-4444-4444-444444444444';
const T0 = new Date('2026-01-01T10:00:00.000Z');
const T1 = new Date('2026-01-02T10:00:00.000Z');

let version = 0;
function event(type: TensionEventType, payload: Record<string, unknown> = {}, occurredAt = T1): TensionStreamEvent {
  return { type, payload, version: ++version, occurredAt };
}

beforeEach(() => {
  version = 0;
});

const sensed = () =>
  event(
    TensionEventType.SENSED,
    {
      name: 'Onboarding gap',
      currentContext: 'Manual today',
      potentialFuture: 'Automated',
      score: 5,
      actorId: ACTOR,
      leadUserId: null,
    },
    T0,
  );

describe('applyTensionEvent', () => {
  it('builds initial state from TensionSensed', () => {
    const state = applyTensionEvent(null, sensed(), AGG)!;
    expect(state).toMatchObject({
      id: AGG,
      name: 'Onboarding gap',
      currentContext: 'Manual today',
      potentialFuture: 'Automated',
      score: 5,
      state: TensionState.ALIVE,
      actorId: ACTOR,
      leadUserId: null,
      version: 1,
      discarded: false,
    });
    expect(state.createdAt).toEqual(T0);
    expect(state.updatedAt).toEqual(T0);
  });

  it('ignores non-genesis events on an empty stream', () => {
    expect(applyTensionEvent(null, event(TensionEventType.RESOLVED), AGG)).toBeNull();
  });

  it('applies a rename', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.RENAMED, { name: 'Supply risk', previousName: 'Onboarding gap' }),
    ])!;
    expect(s.name).toBe('Supply risk');
    expect(s.version).toBe(2);
    expect(s.updatedAt).toEqual(T1);
  });

  it('applies a rescore', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.RESCORED, { score: 8, previousScore: 5 }),
    ])!;
    expect(s.score).toBe(8);
  });

  it('revises only the context fields present in the payload', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.CONTEXT_REVISED, {
        currentContext: 'Half automated',
        previousCurrentContext: 'Manual today',
      }),
    ])!;
    expect(s.currentContext).toBe('Half automated');
    expect(s.potentialFuture).toBe('Automated');
  });

  it('revises a context field to null when explicitly nulled', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.CONTEXT_REVISED, {
        potentialFuture: null,
        previousPotentialFuture: 'Automated',
      }),
    ])!;
    expect(s.potentialFuture).toBeNull();
    expect(s.currentContext).toBe('Manual today');
  });

  it('assigns and unassigns the lead', () => {
    const assigned = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.LEAD_ASSIGNED, { leadUserId: USER, previousLeadUserId: null }),
    ])!;
    expect(assigned.leadUserId).toBe(USER);

    const unassigned = applyTensionEvent(
      assigned,
      event(TensionEventType.LEAD_UNASSIGNED, { previousLeadUserId: USER }),
      AGG,
    )!;
    expect(unassigned.leadUserId).toBeNull();
  });

  it('reassigns the owning actor', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.REASSIGNED, { actorId: ACTOR_B, previousActorId: ACTOR }),
    ])!;
    expect(s.actorId).toBe(ACTOR_B);
  });
});

describe('lifecycle transitions', () => {
  it.each([
    [TensionEventType.RESOLVED, TensionState.RESOLVED],
    [TensionEventType.DROPPED, TensionState.STALE],
  ])('%s moves an alive tension to %s', (type, expected) => {
    const s = reconstitute(AGG, [sensed(), event(type)])!;
    expect(s.state).toBe(expected);
  });

  it('reopen returns a resolved tension to alive', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.RESOLVED),
      event(TensionEventType.REOPENED),
    ])!;
    expect(s.state).toBe(TensionState.ALIVE);
    expect(s.version).toBe(3);
  });

  it('revive returns a stale tension to alive', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.DROPPED),
      event(TensionEventType.REVIVED),
    ])!;
    expect(s.state).toBe(TensionState.ALIVE);
  });

  it('preserves the full cycle history in the final version number', () => {
    const s = reconstitute(AGG, [
      sensed(),
      event(TensionEventType.RESOLVED),
      event(TensionEventType.REOPENED),
      event(TensionEventType.RESOLVED),
    ])!;
    expect(s.state).toBe(TensionState.RESOLVED);
    expect(s.version).toBe(4);
  });
});

describe('discard', () => {
  it('marks the aggregate discarded', () => {
    const s = reconstitute(AGG, [sensed(), event(TensionEventType.DISCARDED)])!;
    expect(s.discarded).toBe(true);
  });

  it('isLive is false for a discarded tension and true otherwise', () => {
    expect(isLive(reconstitute(AGG, [sensed()]))).toBe(true);
    expect(isLive(reconstitute(AGG, [sensed(), event(TensionEventType.DISCARDED)]))).toBe(false);
    expect(isLive(null)).toBe(false);
  });
});

describe('reconstitute', () => {
  it('returns null for an empty stream', () => {
    expect(reconstitute(AGG, [])).toBeNull();
  });

  it('is deterministic — replaying the same stream yields the same state', () => {
    const stream = [
      sensed(),
      event(TensionEventType.RESCORED, { score: 9, previousScore: 5 }),
      event(TensionEventType.RENAMED, { name: 'Renamed', previousName: 'Onboarding gap' }),
      event(TensionEventType.RESOLVED),
    ];
    expect(reconstitute(AGG, stream)).toEqual(reconstitute(AGG, stream));
  });
});
