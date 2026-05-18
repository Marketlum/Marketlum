# Per-Agent Functional Currency — Specification

> **Decision trail:** `010-functional-currency-brainstorming.md`. This document consolidates accepted answers from Rounds 1–4 into an implementation-ready plan.

---

## 1. Overview

Replace the single global "base currency" with a **per-agent functional currency** (operational books) plus a **system-wide presentation currency** (consolidated reporting). Every money-bearing row that today carries a single `(rateUsed, baseAmount)` snapshot pair gains two more pairs — one per agent perspective — so that historic conversions stay locked from every party's viewpoint.

### Model overview

```
┌──────────────────────────────────────────────────────────┐
│  system_settings                                         │
│    key = 'presentation_currency_id'  →  values(id)       │  used only for consolidated rollups
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  agents                                                  │
│    functional_currency_id  →  values(id)  NULLABLE       │  Zod-required on create/update
└──────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼───────────────────┐
        │                 │                   │
   fromAgentId        toAgentId         counterpartyAgentId
        │                 │                   │
        ▼                 ▼                   ▼
┌─────────────────────┐  ┌──────────────────────────────┐
│ Invoice             │  │ RecurringFlow                │
│   currencyId        │  │   currencyId                 │  (transaction currency)
│                     │  │   direction: INCOMING|OUTGOING│
└─────────────────────┘  └──────────────────────────────┘
        │                              │
        ▼                              ▼
┌──────────────────────────────────────────────────────────┐
│  InvoiceItem / RecurringFlow snapshot columns            │
│    fromAgentAmount     / fromAgentRate                   │
│    toAgentAmount       / toAgentRate                     │
│    presentationAmount  / presentationRate                │
│  All nullable: NULL ⇒ "no agent-side snapshot" / "no rate"│
└──────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────┴────────────────────────────────┐
│  value_streams                                           │
│    agentId  →  agents(id)  NULLABLE                      │  no tree inheritance
└──────────────────────────────────────────────────────────┘
```

### Direction → from/to mapping for recurring flows

| `direction`  | `fromAgent`                | `toAgent`                  |
|--------------|----------------------------|----------------------------|
| `INCOMING`   | `counterpartyAgentId`      | `valueStream.agentId`      |
| `OUTGOING`   | `valueStream.agentId`      | `counterpartyAgentId`      |

Either side may be `NULL` when the value stream has no owning agent. In that case the corresponding `*AgentAmount` / `*AgentRate` columns stay `NULL`.

---

## 2. Domain model

### 2.1 Entity changes

| Entity         | Field                       | Type / FK                 | Nullable | Notes                                                            |
|----------------|-----------------------------|---------------------------|----------|------------------------------------------------------------------|
| `Agent`        | `functional_currency_id`    | UUID FK → `values(id)`    | YES      | Zod-required on create/update; FK action: `RESTRICT`             |
| `ValueStream`  | `agentId`                   | UUID FK → `agents(id)`    | YES      | Optional; no tree inheritance; FK action: `SET NULL`             |
| `InvoiceItem`  | `presentationAmount`        | decimal(12,2)             | YES      | **Renamed** from `baseAmount`                                    |
| `InvoiceItem`  | `presentationRate`          | decimal(20,10)            | YES      | **Renamed** from `rateUsed`                                      |
| `InvoiceItem`  | `fromAgentAmount`           | decimal(12,2)             | YES      | New                                                              |
| `InvoiceItem`  | `fromAgentRate`             | decimal(20,10)            | YES      | New                                                              |
| `InvoiceItem`  | `toAgentAmount`             | decimal(12,2)             | YES      | New                                                              |
| `InvoiceItem`  | `toAgentRate`               | decimal(20,10)            | YES      | New                                                              |
| `RecurringFlow`| `presentationAmount`        | decimal(12,2)             | YES      | **Renamed** from `baseAmount`                                    |
| `RecurringFlow`| `presentationRate`          | decimal(20,10)            | YES      | **Renamed** from `rateUsed`                                      |
| `RecurringFlow`| `fromAgentAmount`           | decimal(12,2)             | YES      | New                                                              |
| `RecurringFlow`| `fromAgentRate`             | decimal(20,10)            | YES      | New                                                              |
| `RecurringFlow`| `toAgentAmount`             | decimal(12,2)             | YES      | New                                                              |
| `RecurringFlow`| `toAgentRate`               | decimal(20,10)            | YES      | New                                                              |

