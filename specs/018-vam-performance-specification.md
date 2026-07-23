# 018 — VAM Agreement Performance (Plan vs Actual) — Specification

> Decision trail: [`018-vam-performance-brainstorming.md`](./018-vam-performance-brainstorming.md) (pre-brainstorm decisions 1–6, questions Q1–Q19; all recommendations accepted unmodified).

## 1. Overview

A read-only, computed plan-vs-actual view for a VAM agreement: the revenue goals authored on the VAM canvas (spec 014) are compared, per milestone, against the agent's actual invoice-derived revenue (spec 016 mechanics). **No new tables** — everything is derived at request time.

```
  VAM canvas (plan, spec 014)              Invoices (actual, specs 010/016)
  ┌────────────────────────────┐          ┌──────────────────────────────┐
  │ M3: "offerings prepared"   │          │ fromAgentId = agreement agent│
  │ M6: DIRECT $500K  ────┐    │          │ issuedAt in window           │
  │ M9: DIRECT $500K  ────┤    │          │ Σ invoice_items.fromAgent-   │
  │ M12: EQUITY 10%       │    │          │   Amount (NULL-propagation)  │
  └───────────────────────┼────┘          └──────────────┬───────────────┘
                          │ cumulative targets           │ cumulative actuals
                          ▼                              ▼
        GET /plugins/rdhy/vam-agreements/:id/performance          (§4)
        milestones: due date, target, actual, attainment %, status
                          │
                          ▼
        Performance section on the VAM agreement detail page      (§7)
        4 stat cards · plan-vs-actual d3 chart · milestone table
```

## 2. Computation model

All rules below assume the agreement is **not DRAFT** (guard in §4). Definitions:

| Term | Definition | Decision |
|---|---|---|
| **Measurable target item** | Canvas item with `track = DIRECT_VALUE` and non-null `amount` | Q1 |
| **Target increment** (per milestone) | Sum of its measurable items' amounts; `null` if it has none | Q3 |
| **Cumulative target** (per milestone) | Running sum of increments across milestones ordered by `offsetMonths` (incremental semantics: "first $500K" + "second $500K" ⇒ month-12 cumulative 1 000 000) | pre-decision 3 |
| **Due date** | `startedAt + offsetMonths` (calendar months, exact timestamp) | Q9 |
| **Window** | `startedAt` → `windowEnd`, where `windowEnd = now` for ACTIVE and `endedAt` for COMPLETED / TERMINATED | Q6 |
| **Actual** | Gross revenue: sum of `invoice_items.fromAgentAmount` over invoices with `fromAgentId = agreement.agentId` and `issuedAt` in range, per-invoice total NULL when any item's snapshot is NULL (that invoice is excluded from sums and counted in `notConvertedCount`); self-invoices included | Q2, Q10, Q11 |
| **Attainment** | `actualCumulative / targetCumulative`, one definition for all rows; UI caps *display* at 999%, API returns the uncapped value | Q7 |

### 2.1 Comparability

Evaluated in this precedence order (first match wins), returned as a top-level discriminator (Q8):

1. `NO_AGREEMENT_CURRENCY` — `agreement.currencyId` is null
2. `NO_AGENT_CURRENCY` — agent has no `functionalCurrencyId`
3. `CURRENCY_MISMATCH` — `agreement.currencyId !== agent.functionalCurrencyId` (pre-decision 4: no rate conversion, ever, in v1)
4. `NO_MEASURABLE_TARGETS` — canvas has no measurable target item
5. `COMPARABLE`

Milestone judgments (`status`, `attainmentPct`, per-milestone `actualCumulative`) are non-null **only when `COMPARABLE`**. The monthly actuals series is computed whenever the agent has a functional currency (independent of the agreement currency) — it is `null` only under `NO_AGENT_CURRENCY`.

### 2.2 Milestone status (Q5, Q13)

Milestones sorted by `offsetMonths`. Let `windowEnd` be as defined above.

- **Past-due** (`dueDate <= windowEnd`): compare `actual(issuedAt < dueDate)` vs `targetCumulative` → `ACHIEVED` (actual ≥ target) | `MISSED`.
- **Current** (first milestone with `dueDate > windowEnd`): compare `actual(issuedAt <= windowEnd)` vs the pro-rata target → `ON_TRACK` | `BEHIND`. Pro-rata is **day-granular** (Q13): `proRata = prevCumTarget + increment × (windowEnd − prevDueDate) / (dueDate − prevDueDate)` where `prevDueDate = startedAt` for the first milestone and `prevCumTarget` is the previous milestone's cumulative target (0 for the first). The current milestone's cumulative *increment basis* is its own `targetCumulative − prevCumTarget`.
- **Later** milestones: `UPCOMING`.
- **Exception:** any milestone whose `targetCumulative` is 0 (only qualitative milestones so far) gets `status: null`, `attainmentPct: null` — there is nothing to judge (brainstorm §Round 1 discussion).

