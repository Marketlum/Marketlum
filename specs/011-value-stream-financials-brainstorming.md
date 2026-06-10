# 011 — Value Stream Financials (Revenue & Expenses from Invoices)

> **Goal:** Track actual revenue and expenses per ValueStream, aggregated from invoice data — the "actuals" counterpart to the existing recurring-flow budget projections.

> **Process:** This is an append-only brainstorming document. Each round, I append questions; you move the `[x]` to your chosen option and/or write free text after `**Answer:**`. Never edit earlier rounds — the file is the decision trail. Say "Done" when a round is complete and I'll summarise and append the next.

## Context

The codebase already has two adjacent pieces of machinery:

1. **Dashboard** (`packages/core/src/dashboard/dashboard.service.ts`, `GET /dashboard/summary`)
   - Aggregates invoice line-item `presentationAmount` into a monthly time series.
   - **Agent-centric**: when `agentId` is given, revenue = invoices where `i.fromAgentId = agentId`, expenses = invoices where `i.toAgentId = agentId`.
   - Can *filter* by `valueStreamId`/`channelId`/date, but never derives revenue-vs-expense **direction from the value stream**. In "all" mode (no agent) everything is counted as revenue, expenses = 0.

2. **Recurring-flow budget** (`packages/core/src/recurring-flows/budget.service.ts`, `GET /value-streams/:id/budget`)
   - **Value-stream-centric**: scopes flows to a VS (+ descendants unless `directOnly`), classifies by `RecurringFlowDirection` (INBOUND = revenue, OUTBOUND = expense), sums `presentationAmount × occurrences`, returns month / quarter / annual breakdown + null-safe "skipped" counts when presentation currency is missing.
   - This is **projection** (what *should* flow), not **actuals**.

### Relevant entities

```
ValueStream
  id, code, name, parent (closure-tree), agentId (nullable)   ← "owning" agent

Invoice
  id, number, fromAgentId (issuer), toAgentId (recipient),
  currencyId, issuedAt, dueAt, paid (bool), valueStreamId (nullable),  ← DIRECT link
  channelId (nullable), items[], total

InvoiceItem
  quantity, unitPrice, total,
  presentationRate/presentationAmount,   ← snapshot in system presentation currency
  fromAgentRate/fromAgentAmount,
  toAgentRate/toAgentAmount
```

An invoice already carries a **direct `valueStreamId`**. What it lacks (relative to recurring flows) is an explicit **direction** — so revenue-vs-expense for a value stream must be *derived*.

```
        invoice.toAgentId == VS.agentId   →  REVENUE (money flowing into the stream's agent)
        invoice.fromAgentId == VS.agentId →  EXPENSE (money flowing out from the stream's agent)
```

