# Value Stream Budget — Brainstorming

> **Goal:** Define a `/admin/value-streams/[id]/budget` view that summarises monthly, quarterly, and annual budget figures for a value stream, derived from the `RecurringFlow`s attached to it.
>
> **Process:** One round of questions at a time. The user appends answers below each question. Existing content is never modified.

## Context

The relevant building blocks already exist:

- `ValueStream` &mdash; a tree of streams, each with a lead user.
- `RecurringFlow` &mdash; per-stream plan rows (`direction: inbound|outbound`, `amount`, `unit`, `frequency`, `interval`, `startDate`, optional `endDate`, `status: draft|active|paused|ended`). Optional `valueId` and `counterpartyAgent`.
- `RecurringFlowsRollupService.forValueStream(id)` &mdash; returns per-unit monthly + annualized totals grouped by direction, plus a `net` row per unit. Currently only includes `ACTIVE` flows and does not look at `startDate` / `endDate`.
- `RecurringFlowsProjectionService.forValueStream(id, horizon)` &mdash; returns per-month occurrence-aware totals over a 1&ndash;36 month horizon, *does* respect `startDate` / `endDate`.
- `ExchangeRate` + system `base_value_id` &mdash; flows have a `rateUsed` and `baseAmount` snapshot frozen at write time. Multi-currency aggregation is possible without lookups.
- `Taxonomy` and `counterpartyAgent` &mdash; both available as M:N / FK on `RecurringFlow` for breakdowns.

Today the value-stream detail page already shows a small `RecurringFlowsSummaryCard` with monthly revenue / expense / net per native unit. This new `/budget` view is a full page dedicated to budget analysis.

```
┌─────────────────────────────────────────────────────────┐
│              Value Stream: "Platform R&D"               │
│                                                         │
│  ┌─ Period: 2026 ▾ ────────────────────────────────┐    │
│                                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │  Monthly   │ │ Quarterly  │ │  Annual    │           │
│  │  +$12,400  │ │  +$37,200  │ │  +$148,800 │           │
│  │  Revenue   │ │  Revenue   │ │  Revenue   │           │
│  │  -$8,100   │ │  -$24,300  │ │  -$97,200  │           │
│  │  Expense   │ │  Expense   │ │  Expense   │           │
│  │  =$4,300   │ │ =$12,900   │ │ =$51,600   │           │
│  │  Net       │ │   Net      │ │   Net      │           │
│  └────────────┘ └────────────┘ └────────────┘           │
│                                                         │
│  [breakdown table or chart below…]                      │
└─────────────────────────────────────────────────────────┘
```

---

## Round 1 &mdash; Foundations

This round nails down whether the budget is *derived* or a *first-class entity*, what time window it covers, and which flows feed it.

### Q1.1 &mdash; Is the budget a derived view or a first-class entity?

- [x] **Derived view, no new DB tables** &mdash; the budget is just an aggregation of existing `RecurringFlow`s for a value stream. No schema changes; just new services, endpoints, and a page.
- [ ] **New `Budget` entity** with rows the admin can edit (plan vs. actual, manual line items) &mdash; powerful, but a large scope expansion; deviates from &ldquo;based on RecurringFlows&rdquo; framing.
- [ ] **Derived now, Budget entity later** &mdash; ship the view first, allow editable budgets as a future phase. Same as option 1 for this spec.

**Answer:**

### Q1.2 &mdash; What time horizon does the page cover?

The three figures (monthly/quarterly/annual) need a period. Different defaults imply different math.

- [x] **A single selectable calendar year** (default: current year) &mdash; monthly = average month in year, quarterly = average quarter in year, annual = full year. Straight-forward; matches typical budgeting.
- [ ] **Current period only** (this month, this quarter, this year) &mdash; concrete but inflexible; no historical comparison.
- [ ] **Rolling 12 months** ending today &mdash; useful for finance teams; less intuitive for &ldquo;budget&rdquo; framing.
- [ ] **User-selectable date range** (any start/end) &mdash; most flexible; complicates the &ldquo;monthly / quarterly / annual&rdquo; framing because periods within the range may not be whole.

