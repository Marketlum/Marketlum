# 022 — Legal-Entity Invoicing: Specification

> **Decision trail:** `specs/022-legal-entity-invoicing-brainstorming.md` (Q1–Q24). Every design choice below references the question that settled it.

## 1. Overview

Some agents are legal entities and some are not. Only legal entities may issue real (EXTERNAL) invoices. When a non-legal sub-agent Y makes a sale, its legal-entity ancestor X issues the external invoice — which, today, puts the revenue on X's P&L and leaves Y's at zero.

This spec splits the invoice's two roles — legal document and economic attribution — with **auto-generated internal mirror invoices**:

```
        Agent tree                        Invoices after this spec
        ──────────                        ────────────────────────
        Company X   (ORGANIZATION)        [X] ──EXTERNAL #FV-12──────> [Customer]   100 EUR  (legal document,
        └── Sub-agent Y (VIRTUAL)                onBehalfOf: Y, mirror: MIR-FV-12             on behalf of Y)
                                          [Y] ──INTERNAL #MIR-FV-12──> [X]           100 EUR  (system-generated
                                                                                              economic record)
        Y standalone P&L:  +100 revenue                        ✓
        X standalone P&L:  +100 revenue, −100 expense = 0      ✓ (no cut; commission out of scope)
        X consolidated:    +100 revenue (mirror eliminated)    ✓
```

Three pillars:

1. **Enforcement** — the `fromAgent` of an EXTERNAL invoice must be a legal entity. Legal status is derived from `AgentType`: `VIRTUAL` = not legal, `ORGANIZATION`/`INDIVIDUAL` = legal (Q1). Hard 422, all creation paths (Q2, Q20).
2. **On-behalf-of mirrors** — an EXTERNAL invoice may carry `onBehalfOfAgentId` (one VIRTUAL descendant of the issuer, Q4/Q5/Q13); the system generates and owns a linked INTERNAL mirror invoice from that descendant to the issuer (Q3, Q9).
3. **Consolidated P&L** — the agent financials endpoint gains `consolidated=true`: subtree-wide P&L with INTERNAL invoices between subtree members eliminated (Q6). The dashboard excludes mirrors to avoid double-counting (Q21).

## 2. Domain model

### 2.1 Schema changes (invoices only — no Agent changes, per Q1)

| Table | Column | Type | Constraints |
|---|---|---|---|
| `invoices` | `onBehalfOfAgentId` | `uuid NULL` | FK → `agents(id)` `ON DELETE RESTRICT` |
| `invoices` | `mirrorInvoiceId` | `uuid NULL` | FK → `invoices(id)` `ON DELETE SET NULL`, `UNIQUE` |

Both columns live on the **source** invoice; the mirror is a plain INTERNAL invoice with no special columns (Q8). "Is this invoice a mirror?" = `EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = i.id)`.

`ON DELETE RESTRICT` on `onBehalfOfAgentId` matches the existing `fromAgentId`/`toAgentId` behavior: an agent referenced by invoices cannot be deleted. The `UNIQUE` on `mirrorInvoiceId` guarantees one source per mirror.

### 2.2 Invariants (enforced in `InvoicesService.create`/`update`)

| # | Rule | Failure | Trail |
|---|---|---|---|
| I1 | `market = EXTERNAL` ⇒ `fromAgent.type ≠ VIRTUAL` | 422 `Only legal entities can issue external invoices` | Q1, Q2 |
| I2 | `onBehalfOfAgentId` set ⇒ `market = EXTERNAL` | 422 `On-behalf-of is only allowed on external invoices` | Q13 |
| I3 | `onBehalfOfAgentId` set ⇒ that agent has `type = VIRTUAL` | 422 `On-behalf-of agent must not be a legal entity` | Q5, Q13 |
| I4 | `onBehalfOfAgentId` set ⇒ that agent is a **strict descendant** of `fromAgent` (closure table) | 422 `On-behalf-of agent must be a descendant of the issuing agent` | Q5 |
| I5 | Mirror number `MIR-{number}` free in the sub-agent's sequence | 409 `Invoice number already exists for this agent` (existing message) | Q7 |
| I6 | Direct `PATCH`/`DELETE` on a mirror invoice | 422 `Mirror invoices are system-managed; edit the source invoice` | Q9 |

