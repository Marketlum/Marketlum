import { getEventRecorder } from '../setup';

export function expectEventWithNewIdAndCode(eventName: string): void {
  const events = getEventRecorder().getByName(eventName);
  expect(events.length).toBeGreaterThanOrEqual(1);
  const last = events[events.length - 1];
  expect(last.payload.id).toBeTruthy();
  expect(last.payload.code).toBeTruthy();
}

export function expectEventWithId(eventName: string): void {
  const events = getEventRecorder().getByName(eventName);
  expect(events.length).toBeGreaterThanOrEqual(1);
  const last = events[events.length - 1];
  expect(last.payload.id).toBeTruthy();
}

export function expectNoEventMatching(pattern: string): void {
  const prefix = pattern.replace(/\*+$/, '');
  const matches = getEventRecorder().getByPrefix(prefix);
  expect(matches).toEqual([]);
}
