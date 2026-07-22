import type {
  FinancialsMonthRow,
  FinancialsQuarterRow,
  FinancialsSummary,
} from '@marketlum/shared';

/** Presentation view-model shared by the value-stream and agent financials
 * surfaces. Callers map their endpoint response into this shape so the
 * summary cards, breakdown table and empty states stay source-agnostic. */
export interface FinancialsView {
  year: number;
  /** Reporting currency display name; null when none is configured. */
  currencyName: string | null;
  summary: FinancialsSummary;
  byMonth: FinancialsMonthRow[];
  byQuarter: FinancialsQuarterRow[];
  invoiceCount: number;
  notConvertedCount: number;
}
