# Value Stream Budget — Specification

> **Status:** Approved (brainstormed in `003-value-stream-budget-brainstorming.md`)
> **Target delivery:** Single PR (service + controller + shared schema + web page + tab nav + BDD + template mirror)
> **Scope:** A derived `/admin/value-streams/[id]/budget` view that aggregates the value stream&apos;s `RecurringFlow`s into monthly, quarterly, and annual figures (in the system base currency) for a selected calendar year, with optional descendant aggregation.

---

## 1. Overview

The page shows three headline cards (Monthly / Quarterly / Annual) for a selected calendar year, plus a per-month or per-quarter breakdown table beneath. All figures are expressed in the system base value using the existing `RecurringFlow.baseAmount` snapshot &mdash; no new entity, no schema migration, no live FX lookups.

- **Source data:** `RecurringFlow` rows with `status = ACTIVE` attached to the value stream (or its descendants).
- **Occurrence math:** per-month, reusing the existing logic from `RecurringFlowsProjectionService` so `startDate`/`endDate` are honoured.
- **Currency:** every contributing flow uses its `baseAmount` snapshot; flows lacking a snapshot are skipped and reported via `skippedFlows`.
- **Tree:** subtree by default; an admin can flip a &ldquo;Direct only&rdquo; switch when the stream has descendants.

```
       ┌──────────────────────────────────────┐
       │       /admin/value-streams/[id]      │
       │   ┌──────────┐ ┌──────────┐          │
       │   │ Overview │ │  Budget  │ ← tabs   │
       │   └──────────┘ └──────────┘          │
       │              ─────                   │
       │      ◀ 2026 ▾ ▶   Direct only □      │
       │                                      │
       │   [Monthly]  [Quarterly]  [Annual]   │
       │                                      │
       │   Breakdown   [Months][Quarters]     │
       │                                      │
       │   Jan  Feb  Mar  Apr  …  Dec         │
       │   ...                                │
       └──────────────────────────────────────┘
```

---

## 2. Domain Rules

### 2.1 Time semantics (Q2.1)

For a selected calendar year `Y`:

- `annual = Σ occurrences in Y` &mdash; sum of every `RecurringFlow` occurrence falling between `Y-01-01` and `Y-12-31` inclusive, using the existing `occurrencesInMonth` helper for each of the 12 months.
- `quarterly = annual / 4`
- `monthly = annual / 12`

This is computed independently for `revenue` (direction = `inbound`), `expense` (direction = `outbound`), and `net = revenue − expense`.

### 2.2 Per-month and per-quarter breakdown (Q2.2)

`byMonth` returns 12 entries (one per month of `Y`) with `revenue`, `expense`, and `net` summed across all contributing flows. `byQuarter` returns 4 entries (`Q1` … `Q4`), each the sum of its three months. Both are returned in the same response so the client can flip between views without a round-trip.

### 2.3 Flow filter (Q1.5, Q1.6, Q3.3)

Contributing flows match:

- `status = ACTIVE`
- `valueStreamId = :id` (direct mode) **or** the stream id is `:id` or any descendant of `:id` per the value-stream closure table (subtree mode &mdash; the default).
- For each of the 12 months in `Y`, `occurrencesInMonth({ frequency, interval, startDate, endDate }, { year: Y, month })` returns &ge; 1.

`unit` is intentionally **ignored** &mdash; the budget converts everything via `baseAmount`. Native `unit` is not surfaced on this page.

### 2.4 Currency handling (Q1.3, Q2.5)

- If the system base value is unset (`systemSettings.base_value_id IS NULL`), the response carries `baseValue: null` and the summary &amp; breakdown figures are all `null`. The page renders the &ldquo;No system base value configured&rdquo; banner (Q3.5).
- For each contributing flow, the per-occurrence base amount is `flow.baseAmount`. If `baseAmount IS NULL`, the flow is **skipped** and the response&apos;s `skippedFlows` counter is incremented.
- All figures are formatted via `Number(x).toFixed(2)` (`decimal(2)`).

### 2.5 Per-month aggregation algorithm