I1 applies on every create and on every update that touches `fromAgentId` or `market` (and, as with all update rules, is re-validated against the effective post-update state). Legacy rows that violate I1 are untouched until edited (Q19).

Descendant check (I4) uses the existing closure table:

```sql
SELECT 1 FROM agents_closure
WHERE "id_ancestor" = $fromAgentId AND "id_descendant" = $onBehalfOfAgentId
  AND "id_ancestor" <> "id_descendant"
```

### 2.3 Mirror lifecycle (Q9)

The mirror is system-owned, read-only, and **fully regenerated** on any source change. One code path: `regenerateMirror(source)`.

| Source event | Mirror effect |
|---|---|
| Created with `onBehalfOfAgentId` | Mirror created, `source.mirrorInvoiceId` set |
| Updated (any field) while `onBehalfOfAgentId` set | Old mirror deleted, new mirror created (wholesale regeneration) |
| `onBehalfOfAgentId` changed to another descendant | Same — regenerated with new `fromAgent` |
| `onBehalfOfAgentId` cleared (`null`) | Mirror deleted, `mirrorInvoiceId` cleared |
| Source deleted | Mirror deleted in the same transaction |

Mirror construction from source (Q7, Q10, Q11, Q12):

| Mirror field | Value |
|---|---|
| `number` | `MIR-{source.number}` |
| `fromAgentId` | `source.onBehalfOfAgentId` |
| `toAgentId` | `source.fromAgentId` |
| `market` | `INTERNAL` |
| `issuedAt`, `dueAt`, `currencyId`, `paid` | copied from source |
| `items` | copied verbatim (`valueId`, `valueInstanceId`, `quantity`, `unitPrice`, `total`) — 100% mirror, no commission (Q10) |
| `link`, `fileId`, `channelId`, `orderId` | `null` — document/workflow fields stay on the legal document (Q12) |

Item snapshots are computed by the **existing** `snapshotItem` path at the mirror's own `issuedAt` (= source's), against the mirror's own from/to functional currencies — this is the whole point: Y's `fromAgentAmount` lands in Y's functional currency with zero new snapshot machinery (Q3).

Mirror regeneration and source save happen in one transaction. Domain events are the standard `marketlum.invoice.created|updated|deleted` — regeneration emits `deleted` + `created` for the mirror; no special event type (Q22).

## 3. API surface

No new controllers; all changes ride on existing endpoints (`AdminGuard` + HRBAC `invoices` resource as today — no new permissions).

### `POST /invoices`, `PATCH /invoices/:id`

- Request gains `onBehalfOfAgentId?: string (uuid) | null`.
- Validation per §2.2. `PATCH` on a mirror → 422 (I6).

### `GET /invoices/:id`, `GET /invoices/search`

Response (`invoiceResponseSchema`) gains:

```ts
onBehalfOfAgent: agentSummarySchema.nullable(),          // set on sources
mirrorInvoice: z.object({ id: z.uuid(), number: z.string() }).nullable(),   // set on sources
sourceInvoice: z.object({                                 // set on mirrors (reverse join)
  id: z.uuid(), number: z.string(),
  fromAgent: z.object({ id: z.uuid(), name: z.string() }),
}).nullable(),
```

`sourceInvoice` is resolved by `LEFT JOIN invoices s ON s."mirrorInvoiceId" = invoice.id`. An invoice with `sourceInvoice !== null` **is** a mirror — the UI derives the badge and read-only mode from this, no extra flag.

### `GET /invoices/search` — new filter (Q14)

`mirror=all | exclude | only` (default `all`). `exclude` adds `NOT EXISTS (source join)`; `only` the inverse.

### `DELETE /invoices/:id`

- On a mirror → 422 (I6).
- On a source → also deletes its mirror, same transaction.

### `GET /agents/:id/financials` — `consolidated` param (Q6, Q17)

`agentFinancialsQuerySchema` gains `consolidated: z.coerce.boolean().default(false)`.

**Semantics of `consolidated=true`** (subtree = agent + all closure-table descendants):

