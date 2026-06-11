/**
 * Shared formatting helpers for value-stream money figures, used by both the
 * budget (projection) and financials (actuals) tabs so the two render
 * identically.
 */

/** `"1234.00"` + currency → `"1234.00 EUR"`; null → em dash. */
export function formatFigure(value: string | null, currency: string): string {
  if (value === null) return '—';
  return `${value} ${currency}`;
}

/** Sign-based colour class for a net/summary figure (null → neutral). */
export function netClass(value: string | null): string {
  if (value === null) return '';
  const n = Number(value);
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-red-600';
  return '';
}

/** Sign-based colour class for a breakdown cell (null → muted). */
export function cellClass(value: string | null): string {
  if (value === null) return 'text-muted-foreground';
  const n = Number(value);
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-red-600';
  return '';
}

/** Raw figure or em dash when null. */
export function fmt(value: string | null): string {
  return value ?? '—';
}