**Answer:**

### Q1.3 &mdash; How are non-base currencies handled?

A value stream can have flows in multiple currencies (USD, EUR, hours of consulting, &hellip;).

- [x] **Convert everything to the system base value** &mdash; use the `RecurringFlow.baseAmount` snapshot when present; skip (or flag) rows without a snapshot. One total per period; consistent with the rest of the multi-currency surface.
- [ ] **Native currency only &mdash; one row per `unit`** &mdash; matches today&apos;s `RecurringFlowsRollupService` behaviour; cluttered when multiple currencies exist.
- [ ] **Both** &mdash; native rows plus a base total row &mdash; complete but visually heavy.

**Answer:**

### Q1.4 &mdash; Does the view aggregate descendants in the value-stream tree?

`ValueStream` is a closure-table tree. A parent stream like &ldquo;Platform R&amp;D&rdquo; may have children &ldquo;Frontend&rdquo; / &ldquo;Backend&rdquo; with their own flows.

- [x] **Subtree by default, with a toggle for &ldquo;direct only&rdquo;** &mdash; matches how budgets work in practice (the parent owns the rollup of its subtree); user can drill into one child if needed.
- [ ] **Direct only** &mdash; simplest; the user can navigate into each child stream individually.
- [ ] **Subtree always** &mdash; no toggle; loses the ability to inspect a single layer.

**Answer:**

### Q1.5 &mdash; Which `RecurringFlow.status` values contribute?

- [x] **`ACTIVE` only** (current behaviour) &mdash; matches the existing `RecurringFlowsRollupService`; the budget shows what is presently committed. `DRAFT`, `PAUSED`, `ENDED` are excluded.
- [ ] **`ACTIVE` + `PAUSED`** &mdash; shows the &ldquo;at full capacity&rdquo; budget including temporarily-paused commitments.
- [ ] **User toggle: status multi-select chips on the page** &mdash; flexible; small extra UI complexity.

**Answer:**

### Q1.6 &mdash; Does the budget respect `startDate` / `endDate` of each flow within the period?

A flow starting July 1 should not contribute to Q1; a flow ending Sept 30 should not contribute to Q4.

- [x] **Yes &mdash; reuse the per-month occurrence logic from `RecurringFlowsProjectionService`** &mdash; the budget for a year sums occurrences across the year&apos;s 12 months, which naturally excludes months outside the flow&apos;s lifetime. Most accurate.
- [ ] **No &mdash; use the rollup&apos;s simple `monthly × N` extrapolation** &mdash; faster, simpler, but slightly wrong for flows that don&apos;t cover the full period.
- [ ] **Yes for &ldquo;current year&rdquo;, no for &ldquo;monthly average&rdquo;** &mdash; mixed semantics; confusing.

**Answer:**

---

When you&apos;ve answered (or accepted the recommendations), reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 2 &mdash; Shape (breakdown axes, schema for endpoints, exact monthly/quarterly/annual definitions).

---

## Round 2 &mdash; Shape

Round 1 settled the philosophy (derived view, year-based, base currency, subtree-default, ACTIVE-only, occurrence-aware). This round defines the **exact numerics, breakdown axes, and API shape**.

### Q2.1 &mdash; What do &ldquo;monthly&rdquo;, &ldquo;quarterly&rdquo;, and &ldquo;annual&rdquo; mean numerically?

For a selected calendar year `Y`, the three headline figures could be derived in different ways. The user chose &ldquo;year&rdquo; in Q1.2, so the question is what to *average* or *aggregate* across.

- [x] **Averages over the year** &mdash; `annual = Σ occurrences in Y`; `quarterly = annual / 4`; `monthly = annual / 12`. Clean, internally consistent; identical to the existing rollup&apos;s `monthly × 12` for full-year flows.
- [ ] **Mixed: monthly = current month, quarterly = current quarter, annual = full year** &mdash; pragmatic for current-year &ldquo;today&rdquo; viewing; ill-defined when `Y` is past or future.
- [ ] **Annualised current snapshot** &mdash; use today&apos;s active flows × frequency, ignoring the year selector. Equivalent to existing rollup; the year selector becomes useless.

