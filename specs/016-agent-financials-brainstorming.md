# 016 — Agent Financials (P&L): Brainstorming

> **Goal:** A Financials tab on the agent detail page showing the agent's profit & loss statement derived from invoices.

> **Process:** Append-only Q&A. Each round adds questions with preselected recommendations (`[x]`). Move the `[x]` to override, or write below `**Answer:**` to elaborate. Existing content is never edited.

## Context

- **Invoices** carry `fromAgentId` (issuer) and `toAgentId` (receiver), an `issuedAt` date, a `paid` flag, a `direction` (`revenue | expense`) that encodes the *value stream's* perspective, an invoice-level `currencyId`, and a denormalised `total` in that currency.
- **Spec 010 snapshots**: each invoice item stores three amount pairs — `presentationAmount` (system presentation currency), `fromAgentAmount` (issuer's functional currency), `toAgentAmount` (receiver's functional currency). NULL is the graceful "no rate / no functional currency" state. The search endpoint already computes `presentationTotal` / `fromAgentTotal` / `toAgentTotal` per invoice (NULL when any item lacks a snapshot).
- **Value-stream financials** (spec 011) is the house pattern for P&L-from-invoices: `GET /value-streams/:id/financials?year=&directOnly=` returns monthly/quarterly/annual revenue, expense, and net in the presentation currency, plus `invoiceCount` and `notConvertedCount`; UI has summary cards, a breakdown table, and explicit empty states (`packages/ui/src/components/value-stream-financials/`).
- **Agent detail page** tabs today: Details, Sub-agents, Values, Offerings, Exchanges, Agreements, Invoices, Agreement Templates, Addresses. Agents have a nullable `functionalCurrency` (spec 010) and are hierarchical (spec 015; subtree roll-ups explicitly deferred).

```
                    Agent = Acme Corp
   Invoice INV-1: from Acme  → to Buyer   1000   → Acme's REVENUE
   Invoice INV-2: from Vendor → to Acme    400   → Acme's EXPENSE
                                                 ─────────────────
                                          Net       600 (profit)
```

---

## Round 1 — Foundations

This round pins down what "the agent's P&L" means: which invoices count on which side, the reporting currency, time scope, and where the computation lives.

**Q1. What makes an invoice revenue vs expense *for this agent*?**