A COMPLETED/TERMINATED agreement typically has `windowEnd` past several due dates: those are judged past-due against actuals clamped at `endedAt`; milestones due after `endedAt` remain `UPCOMING` (they were never reached).

### 2.3 Summary (Q17)

- `targetToDate` — the pro-rata target at `windowEnd` (final cumulative target when `windowEnd` is past the last due date).
- `actualToDate` — cumulative actual at `windowEnd`.
- `attainmentPct` — `actualToDate / targetToDate`.
- `overallStatus` — the current milestone's status; when no current milestone exists (window past the last due date), the final milestone's `ACHIEVED | MISSED`. `null` when not `COMPARABLE` or nothing judgeable.

Summary fields are `null` unless `comparability === 'COMPARABLE'`.

## 3. Shared additions (plugin package)

New file `packages/plugin-rdhy/src/shared/vam-performance.ts` (exported alongside `vam-schemas.ts`):

```ts
export const VAM_COMPARABILITY = [
  'COMPARABLE', 'CURRENCY_MISMATCH', 'NO_AGREEMENT_CURRENCY',
  'NO_AGENT_CURRENCY', 'NO_MEASURABLE_TARGETS',
] as const;
export const VAM_MILESTONE_STATUSES = [
  'ACHIEVED', 'MISSED', 'ON_TRACK', 'BEHIND', 'UPCOMING',
] as const;
export type RdhyVamComparability = (typeof VAM_COMPARABILITY)[number];
export type RdhyVamMilestoneStatus = (typeof VAM_MILESTONE_STATUSES)[number];

export interface RdhyVamPerformanceResponse {
  agreementId: string;
  agreementStatus: RdhyVamStatus;               // ACTIVE | COMPLETED | TERMINATED
  comparability: RdhyVamComparability;
  currency: { id: string; code: string; name: string } | null;          // agreement currency
  agentFunctionalCurrency: { id: string; code: string; name: string } | null;
  windowStart: string;                          // startedAt, ISO
  windowEnd: string;                            // min(now, endedAt), ISO
  summary: {
    targetToDate: string | null;                // decimal string, agreement currency
    actualToDate: string | null;
    attainmentPct: number | null;               // e.g. 86.0 — uncapped
    overallStatus: RdhyVamMilestoneStatus | null;
  };
  milestones: Array<{
    id: string;
    offsetMonths: number;
    label: string | null;
    dueDate: string;                            // ISO
    targetIncrement: string | null;             // null: no measurable items on this milestone
    targetCumulative: string;                   // always present — plan side is always known
    actualCumulative: string | null;            // at dueDate (past-due) / windowEnd (current); null unless COMPARABLE
    attainmentPct: number | null;
    status: RdhyVamMilestoneStatus | null;      // null: not COMPARABLE, or targetCumulative == 0
    items: Array<{
      id: string; track: RdhyVamTrack; description: string;
      amount: string | null; measured: boolean; // measured = DIRECT_VALUE with amount (Q4: others listed, UNMEASURED in UI)
    }>;
  }>;
  monthlyActuals: Array<{                       // Q9: calendar-month buckets, chart series
    month: string;                              // 'YYYY-MM'
    revenue: string;                            // agent functional currency
    cumulative: string;
  }> | null;                                    // null only when NO_AGENT_CURRENCY
  invoiceCount: number;                         // invoices matching agent+window, converted or not
  notConvertedCount: number;                    // Q10: excluded-invoice count, single top-level number
}
```

Pure helpers in the same file (unit of reuse for service + UI, all side-effect free): `cumulativeTargets(milestones)`, `milestoneStatus({dueDate, targetCumulative, prevCumTarget, prevDueDate, actualAtCutoff, windowEnd})`, `proRataTarget(...)`. Amount maths follow the project decimal convention: `Number(raw)` for arithmetic, `.toFixed(2)` for serialization.

No request Zod schema — the endpoint takes no query parameters in v1.

## 4. API surface

