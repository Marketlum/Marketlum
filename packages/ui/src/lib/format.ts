/**
 * Locale-aware display formatting for money and dates, shared across the
 * whole admin UI. The locale defaults to the app locale that next-intl
 * stamps on `<html lang>`, so plain cell renderers (which cannot call
 * hooks) format correctly without plumbing.
 */

function appLocale(explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return undefined;
}

/**
 * `"36422.5"` → `"36 422.50 PLN"` (grouping per locale, always 2 decimals,
 * currency code appended when given). Clamps `-0` to `0`. Null/invalid → em dash.
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency?: string | null,
  locale?: string,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  const clamped = n === 0 ? 0 : n;
  const formatted = new Intl.NumberFormat(appLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(clamped);
  return currency ? `${formatted} ${currency}` : formatted;
}

/** Date-only display (`Mar 12, 2026` / `12 mar 2026`). Null/invalid → em dash. */
export function formatDay(
  value: string | Date | null | undefined,
  locale?: string,
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(appLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
