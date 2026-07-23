# 018 — VAM Agreement Performance (Plan vs Actual)

> **Goal:** See how an agent is performing against their VAM agreement: compare the revenue goals on the VAM canvas (e.g. "First $500K of revenues" at month 6) with the agent's actual invoice-derived revenue, per milestone, as a read-only computed view.

> **Process:** Structured Q&A brainstorming. Each round appends 4–7 questions with mutually-exclusive options; the recommended option is preselected `[x]`. Move the `[x]` and/or write below **Answer:** to override. Existing content is never edited — append-only.

## Context

What already exists and is being composed here:

- **Plan side (spec 014):** `RdhyVamAgreement` (`packages/plugin-rdhy/src/vam/`) belongs to an `Agent`, has `horizonMonths`, a single agreement-level `currencyId`, `startedAt` (set on activation), and lifecycle `DRAFT → ACTIVE → COMPLETED | TERMINATED`. The canvas is `RdhyVamMilestone` rows (`offsetMonths` from start) × `RdhyVamItem` cells (`track`, `description`, nullable `amount`). The `DIRECT_VALUE` track carries revenue goals; the seed data has "First $500K of revenues delivered" (amount 500000, month 9). Spec 014 explicitly deferred plan-vs-actual.
- **Actuals side (spec 016):** `AgentFinancialsService` (`packages/core/src/invoices/agent-financials.service.ts`) computes agent P&L from invoices: revenue = invoices the agent issued (`fromAgentId`), summed from per-agent snapshot amounts (`invoice_items.fromAgentAmount`, spec 010) in the agent's functional currency, with the NULL-when-any-item-unsnapshotted rule. Year-scoped, monthly buckets.
- **Plugin conventions:** controllers at `plugins/rdhy/...` behind `AdminGuard`; Zod schemas in `packages/plugin-rdhy/src/shared/`; BDD features in `packages/plugin-rdhy/features/`, step defs in `apps/api/test/plugins/rdhy/`; web pages in `packages/plugin-rdhy/src/web/` (RSC-split, thin re-exports in `apps/web`).

**Decisions already made in the pre-brainstorm discussion (fixed, not re-asked):**

1. Read-only computed comparison, **no new tables** in v1.
2. New endpoint `GET /plugins/rdhy/vam-agreements/:id/performance`, only for ACTIVE / COMPLETED / TERMINATED (DRAFT has no `startedAt`).
3. Milestone amounts are **incremental** targets; cumulative target per milestone = running sum ("First $500K" + "Second $500K" ⇒ month-12 cumulative 1M).
4. Currency rule v1: compare only when `agreement.currencyId === agent.functionalCurrencyId`; otherwise return actuals marked **NOT_COMPARABLE** (graceful degradation, no rate guessing).
5. UI: a Performance section on the existing VAM agreement detail page (hidden for DRAFT).
6. Out of scope: manual check-off of qualitative items, cost-vs-expense comparison, reward computation (VARIABLE_PAY / PROFIT_SHARING / EQUITY), persistence of computed results.

```
  VAM canvas (plan)                       Invoices (actual)
  ┌────────────────────────────┐          ┌──────────────────────────────┐
  │ M3: "offerings prepared"   │          │ issuedAt in window,          │
  │ M6: DIRECT $500K  ────┐    │          │ fromAgentId = agreement agent│
  │ M9: DIRECT $500K  ────┤    │          │ Σ invoice_items.fromAgent-   │
  │ M12: EQUITY 10%        │    │          │   Amount (NULL-propagation)  │
  └────────────────────────┼───┘          └──────────────┬───────────────┘
                           │  cumulative target          │ cumulative actual
                           ▼                             ▼
              GET /plugins/rdhy/vam-agreements/:id/performance
              per milestone: due date, target, actual, attainment %, status
```

---

## Round 1 — Semantics of targets and actuals

This round pins down exactly which numbers enter the comparison and how milestone status is judged.

**Q1. Which canvas items constitute measurable revenue targets?**