One new route on the existing controller (`packages/plugin-rdhy/src/vam/vam-agreements.controller.ts`, `@Controller('plugins/rdhy/vam-agreements')`, `@UseGuards(AdminGuard)` — the project-default permission model):

| Method & path | Behavior |
|---|---|
| `GET :id/performance` | Returns `RdhyVamPerformanceResponse` (200). **404** unknown id. **409** when `status === 'DRAFT'` (Q12 — same lifecycle-guard idiom as canvas PUT on ACTIVE). |

## 5. Backend module layout

- **New** `packages/plugin-rdhy/src/vam/vam-performance.service.ts` — `VamPerformanceService.forAgreement(id)`:
  1. Load agreement with `agent`, `currency` relations; 404 / 409 guards.
  2. Load milestones + items (ordered by `position`), compute targets via shared helpers.
  3. Resolve the agent's functional currency (`Value` repo) → comparability (§2.1).
  4. **One SQL query** for actuals — per-invoice granularity so monthly buckets, exact due-date cutoffs, `invoiceCount`, and `notConvertedCount` all come from a single pass (LATERAL total mirrors `AgentFinancialsService`, spec 016):

     ```sql
     SELECT i.id, i."issuedAt", t.total
     FROM invoices i,
     LATERAL (
       SELECT CASE
         WHEN COUNT(*) = 0 THEN NULL
         WHEN COUNT(ii."fromAgentAmount") < COUNT(*) THEN NULL
         ELSE SUM(ii."fromAgentAmount")
       END AS total
       FROM invoice_items ii WHERE ii."invoiceId" = i.id
     ) t
     WHERE i."fromAgentId" = $1 AND i."issuedAt" >= $2 AND i."issuedAt" <= $3
     ORDER BY i."issuedAt"
     ```

     Aggregation to monthly buckets and per-cutoff cumulative sums happens in TypeScript (invoice counts per agent are small; this avoids three near-identical SQL statements).
  5. Assemble the response per §2.
- **Changed** `vam-agreements.controller.ts` — add the `@Get(':id/performance')` route delegating to the new service.
- **Changed** `packages/plugin-rdhy/src/rdhy.module.ts` — add `Invoice` (exported by `@marketlum/core`) to `TypeOrmModule.forFeature`, register + export `VamPerformanceService`.
- **No migration** — no schema change.

## 6. Database

None. Read-only queries against existing `plugin_rdhy_vam_*`, `invoices`, `invoice_items`, `agents`, `values` tables.

## 7. UI / UX

All in `packages/plugin-rdhy/src/web/` (plugin RSC-split convention; the detail page is a client component fetching via `api` from `@marketlum/ui`).

- **New `vam-performance-section.tsx`** — client component `<VamPerformanceSection agreementId status />`; fetches `GET .../performance` on mount. Rendered by the detail page **between the canvas-grid section and the lifecycle section, only when `status !== 'DRAFT'`** (Q14 — stacked `<section>` layout, no tabs). Layout top-to-bottom:
  1. **Summary row** (Q17) — four cards in the style of the page's existing stat presentation:

     ```
     ┌─────────────┬─────────────┬─────────────┬─────────────┐
     │ Target to   │ Actual to   │ Attainment  │ Status      │
     │ date        │ date        │             │             │
     │ 500,000 USD │ 430,000 USD │ 86%         │ BEHIND      │
     └─────────────┴─────────────┴─────────────┴─────────────┘
     ```

     Attainment display capped at `999%+`. A small warning badge next to the cards when `notConvertedCount > 0`: "N invoices excluded — no currency snapshot".
  2. **Plan-vs-actual chart** — see below.
  3. **Milestone table** — one row per milestone: `M{offsetMonths}` + label · due date · cumulative target · cumulative actual · progress bar (attainment, capped) · status badge. Expandable/inline item list showing qualitative items greyed as *Unmeasured* (Q4).

  **Degradation** (Q16): when `comparability !== 'COMPARABLE'`, render a warning banner naming the reason (i18n per enum value), the milestone table **without** actual/attainment/status columns, and the chart only when `monthlyActuals` is non-null (i.e. everything except `NO_AGENT_CURRENCY`; on `CURRENCY_MISMATCH` the chart is labeled with the agent currency to make the non-comparability visible).