- **Revenue**: invoices with `fromAgentId ∈ subtree`, **excluding** eliminated ones.
- **Expense**: invoices with `toAgentId ∈ subtree`, **excluding** eliminated ones.
- **Eliminated**: `market = INTERNAL` AND both `fromAgentId ∈ subtree` AND `toAgentId ∈ subtree` (covers mirrors and any other intra-group internal invoice — Q6, third option rejected).
- An EXTERNAL invoice between two subtree members contributes to both sides (net zero), mirroring the spec-016 self-invoice rule.
- `invoiceCount`: invoices touching the subtree minus eliminated ones.

**Currency rule (derived decision, flagged):** the consolidated view stays in the consolidating agent's functional currency. `fromAgentAmount`/`toAgentAmount` snapshots are in each invoice-side agent's own functional currency, so a subtree invoice whose relevant side-agent has a **different** functional currency than the consolidating agent cannot be summed — it is excluded from sums and added to `notConvertedCount`, exactly like a NULL snapshot today (the established graceful-degradation pattern). In practice the dominant case is clean: mirrors are eliminated anyway, and the parent's own external invoices are already in its currency. Implementation: join the side agent and `CASE WHEN sideAgent."functionalCurrencyId" IS DISTINCT FROM $consolidatingAgentCurrency THEN NULL ELSE t.total END`.

`consolidated=false` (default) is byte-for-byte today's behavior.

### Dashboard (`GET /dashboard/...`) — mirror exclusion (Q21)

Both `dashboard.service.ts` queries (`getMonthly*`-style aggregate and `getNotConvertedCount`) add:

```sql
AND NOT EXISTS (SELECT 1 FROM invoices s WHERE s."mirrorInvoiceId" = i.id)
```

Mirrors are excluded from dashboard aggregates unconditionally — including when filtering by the sub-agent — because the dashboard is presentation-currency market activity; per-agent economics live on the Financials tab. Genuine (non-mirror) INTERNAL invoices remain included, as today.

### Import path (`POST /invoices/import` flow)

No on-behalf field in the import dialog (Q20). The import flow creates invoices through the same validated path, so I1 applies; users add `onBehalfOfAgentId` afterwards via edit.

## 4. Database — migration outline

One manual migration (per project convention — no `migration:generate` drift):

```
1700000000XXX-AddOnBehalfInvoicing.ts
  up:
    ALTER TABLE invoices ADD COLUMN "onBehalfOfAgentId" uuid NULL;
    ALTER TABLE invoices ADD COLUMN "mirrorInvoiceId" uuid NULL;
    ALTER TABLE invoices ADD CONSTRAINT "FK_invoices_onBehalfOfAgent"
      FOREIGN KEY ("onBehalfOfAgentId") REFERENCES agents(id) ON DELETE RESTRICT;
    ALTER TABLE invoices ADD CONSTRAINT "FK_invoices_mirrorInvoice"
      FOREIGN KEY ("mirrorInvoiceId") REFERENCES invoices(id) ON DELETE SET NULL;
    ALTER TABLE invoices ADD CONSTRAINT "UQ_invoices_mirrorInvoice" UNIQUE ("mirrorInvoiceId");
    CREATE INDEX "IDX_invoices_mirrorInvoice" ON invoices ("mirrorInvoiceId");  -- reverse-join + dashboard NOT EXISTS
  down: drop in reverse order.
```

No data migration (Q19).

## 5. Backend module layout (`packages/core/src/`)

| File | Change |
|---|---|
| `invoices/entities/invoice.entity.ts` | `onBehalfOfAgent`/`onBehalfOfAgentId`, `mirrorInvoice`/`mirrorInvoiceId` columns; non-column `sourceInvoice?` populated on read |
| `invoices/invoices.service.ts` | Invariants I1–I6; `regenerateMirror()` private helper; mirror handling in `create`/`update`/`remove`; `sourceInvoice`/`mirror` joins in `findOne`/`search`; `mirror=` filter |
| `invoices/agent-financials.service.ts` | `consolidated` branch: subtree CTE from `agents_closure`, elimination predicate, functional-currency guard (§3) |
| `invoices/invoice.dto.ts` | pass-through of new fields |
| `dashboard/dashboard.service.ts` | `NOT EXISTS` mirror exclusion in both queries |
| `migrations/…AddOnBehalfInvoicing.ts` | §4 |

`AgentsService` is untouched — descendant checks run as raw closure-table SQL inside `InvoicesService` (no cross-module service dependency needed beyond the existing `Agent` repository already injected in `agent-financials.service.ts`; `InvoicesService` gains the same repository injection if not present).