- [x] **`DIRECT_VALUE` items with non-null `amount` only** — "direct value" is the revenue track by definition; other tracks are rewards or soft value.
- [ ] **`DIRECT_VALUE` + `INDIRECT_VALUE` amounts** — captures more of the plan, but indirect value (brand, ecosystem effects) is not invoice-measurable, so actuals would never match.
- [ ] **Any item with a non-null `amount` regardless of track** — simplest rule, but compares reward amounts (e.g. $50K owner bonus) against revenue, which is semantically wrong.

**Answer:**

**Q2. What is the "actual" measure compared against revenue targets?**

- [x] **Gross revenue** — sum of issued-invoice snapshots (`fromAgentAmount`), mirroring the spec-016 revenue side; canvas goals say "revenues", so gross is the faithful reading.
- [ ] **Net (revenue − expense)** — closer to profit performance, but the canvas targets are explicitly revenue goals, and net mixes in cost structure that spec 014 models separately (`costEntries`).
- [ ] **Configurable per agreement** — flexibility nobody asked for yet; adds a column and a decision burden to every agreement.

**Answer:**

**Q3. A milestone has several amount-bearing `DIRECT_VALUE` items. How do they combine?**

- [x] **Sum them into one milestone target** — the milestone is the unit of judgment (due date), items are its line description; per-item attainment can't be attributed from invoices anyway.
- [ ] **Report each item separately with its own attainment** — implies splitting actual revenue across items, which has no basis in the data.
- [ ] **Reject/ignore all but the first** — arbitrary and surprising.

**Answer:**

**Q4. How do qualitative items (no `amount`, e.g. "All offerings prepared") appear in the performance response?**

- [x] **Listed per milestone as `UNMEASURED`** — the UI can show the full plan with measured rows judged and qualitative rows visibly not-auto-trackable; keeps the canvas and performance views congruent.
- [ ] **Omitted entirely** — smaller payload, but the performance view would show a partial canvas and users would wonder where their items went.
- [ ] **Counted as achieved when their milestone's revenue target is met** — invents semantics; qualitative items may have nothing to do with revenue.

**Answer:**

**Q5. Milestone status model. Due date = `startedAt + offsetMonths`. What statuses do past, current, and future milestones get?**

```
 past due:    actual(≤ due) vs cumulative target  →  ACHIEVED | MISSED
 current:     actual(≤ now) vs pro-rata target    →  ON_TRACK | BEHIND
 future:      not judged                          →  UPCOMING
```

- [x] **Five statuses as above, pro-rata linear for the current milestone** — pro-rata expected = previous cumulative target + elapsed fraction of the current increment; simple, explainable, no tunables.
- [ ] **Three statuses only (ACHIEVED / MISSED / UPCOMING), judge only past-due milestones** — avoids pro-rata assumptions, but the whole point is seeing trouble *before* the due date.
- [ ] **Add a tolerance band (e.g. BEHIND only when >15% under pro-rata)** — mirrors the seeded termination rule, but hard-codes a threshold that belongs to a specific agreement's termination text, not the engine.

**Answer:**

**Q6. For COMPLETED or TERMINATED agreements, where does the actuals window end?**

- [x] **Clamp at `endedAt`** — the agreement stopped governing at that point; revenue after termination shouldn't retroactively "achieve" missed milestones.
- [ ] **Keep counting to now** — shows eventual outcomes, but makes a terminated agreement's numbers drift forever and misrepresents the decision context.
- [ ] **Clamp for TERMINATED, keep counting for COMPLETED** — split behavior, more rules to remember for little benefit (COMPLETED implies horizon elapsed anyway).

**Answer:**

**Q7. A past-due milestone was ACHIEVED, but later ones subtract from... nothing — targets are cumulative. What does `attainmentPct` mean exactly?**

- [x] **`actualCumulative / targetCumulative` per milestone, capped display at 999%** — one consistent definition across past/current/future rows; the cumulative framing means early overperformance carries forward, which matches how "first $500K / second $500K" reads.
- [ ] **Per-increment attainment (`(actual − prevActual) / increment`)** — punishes back-loaded revenue timing and makes a single big invoice flip adjacent milestones in opposite directions.
- [ ] **Both cumulative and incremental in the payload** — more data, but two percentages per row invites misreading; UI would show one anyway.