```ts
for each month m in 1..12:
  revenueM = 0; expenseM = 0
  for each flow in scope (after subtree + status filter):
    if flow.baseAmount == null:
      // count once per service call, not once per month
      skippedFlows += 1 if first time
      continue
    occurrences = occurrencesInMonth(
      { frequency, interval, startDate, endDate },
      { year: Y, month: m },
    )
    contribution = Number(flow.baseAmount) * occurrences
    if flow.direction === INBOUND: revenueM += contribution
    else: expenseM += contribution
  byMonth.push({ month, revenue: revenueM.toFixed(2), expense: expenseM.toFixed(2), net: (revenueM - expenseM).toFixed(2) })

annual.revenue = Σ byMonth[i].revenue
annual.expense = Σ byMonth[i].expense
annual.net     = annual.revenue - annual.expense
quarterly      = annual / 4
monthly        = annual / 12
```

`skippedFlows` is counted **per distinct flow**, not per occurrence.

---

## 3. API Surface

One new endpoint (Q2.4), gated by `AdminGuard` (mirrors existing controller convention).

### 3.1 `GET /value-streams/:id/budget`

| Query param | Type | Default | Notes |
|---|---|---|---|
| `year` | `number` (1900&ndash;2100) | current UTC year | The calendar year to aggregate. |
| `directOnly` | `'true' \| 'false'` | `'false'` | When `true`, only flows attached directly to `:id` (no descendants). |

Response (`200 OK`):

```jsonc
{
  "valueStreamId": "00000000-0000-0000-0000-000000000000",
  "year": 2026,
  "directOnly": false,
  "baseValue": { "id": "...", "name": "USD" } | null,
  "summary": {
    "revenue": { "monthly": "1200.00", "quarterly": "3600.00", "annual": "14400.00" },
    "expense": { "monthly":  "800.00", "quarterly": "2400.00", "annual":  "9600.00" },
    "net":     { "monthly":  "400.00", "quarterly": "1200.00", "annual":  "4800.00" }
  },
  "byMonth":   [ { "month": "2026-01", "revenue": "1200.00", "expense": "800.00", "net": "400.00" }, /* ×12 */ ],
  "byQuarter": [ { "quarter": "2026-Q1", "revenue": "3600.00", "expense": "2400.00", "net": "1200.00" }, /* ×4 */ ],
  "activeFlowCount": 7,
  "skippedFlows": 0
}
```

When `baseValue` is `null`, `summary.*`, `byMonth[*].*`, and `byQuarter[*].*` are still arrays/objects of the same shape but **all numeric fields are `null`**. The client renders the &ldquo;No system base value configured&rdquo; empty state (§7.4).

Error responses:

- `400 Bad Request` &mdash; invalid `year` or `directOnly` (Zod validation).
- `401 Unauthorized` &mdash; missing/invalid auth cookie.
- `403 Forbidden` &mdash; authenticated user is not an admin (handled by `AdminGuard`).
- `404 Not Found` &mdash; value stream does not exist.

---

## 4. Zod Validation Schemas

Lives in `packages/shared/src/schemas/value-stream-budget.schema.ts` (new file, single source of truth).

```ts
export const valueStreamBudgetQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100).default(() => new Date().getUTCFullYear()),
  directOnly: z.coerce.boolean().default(false),
});

const figureSchema = z.object({
  monthly:   z.string().nullable(),
  quarterly: z.string().nullable(),
  annual:    z.string().nullable(),
});

const monthRowSchema = z.object({
  month:   z.string(),         // "YYYY-MM"
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net:     z.string().nullable(),
});

const quarterRowSchema = z.object({
  quarter: z.string(),         // "YYYY-Q[1-4]"
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net:     z.string().nullable(),
});

const valueSummarySchema = z.object({
  id:   z.string().uuid(),
  name: z.string(),
});

export const valueStreamBudgetResponseSchema = z.object({
  valueStreamId:   z.string().uuid(),
  year:            z.number().int(),
  directOnly:      z.boolean(),
  baseValue:       valueSummarySchema.nullable(),
  summary: z.object({
    revenue: figureSchema,
    expense: figureSchema,
    net:     figureSchema,
  }),
  byMonth:         z.array(monthRowSchema).length(12),
  byQuarter:       z.array(quarterRowSchema).length(4),
  activeFlowCount: z.number().int(),
  skippedFlows:    z.number().int(),
});

export type ValueStreamBudgetQuery    = z.infer<typeof valueStreamBudgetQuerySchema>;
export type ValueStreamBudgetResponse = z.infer<typeof valueStreamBudgetResponseSchema>;
```