## 6. Shared package additions (`packages/shared/src/`)

| File | Change |
|---|---|
| `schemas/invoice.schema.ts` | `createInvoiceSchema`/`updateInvoiceSchema`: `onBehalfOfAgentId: z.string().uuid().nullable().optional()`; `invoiceResponseSchema`: `onBehalfOfAgent`, `mirrorInvoice`, `sourceInvoice` (§3); search query schema: `mirror: z.enum(['all','exclude','only']).default('all')` |
| `schemas/agent-financials.schema.ts` | `agentFinancialsQuerySchema`: `consolidated: z.coerce.boolean().default(false)`; response gains `consolidated: z.boolean()` echo |

Reminder: `pnpm --filter @marketlum/shared build` before API tests.

## 7. UI package additions (`packages/ui/src/`)

| File | Change | Trail |
|---|---|---|
| `components/invoices/invoice-form-dialog.tsx` | "On behalf of" select: rendered only when `market = EXTERNAL` and the chosen `fromAgent` has VIRTUAL descendants (fetched via existing `GET /agents/:id/descendants`, filtered to `type === 'virtual'`); options = those descendants; none/empty = normal invoice. VIRTUAL agents in the `fromAgent` select are **disabled with hint** ("not a legal entity — issue via a parent") when `market = EXTERNAL`. | Q13, Q18 |
| `components/invoices/columns.tsx` | "Mirror" badge (outline, next to market badge) when `sourceInvoice !== null`; "On behalf" indicator on sources optional in list | Q14 |
| `components/invoices/invoices-data-table.tsx` / `pages/admin/invoices-page.tsx` | Mirror filter: all / hide mirrors / only mirrors → `mirror=` param | Q14 |
| `pages/admin/invoice-detail-page.tsx` | **Mirror**: read-only mode (edit/delete hidden) + banner "System-generated mirror of {source.number} ({source.fromAgent.name}) — edits happen on the source", linking to source. **Source**: "On behalf of: {agent}" row + link to `mirrorInvoice.number`. | Q15, Q16 |
| `pages/admin/agent-detail-page.tsx` (Financials tab) | "Consolidated" switch, visible only when the agent has descendants (children known from agent detail); on → re-fetch with `consolidated=true`, sublabel "incl. sub-agents, intercompany eliminated"; default off | Q17 |
| locales | New translation keys for all of the above (badge, banner, hints, switch), in every locale file under `packages/core/src/locales`-driven UI translations pattern used by existing invoice keys |

## 8. Web app wiring / template sync

No new routes: `apps/web/src/app/admin/invoices/page.tsx`, `invoices/[id]/page.tsx`, and the agent detail route already exist as thin re-exports of `@marketlum/ui` pages. **No `apps/web` or `apps/api` file changes ⇒ no `packages/create-marketlum-app/template/` sync needed** (per CLAUDE.md rule; template mirrors only thin route re-exports and config). Verify at the end of implementation that no config/dependency version moved; if it did, mirror it.

## 9. Seed data (Q23)

`seed-sample.command.ts` additions:

- One VIRTUAL sub-agent (e.g. "Acme Studio") under an existing seeded ORGANIZATION.
- One EXTERNAL invoice from that ORGANIZATION to an existing customer agent with `onBehalfOfAgentId` = the sub-agent, a couple of items — created **through `InvoicesService.create`** so the mirror is generated by the real code path.

After `pnpm seed:sample`: mirror badge in list, banner on mirror detail, on-behalf row on source detail, consolidated toggle on the ORGANIZATION's Financials tab, and dashboard totals excluding the mirror are all observable.

## 10. BDD test coverage (strict BDD — features first)

New feature files in `packages/bdd/features/`, step defs in `apps/api/test/` (jest-cucumber, shared ref-counted app, `createAuthenticatedUser()` per existing pattern):

### `invoices/legal-entity.feature` → `apps/api/test/invoices/legal-entity.steps.ts` (~5 scenarios)

