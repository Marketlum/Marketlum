# 016 — Agent Financials (P&L): Specification

> Decision trail: [`016-agent-financials-brainstorming.md`](./016-agent-financials-brainstorming.md) (Q1–Q12, all recommendations accepted).

## 1. Overview

A **Financials** tab on the agent detail page shows the agent's profit & loss statement for a calendar year, aggregated from invoices (Q6). Semantics are **role-based** (Q1): invoices the agent *issued* (`fromAgentId = agent`) are revenue; invoices the agent *received* (`toAgentId = agent`) are expense. The invoice `direction` column is ignored — it encodes the value-stream perspective. Figures are reported in the **agent's functional currency** using the spec-010 per-agent snapshot totals (Q2), accrual over `issuedAt` with `paid` ignored (Q4), this agent only — no sub-agent roll-up (Q5).

```
              Agent P&L (Acme Corp, EUR, 2026)
  Revenue  = Σ fromAgentTotal of invoices issued BY Acme in 2026
  Expense  = Σ toAgentTotal   of invoices issued TO Acme in 2026
  Net      = Revenue − Expense
  Self-invoice (from = to = Acme): counted on BOTH sides → net 0 (Q12)
  Invoice with NULL per-agent total on the relevant side:
    excluded from sums, counted in notConvertedCount (Q8)
```

## 2. API surface

One new endpoint, `AdminGuard` (default):

**`GET /agents/:agentId/financials?year=`** → 200

- `year` optional, coerced int 1900–2100, defaults to the current UTC year (reuse the coercion pattern from `valueStreamFinancialsQuerySchema`, minus `directOnly`).
- 404 when the agent doesn't exist.
- When the agent has **no functional currency**: 200 with `functionalCurrency: null` and null summary/rows, but real `invoiceCount` (Q10) — exactly how value-stream financials behaves without a presentation currency.

## 3. Shared package (`@marketlum/shared`)

New `packages/shared/src/schemas/agent-financials.schema.ts`, mirroring `value-stream-financials.schema.ts` (Q7):

```ts
export const agentFinancialsQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100)
    .default(() => new Date().getUTCFullYear()),
});

export const agentFinancialsResponseSchema = z.object({
  agentId: z.string().uuid(),
  year: z.number().int(),
  functionalCurrency: valueSummarySchema.nullable(), // {id, name, code}
  summary: z.object({
    revenue: figureSchema,   // { monthly, quarterly, annual } — string|null, 2 decimals
    expense: figureSchema,   // monthly/quarterly are averages, annual the total
    net: figureSchema,
  }),
  byMonth: z.array(monthRowSchema).length(12),   // { month: 'YYYY-MM', revenue, expense, net }
  byQuarter: z.array(quarterRowSchema).length(4),// { quarter: 'YYYY-Qn', ... }
  invoiceCount: z.number().int(),
  notConvertedCount: z.number().int(),
});
```

`figureSchema` / `monthRowSchema` / `quarterRowSchema` are structurally identical to the value-stream ones — extract them into the new file (or a shared `financials-figures` module) and re-export rather than duplicating. Export `AgentFinancialsQuery` / `AgentFinancialsResponse` from `index.ts`.

## 4. Backend (`packages/core/src/invoices/`)