Re-exported from `packages/shared/src/index.ts`.

---

## 5. Backend Module Layout

```
packages/core/src/recurring-flows/
├── entities/recurring-flow.entity.ts        ← unchanged
├── projection.service.ts                    ← unchanged
├── rollup.service.ts                        ← unchanged
├── budget.service.ts                        ← NEW: RecurringFlowsBudgetService
├── recurring-flow.dto.ts                    ← + ValueStreamBudgetResponseDto
├── recurring-flows.controller.ts            ← unchanged
├── recurring-flows.module.ts                ← register BudgetService; import ValueStream closure
└── value-stream-recurring-flows.controller.ts  ← + GET .../budget route
```

### 5.1 `RecurringFlowsBudgetService` (new)

Constructor injects `RecurringFlow`, `ValueStream`, and `SystemSettingsService`. Uses TypeORM&apos;s closure-table support on `ValueStream` to expand the subtree.

Public method:

```ts
async forValueStream(
  valueStreamId: string,
  options: { year: number; directOnly: boolean },
): Promise<ValueStreamBudgetResponse>;
```

Steps:

1. Assert the value stream exists; 404 otherwise.
2. Resolve scope: `directOnly` &rArr; `[valueStreamId]`; else load all descendant ids via the closure table (`value_streams_closure`).
3. Load `RecurringFlow` rows with `valueStreamId IN (...) AND status = ACTIVE`. Eager-load only `direction`, `amount`, `unit`, `frequency`, `interval`, `startDate`, `endDate`, `baseAmount` (no relations needed).
4. Look up `systemSettings.base_value_id`. If `null` &rArr; return a response with `baseValue: null` and every numeric field `null` (but with the array shapes preserved).
5. Otherwise load the base `Value` row (id+name only) for the response.
6. Run the algorithm in §2.5; produce `byMonth`, `byQuarter`, `summary`.
7. `activeFlowCount` is the number of flows from step 3; `skippedFlows` counts distinct flows with `baseAmount IS NULL`.

### 5.2 `ValueStreamRecurringFlowsController` route (added)

```ts
@Get('budget')
@ApiOperation({ summary: 'Get the value-stream budget for a calendar year' })
@ApiParam({ name: 'valueStreamId', type: String })
@ApiQuery({ name: 'year', required: false, type: Number })
@ApiQuery({ name: 'directOnly', required: false, type: Boolean })
@ApiOkResponse({ type: ValueStreamBudgetResponseDto })
async budget(
  @Param('valueStreamId') valueStreamId: string,
  @Query(new ZodValidationPipe(valueStreamBudgetQuerySchema)) query: ValueStreamBudgetQuery,
) {
  return this.budgetService.forValueStream(valueStreamId, query);
}
```

The route lives **on the existing** `value-stream-recurring-flows.controller.ts` (path `/value-streams/:valueStreamId/budget`). The controller&apos;s base path is changed from `value-streams/:valueStreamId/recurring-flows` to `value-streams/:valueStreamId` so it can host both the recurring-flow sub-routes (`/recurring-flows`, `/recurring-flows/rollup`, `/recurring-flows/projection`) and the new `/budget` route. Each route specifies its own sub-path.

**Alternative considered:** a sibling `ValueStreamBudgetController`. Rejected to keep the module compact; the existing controller is already structured around per-stream rollups/projections.

### 5.3 Permissions

`AdminGuard` at the controller level (unchanged). No new roles.

---

## 6. Web UI

### 6.1 New page: `apps/web/src/app/admin/value-streams/[id]/budget/page.tsx`

```ts
export { ValueStreamBudgetPage as default } from '@marketlum/ui';
```

### 6.2 New shared layout: `apps/web/src/app/admin/value-streams/[id]/layout.tsx`

Renders a tabs strip at the top with two tabs:

- **Overview** &rarr; `/admin/value-streams/[id]`
- **Budget** &rarr; `/admin/value-streams/[id]/budget`

The detail page&apos;s breadcrumbs and `RecurringFlowsSummaryCard` move *under* the Overview tab. The Budget tab renders the new budget page.

```ts
export { ValueStreamLayout as default } from '@marketlum/ui';
```

### 6.3 New UI package exports