**Answer:**

---

## Round 2 — Response shape and edge cases

Round 1 accepted as recommended (Q1–Q7). This round fixes the payload contract and the degenerate cases the engine must handle deterministically.

**Q8. Several conditions can make the plan-vs-actual comparison impossible (currency mismatch, agreement has no `currencyId`, agent has no functional currency, canvas has no amount-bearing `DIRECT_VALUE` items). How does the payload express this?**

- [x] **Always 200 with a top-level `comparability` discriminator** — `COMPARABLE | CURRENCY_MISMATCH | NO_AGREEMENT_CURRENCY | NO_AGENT_CURRENCY | NO_MEASURABLE_TARGETS`; actuals series is still returned when computable, milestone judgments are null unless COMPARABLE. One enum, exhaustively testable, UI switches on it.
- [ ] **Boolean `comparable` + free-text `reason`** — simpler type but the UI ends up string-matching reasons; untestable contract.
- [ ] **4xx error when not comparable** — treats a legitimate data state as a failure; the detail page would have to probe-and-catch.

**Answer:**

**Q9. How is the monthly actuals series bucketed for the chart?**

- [x] **Calendar months (`YYYY-MM` keys), congruent with spec 016** — reuses the proven bucketing SQL; milestone *judgments* still use exact due-date cutoffs (`issuedAt < startedAt + offsetMonths`), so mid-month starts stay precise where it matters.
- [ ] **Offset months from `startedAt` (month 1…N)** — aligns visually with `offsetMonths`, but every bucket boundary becomes a mid-month timestamp, diverging from every other financial view in the app.
- [ ] **Both keyed series** — duplicate data for one chart.

**Answer:**

**Q10. Invoices whose per-agent snapshot is NULL are excluded from sums (spec 010/016 rule). How does the performance payload surface them?**

- [x] **Single top-level `notConvertedCount`** — same contract as spec-016 agent financials; the UI shows one warning badge ("N invoices excluded — no currency snapshot").
- [ ] **Per-month counts in the series** — finer grain, but the user action (fix snapshots) is the same regardless of month.
- [ ] **Not surfaced** — silently understated actuals would erode trust in the numbers.

**Answer:**

**Q11. Self-invoices (agent invoices itself) count as revenue in spec-016 P&L (net zero there because both sides are counted). In performance attainment there is no expense side — include them in actuals?**

- [x] **Include** — consistent with the spec-016 revenue definition; performance actuals equal the agent-financials revenue line for the same window, so the two views never contradict each other. The gaming loophole is a governance concern, not an engine concern.
- [ ] **Exclude self-invoices** — closes the loophole, but performance revenue would mysteriously differ from the agent's P&L revenue, and "self" detection adds a special case to an otherwise reused query.

**Answer:**

**Q12. What does `GET .../performance` return for a DRAFT agreement?**

- [x] **409 Conflict** — consistent with the plugin's existing lifecycle guards (canvas PUT on ACTIVE → 409); DRAFT has no `startedAt`, so performance is undefined, not missing.
- [ ] **404 Not Found** — hides a real resource; the client can't distinguish "wrong id" from "not started".
- [ ] **200 with everything null** — pushes lifecycle logic into every consumer.

**Answer:**

**Q13. Pro-rata expected value for the current milestone — what granularity for the elapsed fraction?**

- [x] **Day-granular** — `elapsed = (now − prevDueDate) / (dueDate − prevDueDate)` in days; smooth, no step artifacts at month boundaries, trivial to compute.
- [ ] **Month-granular** — matches `offsetMonths` units, but a 3-month increment would jump in 33% steps and read as noise around month boundaries.
- [ ] **No pro-rata; current milestone shows raw attainment only** — contradicts the Q5 decision to judge ON_TRACK/BEHIND.

**Answer:**

---

## Round 3 — UI, seed data, and test scope

Round 2 accepted as recommended (Q8–Q13). This round shapes the Performance section on the VAM agreement detail page (`packages/plugin-rdhy/src/web/vam-agreement-detail-page.tsx`, which renders stacked `<section>` blocks) and the delivery details.