New `agent-financials.service.ts` + `agent-financials.controller.ts`, mirroring the value-stream pair (Q6). Registered in `invoices.module.ts` (which must import the `Agent` repository — already available via the module's imports; add if missing).

**Aggregation** (single SQL pass, invoice-level totals):

```sql
-- revenue side (agent is issuer)
SELECT to_char(i."issuedAt", 'YYYY-MM') AS month, 'revenue' AS side,
       SUM(t.total) AS amount, COUNT(*) FILTER (WHERE t.total IS NULL) AS not_converted
FROM invoices i,
LATERAL (SELECT CASE WHEN COUNT(*) = 0 OR COUNT(ii."fromAgentAmount") < COUNT(*)
                     THEN NULL ELSE SUM(ii."fromAgentAmount") END AS total
         FROM invoice_items ii WHERE ii."invoiceId" = i.id) t
WHERE i."fromAgentId" = $1 AND i."issuedAt" >= $2 AND i."issuedAt" < $3
GROUP BY 1
-- UNION ALL the symmetric expense side over "toAgentId"/"toAgentAmount"
```

Rules:
- The per-invoice total is NULL when *any* item lacks the relevant snapshot (same rule as `InvoicesService.search` perspective totals) — that invoice is excluded from sums and adds 1 to `notConvertedCount` (Q8).
- A self-invoice (`fromAgentId = toAgentId = agent`) appears in both branches → both sides (Q12).
- `invoiceCount` counts distinct invoices where the agent is on either side within the year (a self-invoice counts once).
- Amount formatting: `Number(x).toFixed(2)` (Postgres decimal gotcha); summary monthly/quarterly figures are annual/12 and annual/4 averages, matching value-stream financials.
- No functional currency on the agent → skip aggregation, return the null-summary shape with real `invoiceCount` (Q10). `notConvertedCount` is 0 in that state (nothing was converted *or* excluded — the whole statement is unavailable).

No migration — read-only aggregation over existing tables.

## 5. UI (`@marketlum/ui`)

1. **Generalize, don't copy** (Q9): `FinancialsSummaryCards`, `FinancialsBreakdownTable`, and `FinancialsEmptyStates` currently take the value-stream response. Introduce a small common view-model type (`FinancialsFigures` = `{ currencyCode: string | null, summary, byMonth, byQuarter, invoiceCount, notConvertedCount }`) and change the three components to consume it; the value-stream financials page maps its response into it (a ~5-line adapter), the new agent tab likewise. `FinancialsEmptyStates` gains a `missingCurrencyContent` slot so the two callers word their empty states differently.
2. **New `AgentFinancialsTab`** (`packages/ui/src/components/agents/agent-financials-tab.tsx`): year selector (reuse `YearSelector` from value-stream-budget) + the three generalized components; fetches `GET /agents/:id/financials?year=`. Missing functional currency → empty state with "Set a functional currency" CTA that opens the existing edit dialog (Q10).
3. **Agent detail page**: new "Financials" tab **directly after Details, before Sub-agents** (Q11). Final order: Details, Financials, Sub-agents, Values, Offerings, Exchanges, Agreements, Invoices, Agreement Templates, Addresses.
4. **Messages**: EN/PL under `agents.financials.*` (tab label, card titles can reuse `valueStreamFinancials.*` keys where the generalized components already own them; add only agent-specific strings: `financialsTab`, `setCurrencyCta`, `noCurrencyTitle`, `noCurrencyDescription`).

## 6. Web app wiring & template sync

No new routes (the tab lives inside the existing agent detail page shipped from `@marketlum/ui`). Expected **no `apps/web` changes → no `create-marketlum-app` template sync**; verify at the end per `CLAUDE.md`.

## 7. Seed data

None required — the seeded invoices (45) across 50 agents with functional currencies already produce meaningful P&Ls. No seeder changes.

## 8. BDD test coverage

New `packages/bdd/features/agents/agent-financials.feature` + `apps/api/test/agents/agent-financials.steps.ts` (~9 scenarios):

1. Revenue counts invoices issued by the agent; expense counts invoices received (role-based split)
2. The invoice `direction` field does not affect the agent P&L (a `direction=expense` invoice issued by the agent is still their revenue)
3. Figures land in the correct month and quarter (`byMonth`/`byQuarter`)
4. Amounts are reported in the agent's functional currency from per-agent snapshots (cross-currency invoice converts via the seeded rate)
5. An invoice with a missing per-agent snapshot is excluded and increments `notConvertedCount`
6. Unpaid invoices are included (accrual)
7. An agent without a functional currency gets a null summary but a real `invoiceCount`
8. A self-invoice counts as both revenue and expense (net contribution zero)
9. Unknown agent → 404 (+ the standard 401 unauthenticated scenario)

Step-definition setup can reuse the invoice-creation helpers from the value-stream financials steps (agents, values, exchange rates, invoices with issue dates).

## 9. Out of scope (decision references)

- Presentation-currency perspective or a currency toggle (Q2)
- Sub-agent / consolidated group P&L (Q5 — future roll-up spec, together with spec 015's deferral)
- Cash-basis view / paid split (Q4)
- Per-counterparty breakdown (Q7)
- Arbitrary date ranges (Q3)
- Forbidding self-invoices at creation (Q12)

## 10. Delivery plan (single PR)

1. `agent-financials.feature` + step definitions skeleton
2. Shared schemas (extract shared figure schemas, add agent query/response) → build `@marketlum/shared`
3. `AgentFinancialsService` + controller, module registration
4. Steps green (`test/agents/` suite), plus value-streams financials suite to confirm the schema extraction didn't drift
5. UI: generalize the three financials components (adapt the value-stream page), add `AgentFinancialsTab`, wire the tab, EN/PL messages → build `@marketlum/ui`, `tsc --noEmit` in `apps/web`
6. Template-sync verification (expected no-op)