This mirrors `mapRecurringFlowAgents` exactly (INBOUND vs OUTBOUND relative to the value stream's agent).

---

## Round 1 — Foundations

This round fixes *what this feature is* and how it relates to the two existing pieces of machinery above: where it lives, how an invoice is attributed to a value stream, how direction is decided, and how it composes with the recurring-flow budget.

### Q1. What is the primary deliverable?

- [x] **New value-stream-scoped "actuals" endpoint** (e.g. `GET /value-streams/:id/financials`) paralleling the existing `/budget` endpoint — same shape, but sourced from invoices — surfaced in the VS detail dashboard tab. — cleanest parallel to the proven budget pattern; keeps the global dashboard untouched.
- [ ] **Extend the existing global dashboard** to derive direction from `valueStreamId` when present, rather than a new endpoint. — reuses one surface, but overloads an agent-centric service with a different mental model.
- [ ] **Both**: new VS-scoped endpoint *and* fix the global dashboard's value-stream handling. — most complete, but larger scope.

**Answer:**

### Q2. How is an invoice attributed to a value stream?

- [x] **Direct `invoice.valueStreamId` only** — an invoice belongs to exactly one value stream (or none). Simple, already in the schema. — matches how invoices are modelled today.
- [ ] **Direct link + line-item-level attribution** — allow individual `InvoiceItem`s to point at different value streams. — more granular, but requires a schema change to `invoice_items` and complicates every aggregation.
- [ ] **Infer from the invoice's agents** (match against any VS whose `agentId` is a party) — no explicit link needed. — fragile; one agent can own many streams.

**Answer:**

### Q3. How is revenue vs. expense direction determined for a value stream?

- [ ] **Derived from the value stream's `agentId`** — `toAgentId == VS.agentId` ⇒ revenue; `fromAgentId == VS.agentId` ⇒ expense. Mirrors `mapRecurringFlowAgents`. — consistent with recurring-flow budget; no schema change.
- [x] **Add an explicit `direction` column to `invoices`** (INBOUND/OUTBOUND), set at invoice creation. — unambiguous and independent of the VS agent, but new field + migration + form work + backfill.
- [ ] **Both** — derive by default, but allow an explicit per-invoice override. — most flexible, most complexity.

**Answer:**

### Q4. Should a value stream's financials include its descendant streams?

- [x] **Yes, with a `directOnly` toggle** — default rolls up the whole subtree (closure-tree `findDescendants`), `directOnly=true` restricts to the stream itself. Identical to the budget endpoint. — consistent UX across budget & actuals.
- [ ] **Direct stream only** — no rollup; simpler, but inconsistent with budget and less useful for parent streams.
- [ ] **Yes, always roll up** — no toggle. — simplest, but removes a useful drill-down the budget already offers.

**Answer:**

### Q5. Which invoices count toward actuals?

- [x] **All invoices with an `issuedAt` in range**, regardless of `paid` — actuals = what was invoiced; expose `paid` as an *additional* optional filter later. — matches accrual-style reporting and the dashboard's current behaviour.
- [ ] **Only `paid = true` invoices** — actuals = cash actually settled. — cash-basis; understates recent activity since most invoices sit unpaid for a while.
- [ ] **Return both** — report invoiced and paid totals side by side. — richest, but doubles the aggregation and the UI.

**Answer:**

### Q6. How does this compose with the existing recurring-flow budget?

- [x] **Separate endpoint now, deliberately aligned shape** — `/financials` returns the same period structure as `/budget` so a future "budget vs. actual" view can place them side by side without rework, but that combined view is out of scope here. — ships value fast, leaves the door open.
- [ ] **Unified "budget vs actual" endpoint now** — one response carrying both projected (recurring) and actual (invoice) figures per period. — most useful end state, but couples two sources and enlarges this spec significantly.
- [ ] **Fully independent** — no attempt to align shapes with budget. — least effort, but guarantees rework when the comparison view is wanted.

**Answer:**

### Q7. What currency basis and missing-data handling?

- [x] **Presentation-currency snapshot** (`InvoiceItem.presentationAmount`), null-safe — sum non-null amounts, count line items where `presentationAmount IS NULL` as "not converted" (mirrors `notConvertedCount` / `skippedFlows`). — consistent with both existing services.
- [ ] **Presentation currency, but fail loudly** if any item is unconverted (no graceful degradation). — simpler totals, worse UX when rates are missing.
- [ ] **Per-agent functional currency** (`fromAgentAmount`/`toAgentAmount`) instead of presentation. — matches each party's books, but the "per value stream" rollup has no single natural agent currency.

**Answer:**

---

## Round 1 — Accepted answers

- **Q1** New VS-scoped `GET /value-streams/:id/financials` endpoint, surfaced in the VS detail dashboard tab.
- **Q2** Invoices attributed via direct `invoice.valueStreamId` only.
- **Q3** _(changed from recommendation)_ **Explicit `direction` column on `invoices`** (INBOUND/OUTBOUND), set at invoice creation — classification is a stored fact, not derived from the VS agent.
- **Q4** Subtree rollup by default, `directOnly` query toggle to restrict to the stream itself.
- **Q5** All invoices with `issuedAt` in range count, regardless of `paid`.
- **Q6** Separate `/financials` endpoint whose period structure is deliberately aligned with `/budget` for a future budget-vs-actual view.
- **Q7** Presentation-currency snapshot (`InvoiceItem.presentationAmount`), null-safe, counting unconverted line items.

---

## Round 2 — Shape

The Q3 decision (explicit `direction` on invoices) drives this round. We pin down the direction field itself (enum, nullability, backfill, form behaviour), then the `/financials` response structure and how it aligns with `/budget`.

### Q2.1. What enum backs the invoice `direction` field?

- [ ] **Reuse the existing `RecurringFlowDirection`** values (`INBOUND` / `OUTBOUND`) via a new shared `FlowDirection` enum that both invoices and recurring flows reference. — one vocabulary across the domain; INBOUND = revenue, OUTBOUND = expense everywhere.
- [ ] **New, invoice-specific `InvoiceDirection` enum** with the same two values. — decoupled, but duplicates a concept and invites drift.
- [x] **A `REVENUE` / `EXPENSE` enum** (named for the financial meaning, not flow direction). — most self-explanatory on invoices, but diverges from the recurring-flow INBOUND/OUTBOUND naming the budget already uses.

**Answer:**

### Q2.2. Is `direction` required or optional on an invoice?

- [x] **Required (NOT NULL) for all invoices** — every invoice must declare INBOUND or OUTBOUND at creation. — clean aggregation, no "unclassified" bucket; form must always ask.
- [ ] **Optional (nullable)** — invoices may have no direction; null = "unclassified", excluded from revenue/expense and reported as a separate count (mirrors the null-safe currency handling). — graceful, but adds a third state to every rollup and the UI.
- [ ] **Required only when `valueStreamId` is set**, optional otherwise — direction only matters for stream-attributed invoices. — conditionally required validation is fiddly and surprising in forms.

**Answer:**

### Q2.3. How are existing invoices backfilled in the migration?

- [ ] **Derive per-invoice from the linked VS agent where possible, else default INBOUND** — `toAgentId == valueStream.agentId` ⇒ INBOUND, `fromAgentId == valueStream.agentId` ⇒ OUTBOUND, otherwise (no VS, no agent match) ⇒ INBOUND. — best-effort correctness for already-linked invoices; one SQL `UPDATE … FROM`.
- [x] **Blanket default all existing invoices to INBOUND** — simplest migration; admin re-classifies expenses by hand afterwards. — fast but wrong for every existing expense.
- [ ] **Leave existing invoices NULL** (only valid if Q2.2 is nullable) — no guessing; old invoices are "unclassified" until edited. — honest, but invisible-by-default in reports until someone fixes each one.

**Answer:**

### Q2.4. Should the invoice form auto-suggest a direction?

- [ ] **Yes — prefill from the selected value stream's agent vs. from/to agents, but let the user override.** When VS + agents are chosen, default the dropdown to the derived direction; user can change it. — keeps data correct by default without removing the explicit control Q3 chose.
- [x] **No — always an explicit, un-defaulted choice.** — maximally intentional, but more clicks and more chance of a blank/wrong pick.
- [ ] **Auto-suggest only when the VS agent is unambiguously a party; otherwise leave blank.** — precise, but the partial behaviour is harder to explain.

**Answer:**

### Q2.5. What is the `/financials` response structure?

- [x] **Mirror `/budget` exactly** — `summary { revenue, expense, net: { monthly, quarterly, annual } }`, `byMonth[12]`, `byQuarter[4]`, each with `{ revenue, expense, net }` strings, plus `presentationCurrency`, `invoiceCount`, `notConvertedCount`. — drop-in alignment for a future budget-vs-actual overlay (Q6).
- [ ] **Dashboard-style flat time series** — `timeSeries[{ period, revenue, expenses }]` + totals. — simpler, but doesn't line up with budget's month/quarter/annual rollup.
- [ ] **Minimal** — just `totalRevenue`, `totalExpense`, `net`. — easy, but throws away the periodisation the UI will want.

**Answer:**

### Q2.6. How is the reporting period scoped?

- [x] **By `year` (single integer), like `/budget`** — `GET /value-streams/:id/financials?year=2026&directOnly=false`. — identical scoping to budget; trivial side-by-side comparison.
- [ ] **By arbitrary `fromDate`/`toDate` range, like the dashboard** — more flexible reporting windows. — flexible, but month/quarter/annual rollups need a fixed year to be meaningful, and it diverges from budget.
- [ ] **Year with optional month/quarter drill-down param** — `year` plus optional `period` filter. — richer, but more surface than this first cut needs.

**Answer:**

### Q2.7. Where does the revenue/expense classification + aggregation logic live?

- [x] **A dedicated `RecurringFlowsBudgetService`-style service** (`ValueStreamFinancialsService` or similar) using raw SQL aggregation over `invoices`/`invoice_items`, scoped by the closure-tree descendant ids. — matches the proven budget/dashboard pattern; SQL `SUM … GROUP BY` is the right tool for actuals.
- [ ] **A pure helper in `@marketlum/shared`** fed pre-loaded invoice rows from the service. — testable in isolation, but pulling every line item into JS to sum is wasteful vs. SQL.
- [ ] **Extend the existing `RecurringFlowsBudgetService`** to also emit actuals. — one place for "value stream money", but mixes projection and actuals sources in one class.

**Answer:**

---

## Round 2 — Accepted answers

- **Q2.1** _(changed)_ **`REVENUE` / `EXPENSE` enum** named for financial meaning (not flow direction). The financials service maps `REVENUE`→revenue, `EXPENSE`→expense directly; this intentionally diverges from the recurring-flow `INBOUND`/`OUTBOUND` vocabulary.
- **Q2.2** `direction` is **required / NOT NULL** on every invoice.
- **Q2.3** _(changed)_ Migration **blanket-defaults all existing invoices to `REVENUE`**; expenses are re-classified by hand afterwards.
- **Q2.4** _(changed)_ Form makes direction an **explicit, un-defaulted choice** — no auto-suggestion from VS/agents.
- **Q2.5** `/financials` response **mirrors `/budget` exactly** (`summary`/`byMonth[12]`/`byQuarter[4]` with `revenue`/`expense`/`net`, plus `presentationCurrency`, `invoiceCount`, `notConvertedCount`).
- **Q2.6** Reporting period scoped **by `year`** (+ `directOnly`), matching `/budget`.
- **Q2.7** Logic lives in a **dedicated `ValueStreamFinancialsService`** using raw SQL aggregation over `invoices`/`invoice_items`, scoped by closure-tree descendant ids.

---

## Round 3 — UI / UX

The codebase already has a complete **Budget tab** (`value-stream-layout.tsx` segment `budget` → `value-stream-budget-page.tsx`, with `year-selector.tsx`, `budget-summary-cards.tsx`, `budget-breakdown-table.tsx`, and the D3 `revenue-expenses-chart.tsx`). Financials is a near-mirror, so this round is mostly about placement, reuse, and how `direction` appears on invoices.

### Q3.1. Where does the financials view live in the VS detail page?

- [x] **New "Financials" tab**, added to `value-stream-layout.tsx` right after the existing "Budget" tab — segment `financials`, page `value-stream-financials-page.tsx`. — clean "Budget (projected) vs Financials (actual)" pairing; mirrors the budget route exactly.
- [ ] **Name the new tab "Actuals"** (segment `actuals`) to make the Budget-vs-Actuals contrast explicit. — sharper mental model, but "Financials" reads better as a standalone label.
- [ ] **Fold actuals into the existing VS "Overview/dashboard" area** rather than a dedicated tab. — fewer tabs, but buries the year/directOnly controls and breaks the budget parallel.

**Answer:**

### Q3.2. How are the financials UI components built?

- [x] **Parallel components under `value-stream-financials/`** (`financials-summary-cards.tsx`, `financials-breakdown-table.tsx`) that reuse the existing `year-selector.tsx` and shared `formatFigure`/`cellClass` helpers. — mirrors budget structure, reuses the controls, no risky refactor of working budget code.
- [ ] **Generalise the budget components** to accept either response shape and render both budget and financials. — DRY, but couples two features and risks regressions in the shipped budget UI.
- [ ] **Copy budget components wholesale** with no shared helpers. — fastest, but duplicates the figure-formatting/colour logic.

**Answer:**

### Q3.3. What visualisations does the financials tab show?

- [x] **Summary cards + breakdown table + the D3 `RevenueExpensesChart`** (monthly revenue/expense bars) — full parity with how the VS dashboard already renders invoice data, plus the budget-style rollup. — richest, all components already exist.
- [ ] **Summary cards + breakdown table only** (no chart) — matches the current Budget tab exactly. — simpler, but the chart is free and users already see one elsewhere.
- [ ] **Chart + summary cards only** (no month/quarter table) — visual-first. — loses the precise per-period figures the table gives.

**Answer:**

### Q3.4. How is `direction` entered in the invoice form?

- [ ] **A required `Select`** (Revenue / Expense), styled like the existing `paid` select, positioned next to the Value Stream field — no `__none__` option, no default, user must pick. — consistent with existing selects; reflects Q2.2 (required) + Q2.4 (explicit).
- [x] **A segmented / radio control** (two buttons: Revenue | Expense). — more visible, but a new control pattern not used elsewhere in the forms.
- [ ] **Place it near the top** (after the agents, before currency) rather than by the value stream. — arguable grouping; agents define who pays whom, so direction sits naturally with them.

**Answer:**

### Q3.5. How does `direction` appear in the invoice list?

- [x] **A coloured `Badge` column + a filter** in the filter sheet — Revenue badge emerald, Expense badge rose (matching the chart's `#10b981`/`#f43f5e`), filter Select `all`/`revenue`/`expense`, mirroring the `paid` badge + filter. — consistent with existing list patterns and the chart palette.
- [ ] **Badge column, no filter** — show it but don't make it filterable yet. — less work, but direction is an obvious thing to filter by.
- [ ] **Plain text column, no colour** — minimal. — loses the at-a-glance revenue/expense scan the colour gives.

**Answer:**

### Q3.6. How are missing-data states surfaced on the financials tab?

- [x] **Mirror the budget tab** — when no presentation currency is configured, cards/table show "—"; render an info banner with `notConvertedCount` ("N invoice lines couldn't be converted and are excluded"). — consistent with budget's null-safe handling (Q7).
- [ ] **Banner only when `notConvertedCount > 0`**, and a distinct empty state when there are simply no invoices in range. — more precise messaging, slightly more UI logic.
- [ ] **Silent** — just show "—"/zeros with no banner. — least noise, but hides why totals look low.

**Answer:**

---

## Round 3 — Accepted answers

- **Q3.1** New **"Financials" tab** (segment `financials`) added after "Budget" in `value-stream-layout.tsx`, page `value-stream-financials-page.tsx`.
- **Q3.2** **Parallel components** under `value-stream-financials/`, reusing the existing `year-selector.tsx` and shared figure helpers.
- **Q3.3** Tab shows **summary cards + breakdown table + the D3 `RevenueExpensesChart`**.
- **Q3.4** _(changed)_ Invoice form uses a **segmented / radio control** (two buttons: Revenue | Expense), required, no default.
- **Q3.5** Invoice list gets a **coloured `Badge` column (Revenue emerald / Expense rose) + a filter** in the filter sheet.
- **Q3.6** Missing-data states **mirror the budget tab** — "—" when no presentation currency, info banner driven by `notConvertedCount`.

---

## Round 4 — Integration, security, delivery

Final round: how `direction` flows through the existing invoice machinery (import, events, permissions), seed/i18n, BDD coverage, template sync, and the order of work.

### Q4.1. What guards the new `/financials` endpoint?

- [x] **`AdminGuard` at the controller level**, identical to `/budget` and every other admin endpoint. — the project default; no reason to deviate.
- [ ] **Public / no guard** — financials are read-only aggregates. — inconsistent with the rest of the admin API and leaks revenue data.
- [ ] **A new finer-grained permission** (e.g. a "financials viewer" role). — no role system beyond AdminGuard exists today; out of scope.

**Answer:**

### Q4.2. How does the PDF invoice import flow handle the now-required `direction`?

- [x] **Import leaves `direction` unselected; the review form requires the user to pick before saving** — extraction never guesses direction (consistent with Q2.4's "explicit choice"). — keeps the one explicit human decision a human decision.
- [ ] **Import defaults extracted invoices to `REVENUE`**, user changes if needed. — fewer clicks, but silently mis-classifies imported expenses.
- [ ] **Infer direction during import** from the extracted from/to agents vs. the chosen value stream. — convenient, but re-introduces the agent-derivation Q3 explicitly rejected.

**Answer:**

### Q4.3. Should seed data exercise the feature?

- [x] **Yes — assign a realistic `REVENUE`/`EXPENSE` mix to seeded invoices** so the Financials tab renders meaningful data out of the box (themed to the battery value chain like recent seed work). — makes the feature demoable immediately and gives BDD/dev a populated tab.
- [ ] **Set all seeded invoices to `REVENUE`** (matches the migration default). — minimal, but the Financials tab shows no expenses and looks broken.
- [ ] **Leave seed data untouched** beyond satisfying NOT NULL. — least effort, worst demo.

**Answer:**

### Q4.4. i18n scope for the new strings (tab, column, badge, form control, banner)?

- [x] **Add keys to every existing locale file**, matching how budget/invoice strings are already maintained across locales. — keeps locales complete; the project already does this.
- [ ] **English only for now**, other locales fall back. — faster, but leaves gaps the other features don't have.

**Answer:**

### Q4.5. What BDD coverage does this ship with?

- [x] **Two new feature files + updates to existing invoice features** — `value-streams/financials.feature` (subtree rollup, `directOnly`, revenue/expense split by `direction`, year scoping, null presentation currency, `notConvertedCount`) and `invoices/direction.feature` (required-field validation, create/update with direction, filter by direction); plus patch existing invoice scenarios for the new required field. — full strict-BDD parity with how budget & invoices are tested.
- [ ] **One financials feature file only**, minimal invoice-direction assertions. — lighter, but under-tests the required-field migration impact.
- [ ] **Reuse/extend the existing budget feature file** rather than a new one. — fewer files, but conflates projection and actuals tests.

**Answer:**

### Q4.6. Template sync (`packages/create-marketlum-app/template/`) — what gets mirrored?

- [x] **Mirror every touched `apps/web` and `apps/api` file** — the new `apps/web/.../[id]/financials/page.tsx` route and any wiring — into the template, per the `CLAUDE.md` rule, so scaffolded projects match. — required by project policy; the spec will enumerate the exact mirrored paths.
- [ ] **Skip template sync for this feature**, handle it in a follow-up. — violates the standing rule and drifts the template.

**Answer:**

### Q4.7. How is the work delivered?

- [x] **Single PR, layered in dependency order** — (1) shared `Direction` enum + invoice schema + financials response schema, (2) invoice entity column + migration + backfill, (3) `ValueStreamFinancialsService` + controller route, (4) BDD features + step defs, (5) UI components + tab + invoice form/list, (6) seed + i18n + template sync. — one coherent change; BDD precedes UI per the workflow.
- [ ] **Two PRs** — PR1 the invoice `direction` field (schema/entity/migration/form/list/BDD), PR2 the financials endpoint + tab. — smaller reviews, but the feature isn't usable until both land.
- [ ] **Backend-only first**, UI in a fast follow. — ships the API early, but leaves the feature invisible to users for a while.

**Answer:**