`system_settings` row with `key = 'base_value_id'` is renamed to `key = 'presentation_currency_id'` (data migration; value column unchanged).

### 2.2 Validation (Zod schemas in `@marketlum/shared`)

- `agent.schema.ts`
  - `createAgentSchema.functionalCurrencyId`: `z.string().uuid()` **required**
  - `updateAgentSchema.functionalCurrencyId`: `z.string().uuid().optional()` (partial update; service validates Value.type='currency' when present)
- `value-stream.schema.ts`
  - `createValueStreamSchema.agentId`: `z.string().uuid().nullable().optional()`
  - `updateValueStreamSchema.agentId`: same
- `invoice.schema.ts` / `recurring-flow.schema.ts`
  - Response shapes add `presentationAmount`, `presentationRate`, `fromAgentAmount`, `fromAgentRate`, `toAgentAmount`, `toAgentRate` (all `z.string().nullable()`)
  - Response totals add `presentationTotal: z.string().nullable()` (sum of `presentationAmount` only when **all** items have non-NULL snapshot, mirroring today's `baseTotal` behaviour)
- `exchange-rate.schema.ts`
  - Rename `updateBaseValueSchema` → `updatePresentationCurrencySchema`
  - Rename `systemSettingsBaseValueResponseSchema` → `systemSettingsPresentationCurrencyResponseSchema`
  - Keep `baseValueId` field names? **No** — rename to `presentationCurrencyId` for consistency

### 2.3 Service-layer invariants

- When `agent.functional_currency_id` is set, the service must verify the referenced `Value` has `type = 'currency'`. Throws `BadRequestException` if not.
- When `value_stream.agentId` is set, the service must verify the referenced `Agent` exists. (FK does this; no extra check needed.)
- `SystemSettingsService.setPresentationCurrency()` (renamed from `setBaseValue`) keeps the snapshot-lock guard: refuses to change if any row in `invoice_items` or `recurring_flows` has a non-NULL `presentationAmount`.

---

## 3. Snapshot write paths

### 3.1 Algorithm (applied identically on invoice item and recurring flow saves)

```
on row save (create or update):
  business_date = invoice.issuedAt  OR  recurring_flow.startDate
  source_currency = invoice.currencyId  OR  recurring_flow.currencyId

  # presentation perspective
  presentation_currency = systemSettings.getPresentationCurrencyId()
  if source_currency == presentation_currency:
    presentationRate = "1.0000000000"
    presentationAmount = base_row_amount
  elif rate = exchangeRates.lookup(source_currency, presentation_currency, business_date):
    presentationRate = rate
    presentationAmount = convertAmount(base_row_amount, rate)
  else:
    presentationRate = NULL
    presentationAmount = NULL

  # from-agent perspective
  from_agent_currency = resolveAgentCurrency(fromAgentId)   # may be NULL
  if from_agent_currency is NULL:
    fromAgentRate = NULL; fromAgentAmount = NULL
  elif source_currency == from_agent_currency:
    fromAgentRate = "1.0000000000"; fromAgentAmount = base_row_amount
  elif rate = exchangeRates.lookup(source_currency, from_agent_currency, business_date):
    fromAgentRate = rate; fromAgentAmount = convertAmount(base_row_amount, rate)
  else:
    fromAgentRate = NULL; fromAgentAmount = NULL

  # to-agent perspective — same as from with toAgentId

  persist row with all 6 snapshot columns
```

For an `InvoiceItem`, `base_row_amount = quantity * unitPrice = total`. For a `RecurringFlow`, `base_row_amount = amount`.

For recurring flows, `fromAgentId` and `toAgentId` are resolved at write time from `(direction, counterpartyAgentId, valueStream.agentId)` per the table in §1. They are not persisted to `recurring_flows` as columns — only the resulting snapshot amounts are.

### 3.2 Lazy re-snapshot

The snapshot algorithm runs on **every** call to `service.save()` (insert or update), unconditionally. There is no diff check. Rows whose snapshot columns are `NULL` because of pre-migration data will be re-snapshotted the first time they are touched after migration. No admin "re-snapshot all" endpoint in this spec.

### 3.3 Agent functional-currency change

When `PUT /api/agents/:id` changes `functional_currency_id`:

- Existing rows referencing this agent are **not** re-snapshotted; they remain locked in the previous functional currency (correct accounting).
- The agent edit form shows an inline yellow warning banner above the form (rendered when the form detects the field has been changed from the loaded value and `affectedRowCount > 0`):

  > **Heads up.** Changing functional currency affects new invoices and recurring flows only. *X* invoice items and *Y* recurring flow rows referencing {Agent} stay recorded in {oldCurrency}.

  The counts come from a new endpoint `GET /api/agents/:id/snapshot-references` (see §4.2).

---

## 4. API surface

### 4.1 Agents

- `POST /api/agents` — body adds `functionalCurrencyId: uuid` (**required**).
- `PUT /api/agents/:id` — body accepts `functionalCurrencyId: uuid | null`.
- `GET /api/agents/:id` — response adds `functionalCurrency: ValueSummary | null` and `functionalCurrencyId: uuid | null`.
- **NEW** `GET /api/agents/:id/snapshot-references` — returns `{ invoiceItems: number, recurringFlows: number }`, counts of rows that have a non-NULL `*AgentAmount` snapshot referencing this agent in either `fromAgent` or `toAgent` perspective. Used by the warning banner.

### 4.2 Value streams

- `POST /api/value-streams` — body adds `agentId: uuid | null`.
- `PUT /api/value-streams/:id` — same.
- `GET /api/value-streams/:id` — response adds `agent: AgentSummary | null` and `agentId: uuid | null`.

### 4.3 Invoices

- `GET /api/invoices` / `:id` — response items add the six new snapshot fields; invoice-level response adds `presentationTotal: string | null` (replaces `baseTotal`).
- No new endpoints; write paths are unchanged externally, only the response shape grows.

### 4.4 Recurring flows

- Same shape as invoices: response includes six snapshot fields per row plus `presentationAmount`/`presentationRate` (renamed from `baseAmount`/`rateUsed`).
- The from/to mapping is computed server-side per §1 and exposed only via the resulting `*AgentAmount` columns (no `fromAgentId`/`toAgentId` columns added to `recurring_flows`).

### 4.5 System settings

- **Renamed:** `GET /api/system-settings/base-value` → `GET /api/system-settings/presentation-currency`.
- **Renamed:** `PUT /api/system-settings/base-value` → `PUT /api/system-settings/presentation-currency`. Body: `{ presentationCurrencyId: uuid | null }`. Returns 409 if snapshots reference the current presentation currency.

### 4.6 Dashboard

- `GET /api/dashboard/time-series` — response gains a `notConvertedCount: number` field representing rows with `presentationAmount = NULL`. Aggregation switches from `SUM(invoice_items.total)` to `SUM(invoice_items.presentationAmount)` with `WHERE presentationAmount IS NOT NULL`.

### 4.7 Export

- `GET /api/invoices/export.csv` — column header `baseTotal` becomes `presentationTotal` with no value-format change. Column count stays the same.

### 4.8 Permissions

All new and changed endpoints use the existing `AdminGuard` (`packages/core/src/auth/guards/admin.guard.ts`) at the controller level. No per-agent ownership scoping in this spec.

---

## 5. Domain helpers (`@marketlum/shared`)

Add to `packages/shared/src/helpers/exchange-rate.helpers.ts` (or split into a new `snapshot.helpers.ts`):

```ts
export type RecurringFlowDirection = 'INCOMING' | 'OUTGOING';

export interface AgentSnapshotMapping {
  fromAgentId: string | null;
  toAgentId: string | null;
}

/**
 * Maps a recurring flow's direction + counterparty + value-stream agent to
 * the from/to agent perspective used by snapshot columns.
 */
export function mapRecurringFlowAgents(
  direction: RecurringFlowDirection,
  counterpartyAgentId: string,
  valueStreamAgentId: string | null,
): AgentSnapshotMapping {
  return direction === 'INCOMING'
    ? { fromAgentId: counterpartyAgentId, toAgentId: valueStreamAgentId }
    : { fromAgentId: valueStreamAgentId, toAgentId: counterpartyAgentId };
}

/** True when source == target so rate is 1 and no lookup is needed. */
export function isIdentityConversion(
  sourceCurrencyId: string | null | undefined,
  targetCurrencyId: string | null | undefined,
): boolean {
  return !!sourceCurrencyId && sourceCurrencyId === targetCurrencyId;
}

/** Identity rate constant for snapshots where source == target. */
export const IDENTITY_RATE = '1.0000000000';
```

Existing helpers `canonicaliseRate`, `invertRate`, `convertAmount`, `formatRate`, `formatBaseAmount` (rename → `formatPresentationAmount`) stay; constants `EXCHANGE_RATE_PRECISION = 10`, `BASE_AMOUNT_PRECISION = 2` are renamed to `PRESENTATION_AMOUNT_PRECISION`.

---

## 6. Database — migration outline

Single migration file: `packages/core/src/migrations/1700000000050-AddFunctionalCurrency.ts` (next available ordinal after `1700000000045`).

### 6.1 Operations (in order)

```sql
-- 1. Rename system_settings key
UPDATE system_settings
SET key = 'presentation_currency_id', "updatedAt" = NOW()
WHERE key = 'base_value_id';

-- 2. Add agents.functional_currency_id (nullable, no backfill)
ALTER TABLE agents
  ADD COLUMN "functionalCurrencyId" uuid NULL,
  ADD CONSTRAINT fk_agents_functional_currency
    FOREIGN KEY ("functionalCurrencyId") REFERENCES values(id) ON DELETE RESTRICT;
CREATE INDEX idx_agents_functional_currency ON agents("functionalCurrencyId");

-- 3. Add value_streams.agentId (nullable, no backfill)
ALTER TABLE value_streams
  ADD COLUMN "agentId" uuid NULL,
  ADD CONSTRAINT fk_value_streams_agent
    FOREIGN KEY ("agentId") REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX idx_value_streams_agent ON value_streams("agentId");

-- 4. invoice_items: rename + add
ALTER TABLE invoice_items
  RENAME COLUMN "baseAmount" TO "presentationAmount";
ALTER TABLE invoice_items
  RENAME COLUMN "rateUsed" TO "presentationRate";
ALTER TABLE invoice_items
  ADD COLUMN "fromAgentAmount" numeric(12,2) NULL,
  ADD COLUMN "fromAgentRate"   numeric(20,10) NULL,
  ADD COLUMN "toAgentAmount"   numeric(12,2) NULL,
  ADD COLUMN "toAgentRate"     numeric(20,10) NULL;

-- 5. recurring_flows: same shape
ALTER TABLE recurring_flows
  RENAME COLUMN "baseAmount" TO "presentationAmount";
ALTER TABLE recurring_flows
  RENAME COLUMN "rateUsed" TO "presentationRate";
ALTER TABLE recurring_flows
  ADD COLUMN "fromAgentAmount" numeric(12,2) NULL,
  ADD COLUMN "fromAgentRate"   numeric(20,10) NULL,
  ADD COLUMN "toAgentAmount"   numeric(12,2) NULL,
  ADD COLUMN "toAgentRate"     numeric(20,10) NULL;
```

### 6.2 Down migration

Reverses the above. The four new snapshot columns are dropped; renames revert (`presentationAmount` → `baseAmount`, etc.); the `system_settings` key reverts to `base_value_id`. Agent and value-stream FKs and indexes are dropped.

### 6.3 Referential integrity rules

- `agents.functional_currency_id` → `values(id)` ON DELETE **RESTRICT** (mirrors invoice.currencyId).
- `value_streams.agentId` → `agents(id)` ON DELETE **SET NULL** (a value stream can outlive its owning agent without losing data).

---

## 7. Backend module layout

### 7.1 Files touched

```
packages/core/src/
├── agents/
│   ├── agents.controller.ts        + GET :id/snapshot-references
│   ├── agents.service.ts           + functional currency validation, change-detection helper
│   ├── agent.dto.ts                + functionalCurrencyId on create/update
│   └── entities/agent.entity.ts    + functionalCurrencyId column + ManyToOne
├── value-streams/
│   ├── value-streams.controller.ts (no new endpoints; expanded payloads)
│   ├── value-streams.service.ts    + agentId handling
│   ├── value-stream.dto.ts         + agentId
│   └── entities/value-stream.entity.ts  + agentId column + ManyToOne
├── invoices/
│   ├── invoices.service.ts         rewrite of snapshot() to capture 3 perspectives
│   └── entities/invoice-item.entity.ts  rename baseAmount/rateUsed, add 4 new columns
├── recurring-flows/
│   ├── recurring-flows.service.ts  rewrite of snapshot(); uses mapRecurringFlowAgents
│   ├── budget.service.ts           switch from baseAmount → presentationAmount
│   └── entities/recurring-flow.entity.ts  same renames + new columns
├── system-settings/
│   ├── system-settings.service.ts  rename methods; keep snapshot-lock guard
│   ├── system-settings.controller.ts  rename endpoints
│   └── system-setting.dto.ts       rename DTOs
├── dashboard/
│   └── dashboard.service.ts        rewrite queryTimeSeries; add notConvertedCount
├── exchange-rates/
│   └── (unchanged — lookup signature already supports arbitrary pairs)
└── migrations/
    └── 1700000000050-AddFunctionalCurrency.ts (new)
```

### 7.2 Shared package additions

```
packages/shared/src/
├── helpers/
│   ├── exchange-rate.helpers.ts        rename formatBaseAmount → formatPresentationAmount;
│   │                                    rename BASE_AMOUNT_PRECISION → PRESENTATION_AMOUNT_PRECISION
│   └── snapshot.helpers.ts (new)       mapRecurringFlowAgents, isIdentityConversion, IDENTITY_RATE
├── schemas/
│   ├── agent.schema.ts                 + functionalCurrencyId fields
│   ├── value-stream.schema.ts          + agentId fields
│   ├── invoice.schema.ts               + 6 new fields per item; rename baseTotal → presentationTotal
│   ├── recurring-flow.schema.ts        + 6 new fields; rename baseAmount/rateUsed in response
│   └── exchange-rate.schema.ts         rename baseValue → presentationCurrency schemas
```

After modifying the shared package, rebuild it once before running API tests: `pnpm --filter @marketlum/shared build` (project gotcha from memory).

### 7.3 UI package additions

```
packages/ui/src/
├── components/
│   ├── agents/
│   │   ├── agent-form.tsx              + functional currency combobox after `purpose`;
│   │   │                                 + inline warning banner when changed AND affectedRowCount > 0
│   │   ├── functional-currency-card.tsx (new, read-only summary on detail page)
│   │   └── columns.tsx                 (no change — list view doesn't show currency)
│   ├── value-streams/
│   │   └── value-stream-form.tsx       + agent combobox after `lead`
│   ├── invoices/
│   │   ├── columns.tsx                 swap baseTotal column → presentationTotal column
│   │   ├── invoice-detail.tsx          + three subtotal rows in totals block (hide identical)
│   │   └── snapshot-badge.tsx (new)    yellow warning badge for NULL snapshot cells
│   ├── recurring-flows/
│   │   ├── columns.tsx                 swap baseAmount column → presentationAmount column
│   │   └── recurring-flow-detail.tsx   + same three-subtotal pattern
│   ├── dashboard/
│   │   └── time-series-chart.tsx       + "X items not converted" warning chip
│   └── system-settings/
│       └── presentation-currency-form.tsx (renamed from base-value-form.tsx)
```

### 7.4 Web app wiring

Pages under `apps/web/src/app/admin/`:

- `agents/[id]/page.tsx` — uses updated `AgentForm` + `FunctionalCurrencyCard`.
- `value-streams/[id]/page.tsx` — uses updated `ValueStreamForm`.
- `invoices/page.tsx` and `invoices/[id]/page.tsx` — use updated columns + detail.
- `recurring-flows/page.tsx` and `recurring-flows/[id]/page.tsx` — use updated columns + detail.
- `dashboard/page.tsx` — renders the new warning chip when `notConvertedCount > 0`.
- `system-settings/page.tsx` — labels renamed to "Presentation currency."

**Template sync (per `CLAUDE.md`):** every page above must be mirrored to `packages/create-marketlum-app/template/apps/web/src/app/admin/...`. The corresponding `packages/create-marketlum-app/template/apps/api/src/...` source files must mirror the API changes (entities, services, controllers, migrations, DTOs).

---

## 8. UI mockups

### 8.1 Agent edit form (relevant section)

```
┌──────────────────────────────────────────────────────────┐
│ Edit agent                                               │
├──────────────────────────────────────────────────────────┤
│ Name              [ Acme GmbH                          ] │
│ Type              ( Organisation ▾ )                     │
│ Purpose           [ Vendor relationships                ] │
│ Functional        [ EUR — Euro                        ▾] │ ← new
│   currency                                               │
│ Main taxonomy     ( Vendors ▾ )                          │
│ Image             [ … ]                                  │
└──────────────────────────────────────────────────────────┘

When the user changes the value:

┌──────────────────────────────────────────────────────────┐
│ ⚠ Heads up. Changing functional currency affects new     │
│   invoices and recurring flows only. 12 invoice items    │
│   and 3 recurring-flow rows referencing Acme GmbH stay   │
│   recorded in USD.                                       │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Invoice detail — totals block

```
┌────────────────────────────────────────────────────┐
│ Items                                              │
│ ...                                                │
│                                                    │
│ Total                            €1,250.00         │  invoice currency
│ In Acme GmbH's books (EUR)       €1,250.00         │  hidden (= invoice currency)
│ In Globex Corp's books (USD)     $1,360.00         │  to-agent perspective
│ In presentation currency (USD)   $1,360.00         │  system presentation
└────────────────────────────────────────────────────┘

Identical-currency rows are hidden to reduce noise.
```

### 8.3 Snapshot NULL badge

In list views, a missing `presentationAmount` renders as a yellow pill:

```
│ INV-0042  │ Acme GmbH → Globex  │ €1,250.00 │ ⚠ no rate   │
```

Tooltip on hover: `"No rate from EUR to USD on 2026-04-15."`

### 8.4 Agent detail — functional currency card (read-only)

```
┌────────────────────────────┐
│ Functional currency        │
│ ────────────────────────── │
│ EUR — Euro                 │
└────────────────────────────┘
```

---

## 9. Seed data

`packages/core/src/commands/seeders/sample-data.seeder.ts` (invoked by `pnpm seed:sample`):

- Ensure at least two seeded `Value` rows with `type='currency'`: `USD`, `EUR` (already present).
- Assign distinct functional currencies on seed:
  - Agent `Acme GmbH` → `EUR`
  - Agent `Globex Corp` → `USD`
  - Any "internal" agent → presentation currency (USD by default).
- Seed at least one cross-currency invoice (Acme → Globex, currency `EUR`) so that the snapshot machinery is exercised on every fresh sample database.
- Seed an `ExchangeRate` row for `EUR ↔ USD` at the seed-data reference date so cross-currency snapshots resolve cleanly.

---

## 10. BDD coverage

All step definitions live under `apps/api/test/` matching the existing convention. Feature files under `packages/bdd/features/`.

| Feature file                                                  | Scenarios | Notes                                                                                   |
|---------------------------------------------------------------|----------:|-----------------------------------------------------------------------------------------|
| `packages/bdd/features/agents/functional-currency.feature`    | ~6        | Create with currency; update to new currency; null on existing agent; reject non-currency Value; GET snapshot-references; warning banner trigger |
| `packages/bdd/features/value-streams/agent-owner.feature`     | ~4        | Set agent on stream; unset; child does not inherit from parent; null on save           |
| `packages/bdd/features/invoices/snapshot-per-agent.feature`   | ~8        | Three perspectives populated; identical-currency identity rate; no-rate yields NULL; NULL functional currency yields NULL agent snapshot; cross-currency invoice; lazy re-snapshot on update; presentationTotal sum behaviour |
| `packages/bdd/features/recurring-flows/snapshot-per-agent.feature` | ~8   | Same shape as invoices; INCOMING vs OUTGOING direction mapping verified; value-stream agent NULL leaves vsAgent-side NULL |
| `packages/bdd/features/system-settings/presentation-currency.feature` | ~4  | Get current; set when no snapshots exist; reject set when snapshots exist; key rename invariant |
| `packages/bdd/features/dashboard/presentation-currency.feature` | ~3      | Sum uses presentationAmount; NULL rows excluded; notConvertedCount surfaced            |
| **Total**                                                     | **~33**   | Updates to existing snapshot scenarios in invoices/recurring-flows expected on top      |

Update memory file `MEMORY.md` post-merge to reflect the new total in the `pnpm test:e2e` line.

---

## 11. Out of scope

Carried explicitly from the locked decisions and the brainstorming rounds:

- **Multi-currency ledger / FX revaluation on accounts and transactions** (R1Q7). Accounts remain single-currency-per-account; transactions inherit from accounts.
- **FX gain/loss recognition on invoice settlement** (R1 locked-decisions block).
- **Per-user presentation currency** (R1 locked-decisions block).
- **Per-agent dashboard view** (R3Q7) — agent detail page gets only a read-only functional-currency card.
- **Admin "re-snapshot all" endpoint** (R2Q8) — lazy re-snapshot on next save is sufficient.
- **Specific `agent.functional_currency_changed` domain event** (R4Q5) — generic `marketlum.agent.updated` is enough.
- **CSV export columns beyond renaming** (R4Q6) — `baseTotal` becomes `presentationTotal`; no new from/to columns.

---

## 12. Delivery plan (single PR)

Ordered list of work inside the single PR (R4Q8):

1. **Migration** — write `1700000000050-AddFunctionalCurrency.ts` (up + down). Run `pnpm migration:run` locally; verify schema with `\d agents`, `\d value_streams`, `\d invoice_items`, `\d recurring_flows`.
2. **Shared package** — update Zod schemas, helpers, constants. Rebuild: `pnpm --filter @marketlum/shared build`.
3. **Entities** — update TypeORM entities to match new columns and FKs.
4. **System settings** — rename methods, endpoints, DTOs; keep snapshot-lock guard.
5. **Agents service + controller** — add functional currency handling, validation that referenced Value has `type='currency'`, snapshot-references endpoint.
6. **Value streams service + controller** — add `agentId` handling.
7. **Snapshot logic** — rewrite `InvoicesService.snapshot()` and `RecurringFlowsService.snapshot()` per §3.1.
8. **Aggregations** — update `DashboardService.queryTimeSeries`, `RecurringFlowsBudgetService` to use `presentationAmount`; add `notConvertedCount` to dashboard.
9. **CSV export** — rename header.
10. **BDD features + step definitions** — add the ~33 new scenarios; update any existing scenarios that reference `baseAmount`/`baseTotal`.
11. **UI package** — update forms, columns, detail pages, snapshot badge, warning banner, functional-currency card, presentation-currency settings.
12. **Web app wiring** — wire new components into admin pages.
13. **Template sync** — mirror all `apps/api/` and `apps/web/` changes into `packages/create-marketlum-app/template/` (mandatory per `CLAUDE.md`).
14. **Seed data** — update sample seeder per §9.
15. **Final checks** — `pnpm test:e2e` (expect ~703 passing total: existing 670 + ~33 new), `pnpm --filter @marketlum/api build`, `pnpm --filter @marketlum/web build`. Update `MEMORY.md` with new scenario count.

End state: a single PR titled "Add per-agent functional currency" containing schema, services, snapshots, aggregations, UI, tests, seeds, and template mirror.