1. Creating an EXTERNAL invoice with a VIRTUAL `fromAgent` → 422.
2. Updating an invoice's `fromAgent` to a VIRTUAL agent while EXTERNAL → 422.
3. Creating an INTERNAL invoice with a VIRTUAL `fromAgent` → 201.
4. Creating an EXTERNAL invoice with an ORGANIZATION `fromAgent` → 201.
5. Updating a legacy-style EXTERNAL invoice (seeded raw with VIRTUAL issuer) without fixing the issuer → 422 (enforce-on-touch, Q19).

### `invoices/on-behalf-mirror.feature` → `on-behalf-mirror.steps.ts` (~11 scenarios)

1. Create with `onBehalfOfAgentId` → mirror exists: number `MIR-{n}`, from = sub-agent, to = issuer, INTERNAL, same dates/currency/paid, items verbatim, no file/link/channel/order; source response carries `onBehalfOfAgent` + `mirrorInvoice`.
2. Mirror items have `fromAgentAmount` in the sub-agent's functional currency (snapshot path).
3. `onBehalfOfAgentId` on an INTERNAL invoice → 422 (I2).
4. `onBehalfOfAgentId` referencing a non-VIRTUAL agent → 422 (I3).
5. `onBehalfOfAgentId` referencing a non-descendant VIRTUAL agent → 422 (I4).
6. Mirror-number collision → 409 (I5).
7. Updating source items/dates regenerates the mirror (new values, same link).
8. Marking source `paid` propagates to the mirror (Q11).
9. Clearing `onBehalfOfAgentId` deletes the mirror.
10. Deleting the source deletes the mirror.
11. Direct `PATCH` and `DELETE` on a mirror → 422 (I6).

### `invoices/search-mirrors` — extend `search-invoices.feature` (~2 scenarios)

`mirror=exclude` hides mirrors; `mirror=only` returns only mirrors; response `sourceInvoice` set on mirrors.

### `agents/consolidated-financials.feature` → `apps/api/test/agents/consolidated-financials.steps.ts` (~5 scenarios)

1. Consolidated revenue includes a descendant's external invoice; standalone does not.
2. Intra-subtree INTERNAL invoice (a mirror) eliminated in consolidated view; on-behalf deal counted exactly once.
3. `consolidated=false` (and omitted) → identical to pre-spec behavior.
4. Descendant with a different functional currency → its invoice lands in `notConvertedCount`, not sums.
5. Consolidated on a leaf agent = standalone.

### `dashboard/get-dashboard-summary.feature` — extend (~2 scenarios)

1. Dashboard totals exclude mirror invoices (on-behalf deal counted once).
2. Non-mirror INTERNAL invoices still included.

**Total: ~25 scenarios.** Feature files are written and reviewed before any implementation (project BDD rule). Update the MEMORY/commands note for `pnpm test:e2e` count after implementation.

## 11. Out of scope (with decision trail)

- **Explicit `isLegalEntity` column / new agent types** — legal status derived from `AgentType.VIRTUAL` (Q1).
- **Item-level attribution** (multi-sub-agent invoices) — invoice-level only; later phase (Q4).
- **Multi-hop mirror chains** (nearest-ancestor accounting) — any legal ancestor issues directly (Q5).
- **Commission / cut modeling** — mirrors are 100%; per-agent %, overrides → follow-up spec (Q10).
- **Independent intercompany settlement tracking** — mirror `paid` follows source (Q11).
- **On-behalf UI in the PDF import dialog** — edit after import (Q20).
- **Excluding all INTERNAL invoices from the dashboard** — only mirrors excluded (Q21).
- **Dedicated mirror domain events** — standard invoice events (Q22).
- **Legacy-data migration or violation report** — enforce on touch only (Q19).

## 12. Delivery plan (single PR, backend-first — Q24)

1. **BDD features** — all files in §10 (red).
2. **Shared** — schema additions (§6), rebuild shared.
3. **Migration + entity** — §4, §5.
4. **Enforcement** — I1 in create/update; legal-entity scenarios green.
5. **Mirror lifecycle** — I2–I6, `regenerateMirror`, delete cascade, response joins, search filter; mirror scenarios green.
6. **Consolidated financials** — §3 branch; consolidated scenarios green.
7. **Dashboard exclusion** — §3; dashboard scenarios green.
8. **UI** — §7 (form field + disabled-hint, badges, filter, banners, consolidated switch, translations).
9. **Seed** — §9.
10. **Full `pnpm test:e2e`**, `tsc`/`next build` verification, template-sync check (§8).