**Q14. Where does Performance live on the detail page?**

- [x] **A new `<section>` between the canvas grid and the lifecycle section, rendered only for non-DRAFT** — matches the page's existing stacked-sections layout; performance is the first thing you want to see on an ACTIVE agreement.
- [ ] **A tab alongside the canvas** — the page has no tab pattern today; introducing one for a single section is churn.
- [ ] **A separate `/performance` page** — an extra click for the primary question the detail page should answer.

**Answer:**

**Q15. The cumulative plan-vs-actual chart — how is it built?**

- [x] **d3 line chart in `packages/plugin-rdhy/src/web/`, following the `RevenueExpensesChart` pattern** — plan as a step line through milestone cumulative targets, actual as a monthly cumulative line, milestone due-date markers; consistent with the app's only existing chart idiom (d3 + ResizeObserver, no chart lib).
- [ ] **Table + per-milestone progress bars only, no chart in v1** — ships faster, but the "am I trending toward month 9?" question is exactly what a line chart answers and tables don't.
- [ ] **Add a chart library (recharts)** — new dependency to solve an already-solved problem.

**Answer:**

**Q16. When `comparability !== COMPARABLE`, what does the section render?**

- [x] **Warning banner naming the reason + the milestone plan table without judgments + the actuals chart when computable** — degrade by removing exactly what can't be computed, keep everything that can; mirrors the app's NULL-snapshot display philosophy.
- [ ] **Banner only, hide table and chart** — hides valid data (targets are always known; actuals often are too).
- [ ] **Hide the whole section** — the user can't tell the feature exists, let alone why it's silent.

**Answer:**

**Q17. The summary row at the top of the section — which headline stats?**

```
 ┌─────────────┬─────────────┬─────────────┬─────────────┐
 │ Target to   │ Actual to   │ Attainment  │ Status      │
 │ date        │ date        │             │             │
 │ $500,000    │ $430,000    │ 86%         │ BEHIND      │
 └─────────────┴─────────────┴─────────────┴─────────────┘
```

- [x] **Four cards: pro-rata target to date, actual to date, attainment %, overall status** — overall status = the current milestone's status, or the final milestone's judgment when the horizon/window has ended; one glanceable verdict.
- [ ] **Add invoice count and not-converted count as cards** — `notConvertedCount` matters but is a warning badge (Q10), not a headline KPI.
- [ ] **No summary, table only** — loses the at-a-glance answer the feature exists for.

**Answer:**

**Q18. Should seed data demonstrate the feature?**

- [x] **Yes — plugin seed adds ~4 invoices issued by the seeded VAM agent inside the agreement window** — the seeded ACTIVE "Web 3 Consulting HUB" (12-month horizon, $500K/$500K DIRECT goals) becomes a live demo showing a partially-attained milestone; invoices only created when the sample currency/agent prerequisites exist, matching the seed's existing conditional style.
- [ ] **No seed changes** — feature invisible in demos until someone hand-creates invoices.
- [ ] **Seed a second, fully-MISSED agreement too** — more states on show, but seed bloat; MISSED is covered by tests.

**Answer:**

**Q19. BDD coverage for `packages/plugin-rdhy/features/vam-performance.feature` (steps in `apps/api/test/plugins/rdhy/`)?**

- [x] **~9 scenarios: COMPARABLE happy path (targets+actuals+attainment), ACHIEVED past-due, MISSED past-due, ON_TRACK and BEHIND current (pro-rata), UPCOMING, CURRENCY_MISMATCH, NO_MEASURABLE_TARGETS, DRAFT → 409** — every status and every comparability branch the engine can emit, plus the guard; NULL-snapshot exclusion asserted inside the happy path via `notConvertedCount`.
- [ ] **Minimal ~4 (happy path, mismatch, no targets, 409)** — leaves the status state machine — the riskiest logic — untested.
- [ ] **Exhaustive ~14 (every comparability enum value, clamping, self-invoice, multi-item sums as separate scenarios)** — clamping and sums can be folded into existing scenarios; diminishing returns.

**Answer:**