- [x] **Role-based: `fromAgentId = agent` → revenue, `toAgentId = agent` → expense** — the issuer bills money in, the receiver pays money out; this is the agent's own perspective and works for any agent. The invoice's `direction` column is ignored here (it encodes the value-stream/owner perspective, which is meaningless for a counterparty's P&L).
- [ ] **Reuse the invoice `direction` field** — cheapest, but wrong the moment the viewed agent is on the other side of the invoice (a "revenue" invoice is an *expense* for its receiver).
- [ ] **Role-based, but only where `direction` agrees** — excludes legitimate rows and conflates two unrelated perspectives.

**Answer:**

**Q2. Which currency is the P&L reported in?**

- [x] **The agent's functional currency, from the per-agent snapshots** — sum `fromAgentTotal` on the revenue side and `toAgentTotal` on the expense side; this is exactly what spec 010's per-agent snapshot pairs were built for. Invoices with missing snapshots are counted in a `notConvertedCount` (mirroring value-stream financials); if the agent has no functional currency at all, return the null-summary empty state.
- [ ] **The system presentation currency (`presentationAmount`)** — consistent with value-stream financials, but reports a third party's P&L in *our* currency and ignores the purpose-built per-agent snapshots.
- [ ] **Both, with a perspective toggle** — maximal, but doubles the response shape, the UI states, and the BDD matrix for a first iteration.

**Answer:**

**Q3. Time scope and bucketing?**

- [x] **Calendar year (`?year=`, default current) with monthly + quarterly + annual figures** — exact parity with value-stream financials; the UI components for cards and breakdown tables can be reused nearly as-is.
- [ ] **Arbitrary from/to date range** — more flexible, but diverges from the established financials shape and complicates bucketing.
- [ ] **All-time single totals** — too coarse for a P&L statement.

**Answer:**

**Q4. Do unpaid invoices count?**

- [x] **Yes — accrual view over `issuedAt`, `paid` ignored** — mirrors value-stream financials, and a P&L is conventionally accrual-based; a paid/outstanding split can be layered on later.
- [ ] **Only paid invoices (cash view)** — understates issued-but-unpaid revenue and diverges from the existing financials semantics.
- [ ] **Both views with a toggle** — doubles scope for a refinement nobody asked for yet.

**Answer:**

**Q5. Does the P&L include sub-agents (spec 015 hierarchy)?**

- [x] **No — this agent's own invoices only** — spec 015 explicitly deferred subtree roll-ups, and mixing descendants breaks the functional-currency basis (each sub-agent may report in a different currency). The consolidated group P&L belongs in the future roll-up spec.
- [ ] **Subtree toggle like value-stream `directOnly`** — attractive symmetry, but only coherent in presentation currency, which contradicts Q2's recommendation.

**Answer:**

**Q6. Where does the computation live and how is it exposed?**

- [x] **New `GET /agents/:id/financials?year=` endpoint, `AgentFinancialsService` + controller in the invoices module** — mirrors `value-stream-financials.controller.ts` living next to the invoice data it aggregates; response shape modeled on `ValueStreamFinancialsResponse` (summary, byMonth, byQuarter, invoiceCount, notConvertedCount, currency).
- [ ] **Client-side aggregation from `/invoices/search?agentId=`** — no new endpoint, but pages through up to 10k rows in the browser and re-implements money math in the UI.
- [ ] **Extend the dashboard module** — the dashboard is system-wide; this is agent-scoped.

**Answer:**

---

## Round 2 — Response shape, UI, and edge cases

Round 1 fixed the semantics (role-based, agent functional currency, calendar year, accrual, no subtree, dedicated endpoint). This round pins the response contract, what the tab shows, and the awkward edges.

**Q7. How closely does the response mirror `ValueStreamFinancialsResponse`?**

- [x] **Same skeleton, agent-flavored fields** — `{ agentId, year, functionalCurrency: {id,name,code} | null, summary: {revenue,expense,net → monthly avg/quarterly avg/annual}, byMonth[12], byQuarter[4], invoiceCount, notConvertedCount }`; strings with 2 decimals, nulls when no functional currency. Reusing the shape means the existing cards/table components need only prop-level changes.
- [ ] **A leaner shape (annual + byMonth only)** — smaller, but then the value-stream UI components can't be reused without forking them.
- [ ] **Add extra dimensions now (per-counterparty breakdown)** — useful someday, but grows the first iteration and the BDD matrix substantially.

**Answer:**

**Q8. What exactly does `notConvertedCount` count for an agent?**

- [x] **Invoices on the agent's side whose per-agent total is NULL** — i.e. revenue-side invoices with `fromAgentTotal IS NULL` plus expense-side invoices with `toAgentTotal IS NULL`; those invoices are excluded from sums and surfaced as a warning count, exactly like the value-stream pattern's item-level count but at the granularity users see (whole invoices).
- [ ] **Item-level count (like value-stream financials)** — finer-grained, but the agent P&L sums invoice-level totals, so a whole-invoice count matches what is actually excluded.
- [ ] **Fail the request when any snapshot is missing** — punishes historical data for a display concern.

**Answer:**

**Q9. What does the Financials tab render?**

- [x] **Reuse the value-stream financials composition: year selector + three summary cards (Revenue / Expense / Net) + monthly-quarterly breakdown table + the empty states** — generalize the existing `FinancialsSummaryCards` / `FinancialsBreakdownTable` / `FinancialsEmptyStates` components to accept a currency label + data (they are presentation-only), rather than copying them.
- [ ] **Copy the components into an agents variant** — avoids touching shared components but duplicates ~3 files that would drift.
- [ ] **A chart-first design** — nicer, but new ground; the house pattern is cards + table.

**Answer:**

**Q10. What happens when the agent has no functional currency?**

- [x] **Tab renders an explicit empty state with a call to action** — "Set a functional currency to see this agent's P&L" linking to the edit dialog; the endpoint still returns 200 with null summary (mirrors how value-stream financials behaves without a presentation currency). Counts (`invoiceCount`) still show so the user sees data exists.
- [ ] **Hide the Financials tab entirely** — makes the feature undiscoverable exactly when configuration is missing.
- [ ] **Fall back to presentation currency** — silently switches the meaning of every number; worse than being explicit.

**Answer:**

**Q11. Where does the Financials tab sit in the (already long) tab row?**

- [x] **Right after Details, before Sub-agents** — financials are the highest-signal summary of an agent; the related-record tabs stay in their current order after it.
- [ ] **After Invoices** — logical adjacency to its source data, but buries the headline view in position 7 of 10.
- [ ] **Replace the Invoices tab with a combined Financials view** — loses the full invoice table functionality.

**Answer:**

**Q12. Self-referential edge: can an invoice have the same agent on both sides, and if so how is it treated?**

- [ ] **Treat defensively: if `fromAgentId = toAgentId = agent`, count it on both sides (revenue and expense) so net is zero** — the API currently allows creating such invoices, and both-sides counting is the only answer that keeps totals consistent without special-casing; a BDD scenario locks the behavior in.
- [ ] **Exclude self-invoices entirely** — silently drops rows the user can see in the Invoices tab.
- [x] **Forbid self-invoices at creation (validation change)** — out of scope for a read-only reporting feature; would need its own migration/cleanup story.

**Answer:**