```
packages/ui/src/
├── layouts/value-stream-layout.tsx                       ← tabs wrapper
├── pages/admin/value-stream-budget-page.tsx              ← budget page
├── components/value-stream-budget/
│   ├── year-selector.tsx                                 ← ◀ 2026 ▾ ▶
│   ├── budget-summary-cards.tsx                          ← three headline cards
│   ├── budget-breakdown-table.tsx                        ← months/quarters tabs + table
│   └── budget-empty-states.tsx                           ← three banners
└── index.ts                                              ← + 2 new page exports
```

### 6.4 Year selector (Q3.2)

`year-selector.tsx`: an inline pill `[◀] [2026 ▾] [▶]`. The dropdown lists 7 entries (current ±3) plus &ldquo;Custom&hellip;&rdquo;, which opens a small numeric input dialog. Selection updates a URL query param (`?year=YYYY`) for shareable links.

### 6.5 &ldquo;Direct only&rdquo; switch (Q3.3)

`year-selector.tsx` co-renders a labelled shadcn `Switch` next to the chevrons, but **only when the stream has descendants**. The page fetches the value stream itself (which already exposes a children count via `/value-streams/:id`) to decide whether to render the switch. State syncs to a `?directOnly=true` query param.

### 6.6 Breakdown table (Q3.4)

`budget-breakdown-table.tsx` wraps a shadcn `Tabs` with two tabs:

- `Months` &rarr; 12 columns, rows: Revenue, Expense, Net.
- `Quarters` &rarr; 4 columns, same rows.

Numeric cells render `{value} {baseValue.name}`. Net rows are shaded (green when positive, red when negative). Mobile collapses to a stacked card per month/quarter.

### 6.7 Empty / error states (Q3.5)

Three banners (alert components) render at the top of the page:

1. **No system base value configured** &mdash; when `baseValue == null`. Banner text: &ldquo;No system base value is configured. The budget cannot be computed.&rdquo; Includes a link to `/admin/exchange-rates`.
2. **No active flows** &mdash; when `activeFlowCount == 0`. Banner text: &ldquo;No active recurring flows for this value stream.&rdquo; Includes a CTA button linking to `/admin/recurring-flows?valueStreamId=...&action=new`.
3. **Some flows skipped** &mdash; when `skippedFlows > 0`. Banner text: &ldquo;{N} flow(s) skipped &mdash; no base-currency snapshot. Save each flow again to refresh.&rdquo;

When `baseValue == null`, the headline cards and table render their skeletons with `—` placeholders rather than disappearing.

### 6.8 Translations

New keys under `valueStreamBudget` in `packages/ui/messages/en.json` and `pl.json`:

```
"valueStreamBudget": {
  "title", "tabBudget", "tabOverview",
  "year", "yearCustom",
  "directOnly", "directOnlyHint",
  "monthly", "quarterly", "annual",
  "revenue", "expense", "net",
  "breakdown", "viewMonths", "viewQuarters",
  "noBaseValueTitle", "noBaseValueBody", "noBaseValueAction",
  "noActiveFlowsTitle", "noActiveFlowsBody", "noActiveFlowsAction",
  "skippedFlowsTitle", "skippedFlowsBody",
  "failedToLoad"
}
```

A new top-level `nav` key is *not* needed (no sidebar entry).

---

## 7. Template Synchronization (per `CLAUDE.md`)

The new admin pages must be mirrored in `packages/create-marketlum-app/template/`:

```
packages/create-marketlum-app/template/web/src/app/admin/value-streams/[id]/
├── layout.tsx           ← NEW (re-export ValueStreamLayout)
└── budget/
    └── page.tsx         ← NEW (re-export ValueStreamBudgetPage)
```

Both files are one-line re-exports from `@marketlum/ui`. No `apps/api/` changes beyond what `packages/core/` ships, so the API template needs no edits.

---

## 8. Seed Data

No new seed data is required &mdash; the existing `recurring-flow.seeder.ts` already produces enough sample flows for the budget to be non-empty after `pnpm seed:sample`. With the system base set to USD (from spec 002&apos;s seeder), all USD-denominated recurring flows will surface in the page; non-USD flows that have rates via the exchange-rates seeder will too.

---

## 9. BDD Test Coverage

Strict-BDD per project rule. Feature files in `packages/bdd/features/value-stream-budget/`, step definitions in `apps/api/test/value-stream-budget/budget.steps.ts`.