```
Example: selected year 2026, flow "$1,000/mo for all of 2026":
  annual    = 12,000.00
  quarterly =  3,000.00   (12,000 / 4)
  monthly   =  1,000.00   (12,000 / 12)

Flow with endDate 2026-06-30:
  annual    =  6,000.00   (only 6 months of occurrences)
  quarterly =  1,500.00
  monthly   =    500.00
```

**Answer:**

### Q2.2 &mdash; What does the breakdown table beneath the three headline cards show?

This is the secondary visualization &mdash; the &ldquo;detail&rdquo; below the &ldquo;summary cards.&rdquo;

- [ ] **Months across, direction down** &mdash; 12 columns Jan&hellip;Dec, rows Revenue / Expense / Net; quarterly subtotals as shaded interior columns. Standard P&amp;L layout; shows seasonality.
- [ ] **Quarters across, direction down** &mdash; 4 columns Q1&hellip;Q4 + total. Less detail but more compact on mobile.
- [x] **Both, toggleable** &mdash; user picks month-view or quarter-view. Extra UI state.
- [ ] **No table** &mdash; just the three cards; embed a sparkline inside each.

```
              Jan    Feb    Mar    Q1     Apr    May    Jun    Q2    …
Revenue     1,200  1,200  1,200  3,600  1,200  1,200  1,200  3,600  …
Expense      -800   -800   -800 -2,400   -800   -800   -800 -2,400  …
Net          +400   +400   +400 +1,200   +400   +400   +400 +1,200  …
```

**Answer:**

### Q2.3 &mdash; Is there an additional grouping axis (categories) inside the table?

Beyond direction (Revenue/Expense/Net), can rows be grouped by something else?

- [x] **No additional grouping in v1** &mdash; just Revenue / Expense / Net rows. Keeps the page tight; counterparty/taxonomy breakdowns can come in a follow-up spec.
- [ ] **Group by `counterpartyAgent`** &mdash; one expandable section per agent; great for &ldquo;who&apos;s our biggest customer/vendor&rdquo; analysis; more UI to build.
- [ ] **Group by main taxonomy of the flow** &mdash; requires choosing a primary taxonomy per flow (flows have M:N taxonomies today).
- [ ] **User-selectable grouping** (none / agent / taxonomy) &mdash; flexible, most work.

**Answer:**

### Q2.4 &mdash; What is the API shape?

- [x] **One new endpoint: `GET /value-streams/:id/budget?year=YYYY&directOnly=bool`** returning a single payload with headline figures *and* per-month breakdown. Single round-trip; client renders both.
- [ ] **Two endpoints: `/budget/summary` and `/budget/breakdown`** &mdash; more granular; two requests; only worth it if breakdown lazy-loads.
- [ ] **Extend existing `/recurring-flows/projection` with `year` and `directOnly`** &mdash; reuses projection plumbing; conflates projection (forward-looking horizon) with budget (concrete calendar year).

Suggested response shape (recommended option):

```jsonc
{
  "valueStreamId": "...",
  "year": 2026,
  "directOnly": false,
  "baseValue": { "id": "...", "name": "USD" },
  "summary": {
    "revenue": { "monthly": "1200.00", "quarterly": "3600.00", "annual": "14400.00" },
    "expense": { "monthly":  "800.00", "quarterly": "2400.00", "annual":  "9600.00" },
    "net":     { "monthly":  "400.00", "quarterly": "1200.00", "annual":  "4800.00" }
  },
  "byMonth": [
    { "month": "2026-01", "revenue": "1200.00", "expense": "800.00", "net": "400.00" },
    // …12 entries
  ],
  "skippedFlows": 0   // see Q2.5
}
```

**Answer:**

### Q2.5 &mdash; What happens with flows that have no `baseAmount` snapshot?