- **New `vam-performance-chart.tsx`** (Q15) — d3 line chart following the `RevenueExpensesChart` pattern (`packages/ui/src/components/dashboard/revenue-expenses-chart.tsx`: `'use client'`, ResizeObserver width tracking, tooltip div, no chart library). Series: plan as a **step line** through `(dueDate, targetCumulative)` points from `(startedAt, 0)`; actual as a line through monthly `cumulative` points; vertical dashed markers at due dates; a subtle "today"/window-end marker.
- **New `vam-milestone-status-badge.tsx`** — five-status badge (green ACHIEVED / red MISSED / blue ON_TRACK / amber BEHIND / grey UPCOMING), same visual idiom as `VamStatusBadge`.
- **Changed `vam-agreement-detail-page.tsx`** — mount the section (one conditional block).
- **Changed `messages.ts`** — new key group `plugin.rdhy.vam.performance.*` (section title, card labels, status labels, comparability banners, excluded-invoices badge, chart legend).

### Web app / template sync

No files under `apps/api/` or `apps/web/` change — the detail route's thin re-export already exists and plugin routes auto-register. Per `CLAUDE.md`, verify at delivery time that nothing in `packages/create-marketlum-app/template/` needs touching (expected: nothing).

## 8. Seed data (Q18)

Extend `packages/plugin-rdhy/src/seed/rdhy.seeder.ts`: after `seedVamAgreements`, a new `seedVamPerformanceInvoices(dataSource, …)` creates **~4 invoices** issued by (`fromAgentId`) the agent of the ACTIVE "Web 3 Consulting HUB" agreement to another sample agent, `issuedAt` spread across the first months of the agreement window (e.g. months 1–5, totalling ~430K so the month-6/9 goals show partial attainment), items carrying `fromAgentAmount` snapshots in USD. Conditional on the sample `usd` Value and a counterparty agent existing, and idempotent (skip when the invoices are already present), matching the seeder's existing conditional style.

## 9. BDD test coverage (Q19)

**New** `packages/plugin-rdhy/features/vam-performance.feature` (~9 scenarios), steps in **new** `apps/api/test/plugins/rdhy/vam-performance.steps.ts` (existing ref-counted shared-app pattern):

1. **Comparable happy path** — ACTIVE agreement, matching currencies, DIRECT_VALUE goals, invoices in window → 200 with `comparability: COMPARABLE`, correct cumulative targets/actuals, `monthlyActuals`, `invoiceCount`; one unsnapshotted invoice present → excluded from sums, `notConvertedCount: 1`.
2. **ACHIEVED** — past-due milestone with actual ≥ cumulative target.
3. **MISSED** — past-due milestone with actual < cumulative target; also asserts a revenue-after-due-date invoice does not flip it (exact cutoff).
4. **ON_TRACK** — current milestone, actual ≥ day-granular pro-rata target.
5. **BEHIND** — current milestone, actual < pro-rata target.
6. **UPCOMING** — future milestones unjudged; qualitative-only leading milestone has `status: null`.
7. **CURRENCY_MISMATCH** — judgments null, `monthlyActuals` still present.
8. **NO_MEASURABLE_TARGETS** — canvas without DIRECT_VALUE amounts.
9. **DRAFT → 409**; unknown id → 404 (folded assertion).

Window clamping (Q6) is asserted inside scenario 3 via a TERMINATED variant step; multi-item summing (Q3) and self-invoice inclusion (Q11) are folded into scenario 1's fixture. Update the `pnpm test:e2e` count note in project memory at delivery.

## 10. Out of scope (v1)

Per pre-brainstorm decision 6 and Round 1–3 boundaries:

- Manual check-off / achievement tracking of qualitative items (Q4 keeps them visible but unmeasured).
- Cost entries vs actual expenses comparison (same mechanics, natural follow-up).
- Reward computation from `VARIABLE_PAY` / `PROFIT_SHARING` / `EQUITY` tracks — the actual "VAM adjustment".
- Currency conversion between agreement and agent currencies (Q8/pre-decision 4: `CURRENCY_MISMATCH` state instead).
- Persisting computed results, caching, or performance-based notifications/termination automation.
- Query parameters (as-of dates, custom windows) on the endpoint.

## 11. Delivery plan (single PR)

1. Shared: `vam-performance.ts` types + pure helpers; plugin package build.
2. BDD first (strict-BDD rule): `vam-performance.feature` + step definitions — red.
3. Backend: `VamPerformanceService`, controller route, module wiring — green.
4. Seed: `seedVamPerformanceInvoices`.
5. Web: chart, status badge, performance section, detail-page mount, messages.
6. Verify: plugin + shared builds, `pnpm test:e2e` (plugin suite), `next build`; template-sync check (§7).
