import { RecurringFlowFrequency } from '../enums/recurring-flow-frequency.enum';

export interface RecurringFlowScheduleInput {
  frequency: RecurringFlowFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
}

function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addOccurrence(d: Date, frequency: RecurringFlowFrequency, interval: number, n: number): Date {
  const next = new Date(d.getTime());
  switch (frequency) {
    case RecurringFlowFrequency.DAILY:
      next.setUTCDate(d.getUTCDate() + interval * n);
      return next;
    case RecurringFlowFrequency.WEEKLY:
      next.setUTCDate(d.getUTCDate() + interval * 7 * n);
      return next;
    case RecurringFlowFrequency.MONTHLY:
      next.setUTCMonth(d.getUTCMonth() + interval * n);
      return next;
    case RecurringFlowFrequency.QUARTERLY:
      next.setUTCMonth(d.getUTCMonth() + interval * 3 * n);
      return next;
    case RecurringFlowFrequency.YEARLY:
      next.setUTCFullYear(d.getUTCFullYear() + interval * n);
      return next;
  }
}

export function nextOccurrences(schedule: RecurringFlowScheduleInput, count: number): string[] {
  if (count <= 0) return [];
  const start = parseISODate(schedule.startDate);
  const end = schedule.endDate ? parseISODate(schedule.endDate) : null;
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const occurrence = addOccurrence(start, schedule.frequency, schedule.interval, i);
    if (end && occurrence > end) break;
    dates.push(formatISODate(occurrence));
  }
  return dates;
}

export function occurrencesInMonth(
  schedule: RecurringFlowScheduleInput,
  yearMonth: { year: number; month: number },
): number {
  const start = parseISODate(schedule.startDate);
  const end = schedule.endDate ? parseISODate(schedule.endDate) : null;
  const monthStart = new Date(Date.UTC(yearMonth.year, yearMonth.month - 1, 1));
  const monthEnd = new Date(Date.UTC(yearMonth.year, yearMonth.month, 0));
  if (start > monthEnd) return 0;
  if (end && end < monthStart) return 0;

  let count = 0;
  const horizon = 1000;
  for (let i = 0; i < horizon; i++) {
    const occurrence = addOccurrence(start, schedule.frequency, schedule.interval, i);
    if (occurrence > monthEnd) break;
    if (end && occurrence > end) break;
    if (occurrence >= monthStart) count++;
  }
  return count;
}

export function monthlyEquivalent(amount: number, frequency: RecurringFlowFrequency, interval: number): number {
  const safeInterval = interval > 0 ? interval : 1;
  switch (frequency) {
    case RecurringFlowFrequency.DAILY:
      return (amount * 30) / safeInterval;
    case RecurringFlowFrequency.WEEKLY:
      return (amount * (52 / 12)) / safeInterval;
    case RecurringFlowFrequency.MONTHLY:
      return amount / safeInterval;
    case RecurringFlowFrequency.QUARTERLY:
      return amount / (3 * safeInterval);
    case RecurringFlowFrequency.YEARLY:
      return amount / (12 * safeInterval);
  }
}

export function formatFrequency(frequency: RecurringFlowFrequency, interval: number): string {
  const unit = (() => {
    switch (frequency) {
      case RecurringFlowFrequency.DAILY:
        return interval === 1 ? 'day' : 'days';
      case RecurringFlowFrequency.WEEKLY:
        return interval === 1 ? 'week' : 'weeks';
      case RecurringFlowFrequency.MONTHLY:
        return interval === 1 ? 'month' : 'months';
      case RecurringFlowFrequency.QUARTERLY:
        return interval === 1 ? 'quarter' : 'quarters';
      case RecurringFlowFrequency.YEARLY:
        return interval === 1 ? 'year' : 'years';
    }
  })();
  return `every ${interval} ${unit}`;
}