A flow may be missing `rateUsed`/`baseAmount` if no exchange rate existed at write time, no system base was configured, or the flow was created before the snapshot migration.

- [x] **Skip them and report a count in `skippedFlows`** &mdash; the page shows a small banner &ldquo;3 flows skipped &mdash; no base-currency snapshot&rdquo;; admins can resave each flow to refresh. Predictable, no live lookups, matches the &ldquo;snapshot-on-write&rdquo; model.
- [ ] **Skip silently** &mdash; user has no idea figures are incomplete.
- [ ] **Recompute at current rate** &mdash; defeats the snapshot model; introduces silent retroactive changes.
- [ ] **Refuse to render the budget if any flow is missing a snapshot** &mdash; too strict; one stale flow blocks the whole page.

**Answer:**

### Q2.6 &mdash; Where does the service live in the backend?

- [x] **New `RecurringFlowsBudgetService` inside `packages/core/src/recurring-flows/`** &mdash; sits alongside `RollupService` and `ProjectionService`; shares repositories and helpers. The controller lives in the same module (`ValueStreamRecurringFlowsController` gains the `GET .../budget` route, or a sibling controller is added).
- [ ] **New top-level `value-stream-budget` module** &mdash; cleaner separation; small but distinct domain.
- [ ] **Method on `RecurringFlowsProjectionService`** &mdash; overloads projection&apos;s purpose; harder to test.

**Answer:**

### Q2.7 &mdash; What precision does the response use?

`RecurringFlow.amount` is `decimal(14, 4)` natively; `RecurringFlow.baseAmount` is `decimal(12, 2)`; projections format at 4dp.

- [x] **All budget figures rounded to `decimal(2)`** (`Number(x).toFixed(2)`) &mdash; matches the base-currency precision and the existing invoice/snapshot display; cleaner for human-readable currency.
- [ ] **`decimal(4)` everywhere** (current projection precision) &mdash; preserves more precision; trailing zeros look odd for currency.
- [ ] **Mixed: headline cards at `decimal(0)` (no cents), table at `decimal(2)`** &mdash; reads cleaner; more code paths.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll append Round 3 &mdash; UI / UX &amp; Delivery (page layout, sidebar nav, BDD coverage, template sync, PR shape).

---

## Round 3 &mdash; UI / UX &amp; Delivery

This is the final round. It nails down the page layout, navigation, empty/error states, BDD scope, and delivery.

### Q3.1 &mdash; How is the budget page discovered from the value-stream detail page?

The page lives at `/admin/value-streams/[id]/budget`. Today the detail page already shows a `RecurringFlowsSummaryCard`. How do users navigate to the new full view?

- [ ] **Add a &ldquo;View budget&rdquo; button in the header of the existing `RecurringFlowsSummaryCard`** &mdash; contextual; users discover it next to the related summary; one extra control.
- [x] **Tabs at the top of the value-stream detail page** (&ldquo;Overview&rdquo; / &ldquo;Budget&rdquo; / &hellip;) &mdash; consistent if other sub-views exist in the future; today there&apos;s only one.
- [ ] **Sidebar sub-nav entry** that appears only when a value stream is selected &mdash; rare pattern in this admin; would diverge from the rest of the layout.
- [ ] **Both 1 and 2** &mdash; button now, tabs later.

**Answer:**

### Q3.2 &mdash; What does the year selector look like?

- [x] **Inline pill with `←` `2026 ▾` `→` chevrons** &mdash; quick keyboard/click navigation between adjacent years; dropdown shows a list of years (e.g. previous 3, current, next 3 = 7 entries) plus &ldquo;Custom&hellip;&rdquo; for arbitrary input.
- [ ] **Plain `<select>` with years -10 &hellip; +10** &mdash; minimal UI; 21 entries; no fast prev/next.
- [ ] **Free-text input** validated as a 4-digit integer &mdash; smallest footprint; least guided.

```
┌──────────────────────────────────────────────────────┐
│  Budget                              ◀ 2026 ▾ ▶     │
│                                  Direct only □       │
└──────────────────────────────────────────────────────┘
```

