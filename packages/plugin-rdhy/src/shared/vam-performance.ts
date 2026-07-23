import type { RdhyVamStatus, RdhyVamTrack } from './vam-schemas';

export const VAM_COMPARABILITY = [
  'COMPARABLE',
  'CURRENCY_MISMATCH',
  'NO_AGREEMENT_CURRENCY',
  'NO_AGENT_CURRENCY',
  'NO_MEASURABLE_TARGETS',
] as const;

export const VAM_MILESTONE_STATUSES = [
  'ACHIEVED',
  'MISSED',
  'ON_TRACK',
  'BEHIND',
  'UPCOMING',
] as const;

export type RdhyVamComparability = (typeof VAM_COMPARABILITY)[number];
export type RdhyVamMilestoneStatus = (typeof VAM_MILESTONE_STATUSES)[number];

interface CurrencySummary {
  id: string;
  code: string;
  name: string;
}

export interface RdhyVamPerformanceItem {
  id: string;
  track: RdhyVamTrack;
  description: string;
  amount: string | null;
  measured: boolean;
}

export interface RdhyVamPerformanceMilestone {
  id: string;
  offsetMonths: number;
  label: string | null;
  dueDate: string;
  targetIncrement: string | null;
  targetCumulative: string;
  actualCumulative: string | null;
  attainmentPct: number | null;
  status: RdhyVamMilestoneStatus | null;
  items: RdhyVamPerformanceItem[];
}

export interface RdhyVamMonthlyActual {
  month: string; // 'YYYY-MM'
  revenue: string;
  cumulative: string;
}

export interface RdhyVamPerformanceResponse {
  agreementId: string;
  agreementStatus: RdhyVamStatus;
  comparability: RdhyVamComparability;
  currency: CurrencySummary | null;
  agentFunctionalCurrency: CurrencySummary | null;
  windowStart: string;
  windowEnd: string;
  summary: {
    targetToDate: string | null;
    actualToDate: string | null;
    attainmentPct: number | null;
    overallStatus: RdhyVamMilestoneStatus | null;
  };
  milestones: RdhyVamPerformanceMilestone[];
  monthlyActuals: RdhyVamMonthlyActual[] | null;
  invoiceCount: number;
  notConvertedCount: number;
}

/** Calendar-month addition with end-of-month clamping (Jan 31 + 1 = Feb 28). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Incremental-target semantics (spec 018 Q3 + pre-decision 3): a milestone's
 * increment is the sum of its measurable items (DIRECT_VALUE with an amount),
 * null when it has none; the cumulative target is the running sum.
 */
export function cumulativeTargets(
  milestones: Array<{ items: Array<{ track: string; amount: string | number | null }> }>,
): Array<{ increment: number | null; cumulative: number }> {
  let running = 0;
  return milestones.map((milestone) => {
    const measured = milestone.items.filter(
      (item) => item.track === 'DIRECT_VALUE' && item.amount !== null,
    );
    if (measured.length === 0) return { increment: null, cumulative: running };
    const increment = measured.reduce((sum, item) => sum + Number(item.amount), 0);
    running += increment;
    return { increment, cumulative: running };
  });
}

/** Day-granular linear interpolation between two cumulative targets (Q13). */
export function proRataTarget(
  prevCumulative: number,
  nextCumulative: number,
  prevDue: Date,
  due: Date,
  at: Date,
): number {
  const span = due.getTime() - prevDue.getTime();
  if (span <= 0) return nextCumulative;
  const fraction = Math.min(1, Math.max(0, (at.getTime() - prevDue.getTime()) / span));
  return prevCumulative + (nextCumulative - prevCumulative) * fraction;
}

/**
 * Q5/Q13 status model. A zero cumulative target has nothing to judge (only
 * qualitative milestones so far) regardless of phase.
 */
export function milestoneStatus(args: {
  targetCumulative: number;
  phase: 'PAST_DUE' | 'CURRENT' | 'FUTURE';
  actual: number;
  proRata: number | null;
}): RdhyVamMilestoneStatus | null {
  if (args.targetCumulative <= 0) return null;
  if (args.phase === 'PAST_DUE') {
    return args.actual >= args.targetCumulative ? 'ACHIEVED' : 'MISSED';
  }
  if (args.phase === 'CURRENT') {
    return args.actual >= (args.proRata ?? 0) ? 'ON_TRACK' : 'BEHIND';
  }
  return 'UPCOMING';
}

/** Cumulative attainment (Q7), rounded to one decimal; null when unjudgeable. */
export function attainmentPct(actual: number, target: number): number | null {
  if (target <= 0) return null;
  return Math.round((actual / target) * 1000) / 10;
}