### 9.1 `value-stream-budget/budget.feature` &mdash; ~10 scenarios

| Scenario | Verifies |
|---|---|
| Empty stream returns zero totals | Stream with no flows &rArr; `activeFlowCount = 0`, summary fields `"0.00"`, banner shows. |
| Inactive flows excluded | `DRAFT` / `PAUSED` / `ENDED` flows do not contribute. |
| `startDate` clips contribution | Flow starting in July contributes only 6 months. |
| `endDate` clips contribution | Flow ending in June contributes only 6 months. |
| Direct-only excludes descendants | Subtree mode includes child flows; direct mode does not. |
| Year selector picks correct months | Flow active only in 2025 contributes to 2025 budget, zero to 2026 budget. |
| Monthly = annual / 12 invariant | `summary.revenue.monthly * 12` equals `summary.revenue.annual` exactly. |
| Quarterly = annual / 4 invariant | Same invariant for quarterly. |
| Missing snapshots increment `skippedFlows` | Flow with `NULL baseAmount` is counted in `skippedFlows`, not summary totals. |
| Missing base value returns null totals | When `base_value_id` is unset, `baseValue` is `null` and all numeric fields are `null`. |

### 9.2 Authorization &mdash; 2 scenarios

- Unauthenticated request &rArr; `401`.
- Authenticated non-admin &rArr; `403`. (Existing project pattern uses an admin-only model; this scenario mirrors `recurring-flows`.)

### 9.3 Multi-currency &mdash; 1 scenario

- Stream has one EUR flow and one USD flow; base = USD; verify both convert correctly into the summary (using existing snapshot data).

**Total: 13 scenarios.** Each scenario re-declares background steps per the &ldquo;one `and()` per step&rdquo; jest-cucumber rule documented in `MEMORY.md`.

### 9.4 Tab UI is not BDD-tested

The tabs strip is a thin layout component; per project memory, no full e2e browser tests in conversation. Tab behaviour is covered by `tsc` and `next build`.

---

## 10. Out of Scope

Cross-referenced to the brainstorming questions that defined each boundary.

- **First-class `Budget` entity** (Q1.1) &mdash; no editable plan-vs-actual, no manual line items, no DB writes.
- **User-selectable arbitrary date range** (Q1.2) &mdash; only whole calendar years.
- **Native-currency rows** (Q1.3) &mdash; only base-currency aggregation.
- **`PAUSED` / `DRAFT` / `ENDED` flows** (Q1.5) &mdash; excluded.
- **Grouping by counterparty / taxonomy** (Q2.3) &mdash; deferred to a follow-up spec; v1 only groups by direction.
- **Live FX recompute for missing snapshots** (Q2.5) &mdash; not supported; admin resaves the flow.
- **Detailed list of skipped flows with deep links** (Q3.5) &mdash; deferred.
- **End-to-end browser tests** (Q3.6) &mdash; not in repo convention.

---

## 11. Delivery Plan

Order of work within the single PR:

1. **Shared schema** &mdash; `packages/shared/src/schemas/value-stream-budget.schema.ts` + `index.ts` re-exports. Rebuild shared.
2. **Backend service** &mdash; `RecurringFlowsBudgetService` in `packages/core/src/recurring-flows/budget.service.ts` (closure-table query + occurrence loop).
3. **Controller route** &mdash; widen `ValueStreamRecurringFlowsController` base path to `value-streams/:valueStreamId` and add the `GET /budget` action.
4. **Module wiring** &mdash; register `RecurringFlowsBudgetService` and import `SystemSettingsModule` in `RecurringFlowsModule`.
5. **DTO** &mdash; `ValueStreamBudgetResponseDto` in `recurring-flow.dto.ts`.
6. **Web UI** &mdash; new components + page + layout in `@marketlum/ui`; export from `packages/ui/src/index.ts`; messages in en/pl.
7. **Web app re-exports** &mdash; `apps/web/src/app/admin/value-streams/[id]/layout.tsx` and `.../budget/page.tsx`.
8. **Template mirror** &mdash; same files under `packages/create-marketlum-app/template/`.
9. **BDD** &mdash; feature file + step definitions; rebuild shared so test process sees new exports.
10. **Verification** &mdash; `pnpm build` across packages and `npx tsc --noEmit` for web; bump `MEMORY.md` test count by +13.