**Answer:**

### Q3.3 &mdash; Where does the &ldquo;Direct only&rdquo; toggle live?

(This toggle came from Q1.4 &mdash; subtree-default, with the option to include only flows attached directly to the selected stream.)

- [x] **A small switch next to the year selector** (visible only when the stream has descendants) &mdash; discoverable, contextual; hidden when irrelevant.
- [ ] **A button-group: `Subtree | Direct only`** &mdash; more explicit; takes more horizontal space.
- [ ] **Always visible, even on leaf streams** &mdash; consistent but useless on leaves.

**Answer:**

### Q3.4 &mdash; Breakdown view-mode control (Q2.2 chose &ldquo;both toggleable&rdquo;)

How is the &ldquo;Months / Quarters&rdquo; view toggle exposed?

- [x] **Segmented control (Tabs) above the table: `Months` | `Quarters`** &mdash; standard shadcn pattern; obvious; one row of UI.
- [ ] **Plain `<select>`** &mdash; ugly for two options.
- [ ] **Icon-only toggle button** &mdash; compact but cryptic.

```
Breakdown            [ Months ][ Quarters ]
┌─────┬─────┬─────┬─────┬─────┬─────┬…
│ Jan │ Feb │ Mar │ Apr │ May │ Jun │…
├─────┼─────┼─────┼─────┼─────┼─────┼…
│ ……  │ ……  │ ……  │ ……  │ ……  │ ……  │
```

**Answer:**

### Q3.5 &mdash; Empty-state behaviour

Pick all that apply (multi-select).

- [x] **&ldquo;No active recurring flows for this value stream&rdquo;** banner with a button linking to `/admin/recurring-flows?valueStreamId=...&action=new` &mdash; no flows ⇒ no figures to render; CTA invites adding the first flow.
- [x] **&ldquo;No system base value configured&rdquo;** banner with a link to `/admin/exchange-rates` &mdash; without a base, every `baseAmount` is `NULL`; the budget cannot be computed.
- [x] **&ldquo;`N` flows skipped &mdash; no base-currency snapshot&rdquo;** banner with a brief explanation that the admin can resave each flow to refresh.
- [ ] **Detailed list of skipped flows with direct links** &mdash; more helpful but heavier UI; deferred to a future spec.

**Answer:**

### Q3.6 &mdash; BDD coverage plan

Pick all that apply (multi-select). Strict-BDD per project rule.

- [x] **`packages/bdd/features/value-stream-budget/`** new feature dir with: budget for empty stream returns zeros; respects ACTIVE-only status; respects `startDate`/`endDate`; direct-only vs subtree; year selector picks correct months; per-month and quarterly totals consistent with monthly; missing snapshots increment `skippedFlows`; missing base value returns null totals with a flag &mdash; ~10 scenarios.
- [x] **Authorization scenarios**: unauthenticated 401, non-admin 403 &mdash; 2 scenarios (mirrors locales/recurring-flows patterns).
- [x] **Multi-currency scenario**: flows in EUR + USD, base USD, both convert correctly &mdash; 1 scenario.
- [ ] **End-to-end browser tests** &mdash; excluded per existing memory.

**Answer:**

### Q3.7 &mdash; Template sync &amp; delivery

- [x] **One PR** containing: backend service + controller route, shared schema, web page at `/admin/value-streams/[id]/budget`, &ldquo;View budget&rdquo; button on the detail page, BDD scenarios, and template mirror under `packages/create-marketlum-app/template/web/src/app/admin/value-streams/[id]/budget/`.
- [ ] **Two PRs**: (1) backend + schema + BDD, (2) web page + button + template mirror &mdash; finer-grained but the page is unusable without the backend, and v1 is small enough.
- [ ] **Phase 1: budget summary only; Phase 2: per-month breakdown** &mdash; over-engineering for a single-PR feature.

**Answer:**

---

When you&apos;ve answered, reply **&ldquo;Done&rdquo;** and I&apos;ll consolidate the decisions into `specs/003-value-stream-budget-specification.md` and commit both files.
