# Exchange Rates Between Values — Specification

> **Status:** Approved (brainstormed in `002-exchange-rates-brainstorming.md`)
> **Target delivery:** Two PRs &mdash; (1) `ExchangeRate` CRUD + admin page + `system_settings`; (2) snapshot wiring on `Invoice` / `InvoiceItem` and `RecurringFlow`.
> **Scope:** Multi-value conversion via dated rates, with `Invoice`/`InvoiceItem` and `RecurringFlow` snapshotting against a configurable system base value. `ExchangeFlow` and ledger `Transaction` are explicitly **out of scope**.

---

## 1. Overview

Marketlum gains a first-class way to model the conversion rate between any two `Value` entities (currency↔currency, service↔currency, product↔currency, &hellip;).

- `ExchangeRate` is a dated, symmetric mapping between two `Value` rows.
- A single configurable system base `Value` defines the reporting currency.
- When an `InvoiceItem` or `RecurringFlow` is created or its monetary fields edited, the active rate is resolved and the **converted base amount is snapshotted** onto the row.
- Snapshots are frozen against the base that was active at write time; the system base cannot be changed while any snapshots exist (admin must run an explicit &ldquo;reset snapshots&rdquo; action first).

```
       ┌──────────────────────────────┐
       │            Value             │
       │  (USD, EUR, hour-of-consult) │
       └─────┬──────────────────┬─────┘
             │ fromValue        │ toValue
             ▼                  ▼
       ┌────────────────────────────────┐
       │         ExchangeRate           │
       │  rate         decimal(20, 10)  │
       │  effectiveAt  timestamp        │
       │  source       text             │
       └────────────────────────────────┘
                      │
                      │ resolved at write time
                      ▼
   ┌─────────────────────────────────────┐
   │  InvoiceItem  /  RecurringFlow      │
   │     rateUsed     decimal(20, 10)    │
   │     baseAmount   decimal(12, 2)     │
   └─────────────────────────────────────┘

  Conversion:  baseAmount = nativeAmount × rateUsed
  System base: chosen via system_settings.base_value_id
```

---

## 2. Domain Model

### 2.1 `ExchangeRate` entity

Table: `exchange_rates`. **All inserts are normalised into canonical order** `(fromValueId < toValueId)` &mdash; see §4.1.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Primary key |
| `fromValueId` | uuid | yes | FK → `values.id`, `ON DELETE RESTRICT`; canonical lower-id of the pair |
| `toValueId` | uuid | yes | FK → `values.id`, `ON DELETE RESTRICT`; canonical higher-id of the pair |
| `rate` | decimal(20, 10) | yes | Multiplier: `amount(toValue) = amount(fromValue) × rate` |
| `effectiveAt` | timestamp | yes | Instant from which this row is the active rate for the pair |
| `source` | text | no | Free-form label (`ECB`, `Manual`, `Stripe 2026-05-13`, &hellip;) |
| `createdAt` | timestamp | yes | TypeORM `@CreateDateColumn` |
| `updatedAt` | timestamp | yes | TypeORM `@UpdateDateColumn` |

Constraints:

- **CHECK** `from_value_id < to_value_id` (canonical ordering, enforced at DB level).
- **CHECK** `rate > 0`.
- **UNIQUE** `(from_value_id, to_value_id, effective_at)`.
- **INDEX** `(from_value_id, to_value_id, effective_at DESC)` &mdash; supports `getRateAt(pair, T)`.

### 2.2 `SystemSetting` entity

Table: `system_settings`. New generic key/value table; this feature introduces the first key (`base_value_id`) but the table is designed to accept future settings.

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | varchar(64) | yes | Primary key |
| `value` | text | yes | Serialised value; for `base_value_id` this is a UUID string |
| `updatedAt` | timestamp | yes | TypeORM `@UpdateDateColumn` |

Initial seed (idempotent): no row by default; `seed-sample.command.ts` writes `base_value_id` &rarr; the seeded USD `Value.id` (see §12).

### 2.3 Snapshot columns added to existing entities

Added to **both** `invoice_items` and `recurring_flows`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `rateUsed` | decimal(20, 10) | no (nullable) | Rate factor active when the row was last written; `NULL` if no rate existed for the pair |
| `baseAmount` | decimal(12, 2) | no (nullable) | Converted amount in the system base value; `NULL` if `rateUsed` is `NULL` |

Notes:

- No `baseValueId` per row (Q3.2). The pinning to a specific base is enforced globally by §3.3.
- No `rateEffectiveAt` per row; `(updatedAt, ExchangeRate.effectiveAt)` history is enough to reconstruct.
- Already-existing rows (created before this feature) start with both columns `NULL`. They are filled the next time the row is saved (see §3.5).

### 2.4 No changes to other entities

- `ExchangeFlow` &mdash; **untouched** (out of scope per Q3.3).
- `Transaction` &mdash; **untouched** (out of scope per Q3.3).
- `Value`, `ValueInstance`, `ValueStream`, `Agent`, `Offering`, `Agreement`, `Channel`, `Pipeline`, `Tension` &mdash; untouched.

---

## 3. Domain Rules

### 3.1 Canonical pair ordering (Q2.1)

`ExchangeRate` is stored symmetrically. The service-layer rule on **insert/update**:

```ts
function canonicalise(input: { fromValueId: string; toValueId: string; rate: string }) {
  if (input.fromValueId < input.toValueId) return input;
  return {
    fromValueId: input.toValueId,
    toValueId: input.fromValueId,
    rate: invert(input.rate), // 1 / rate, rounded to 10 fractional digits
  };
}
```

Reads via `getRateAt(a, b, at)` accept either direction:

```ts
function getRateAt(a: Value, b: Value, at: Date): { rate: Decimal; row: ExchangeRate } | null {
  const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  const row = await repo.findOne({
    where: { fromValueId: lo, toValueId: hi, effectiveAt: LessThanOrEqual(at) },
    order: { effectiveAt: 'DESC' },
  });
  if (!row) return null;
  return a.id === lo ? { rate: row.rate, row } : { rate: invert(row.rate), row };
}
```

### 3.2 Lookup semantics

- `getRateAt(a, a, _)` &mdash; rejected at validation (self-pair forbidden); never reaches the lookup.
- `getRateAt(a, b, T)` with no row `<= T` &mdash; returns `null` (Q2.7). Callers decide how to render (`NULL` snapshot, &ldquo;no rate&rdquo; UI badge).
- **No transitive lookup** (Q2.8). If `USD↔EUR` and `EUR↔GBP` exist but `USD↔GBP` does not, `convert(100 USD → GBP)` returns `null`.

### 3.3 System base value

- Stored in `system_settings.base_value_id` (Q4.2). Typed as `string | null` in the API (`null` means &ldquo;no base configured&rdquo;).
- When `null`, snapshot wiring (§3.5) writes `NULL` to `rateUsed` and `baseAmount`.
- **Changing the base is blocked while any snapshot row exists** (Q4.1). The admin must call `POST /system-settings/base-value/reset-snapshots` first; that nulls out `rateUsed`/`baseAmount` on all `invoice_items` and `recurring_flows` and only then can the base be changed.

### 3.4 Conversion helper

Pure function in `@marketlum/shared`:

```ts
export function convert(
  amount: Decimal,
  rate: Decimal,
): Decimal {
  return amount.mul(rate).toDecimalPlaces(2, ROUND_HALF_UP);
}
```

Caller is responsible for resolving `rate` via the API or repo (helper is dumb on purpose).

### 3.5 Snapshot wiring

Applies to `InvoiceItem` and `RecurringFlow`. Triggered on:

- **Create** &mdash; always resolve and snapshot.
- **Update** &mdash; re-snapshot **only** when a monetary field changed:
  - `InvoiceItem`: change to `valueId`, `valueInstanceId`, `quantity`, `unitPrice`, or `total`, **or** parent `Invoice.currencyId`.
  - `RecurringFlow`: change to `valueId`, `amount`, or `unit`.
  - Pure metadata edits (description, name, taxonomies, &hellip;) do **not** re-snapshot.

Snapshot algorithm:

```ts
async function snapshot(
  nativeValueId: string,
  nativeAmount: Decimal,
  at: Date = new Date(),
): Promise<{ rateUsed: string | null; baseAmount: string | null }> {
  const baseValueId = await systemSettings.getBaseValueId();
  if (!baseValueId) return { rateUsed: null, baseAmount: null };
  if (nativeValueId === baseValueId) return { rateUsed: '1.0000000000', baseAmount: nativeAmount.toFixed(2) };
  const lookup = await exchangeRates.getRateAt(nativeValueId, baseValueId, at);
  if (!lookup) return { rateUsed: null, baseAmount: null };
  return {
    rateUsed: lookup.rate.toFixed(10),
    baseAmount: convert(nativeAmount, lookup.rate).toFixed(2),
  };
}
```

For `InvoiceItem`, `nativeValueId` is the invoice&apos;s `currencyId` (line items don&apos;t have their own currency), and `nativeAmount` is `total`. For `RecurringFlow`, `nativeValueId` is the optional `valueId` &mdash; if missing, both snapshot columns stay `NULL`.

### 3.6 Backfill (Q3.6)

No automatic backfill, no admin endpoint. To refresh stale `NULL` snapshots, the admin opens the row in the UI and saves it again (triggering the re-snapshot rule in §3.5).

---

## 4. Zod Validation Schemas

All schemas live in `packages/shared/src/schemas/exchange-rate.schema.ts` (single source of truth per project convention).

### 4.1 `createExchangeRateSchema`

```ts
export const createExchangeRateSchema = z.object({
  fromValueId: z.string().uuid(),
  toValueId: z.string().uuid(),
  rate: z.string().regex(/^\d+(\.\d{1,10})?$/, 'Up to 10 fractional digits'),
  effectiveAt: z.string().datetime(),
  source: z.string().max(255).nullable().optional(),
}).refine(
  (data) => data.fromValueId !== data.toValueId,
  { message: 'fromValueId and toValueId must differ', path: ['toValueId'] },
).refine(
  (data) => parseFloat(data.rate) > 0,
  { message: 'rate must be > 0', path: ['rate'] },
);
```

### 4.2 `updateExchangeRateSchema`

Same as create but every field optional; same two `.refine()` guards remain conditional on the relevant fields being present.

### 4.3 `exchangeRateResponseSchema`

```ts
export const exchangeRateResponseSchema = z.object({
  id: z.string().uuid(),
  fromValue: valueSummarySchema,
  toValue: valueSummarySchema,
  rate: z.string(),
  effectiveAt: z.string(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

`valueSummarySchema` is the existing `{ id, name, type }` shape reused from `exchange.schema.ts`.

### 4.4 System-settings schemas

```ts
export const updateBaseValueSchema = z.object({
  baseValueId: z.string().uuid().nullable(),
});

export const systemSettingsResponseSchema = z.object({
  baseValueId: z.string().uuid().nullable(),
  baseValue: valueSummarySchema.nullable(),
  snapshotsExist: z.boolean(),
});
```

### 4.5 New snapshot fields in existing response schemas

Add (nullable) `rateUsed` and `baseAmount` to:

- `invoiceItemResponseSchema` &mdash; `packages/shared/src/schemas/invoice.schema.ts`.
- `recurringFlowResponseSchema` &mdash; `packages/shared/src/schemas/recurring-flow.schema.ts`.

Plus a top-level `invoiceResponseSchema.baseTotal` (`string | null`) summing the line-item `baseAmount`s for convenience.

---

## 5. API Surface

All endpoints require `AdminGuard` (mirrors `OfferingsController`, `LocalesController`, &hellip;).

### 5.1 Exchange rates (PR 1)

| Method | Path | Purpose |
|---|---|---|
| `POST`   | `/exchange-rates`           | Create a rate. Body validates against `createExchangeRateSchema`. Canonicalises before write (§3.1). |
| `GET`    | `/exchange-rates`           | List with pagination. Query: `fromValueId?`, `toValueId?`, `at?` (ISO date), `page`, `pageSize`, `sort=effectiveAt:DESC` (default). When both `fromValueId` and `toValueId` are present, returns only that pair (in either direction). |
| `GET`    | `/exchange-rates/:id`       | Get one. |
| `PATCH`  | `/exchange-rates/:id`       | Update. Re-canonicalises on changes to either value id. |
| `DELETE` | `/exchange-rates/:id`       | Hard delete. |
| `GET`    | `/exchange-rates/lookup`    | `?fromValueId=&toValueId=&at=` &rarr; `{ rate, sourceRowId, effectiveAt } \| null`. Used by the conversion preview (§7.4). |

### 5.2 System settings (PR 1)

| Method | Path | Purpose |
|---|---|---|
| `GET`   | `/system-settings/base-value`               | Returns `{ baseValueId, baseValue, snapshotsExist }`. |
| `PUT`   | `/system-settings/base-value`               | Body `{ baseValueId }`. **Rejects with 409** if `snapshotsExist`. |
| `POST`  | `/system-settings/base-value/reset-snapshots` | Nulls `rateUsed` / `baseAmount` on all `invoice_items` and `recurring_flows`. Response: `{ invoiceItems: number, recurringFlows: number }`. |

### 5.3 No new endpoints on invoices / recurring-flows (PR 2)

Existing endpoints keep their paths and shapes. The snapshot is filled by the service layer; response payloads gain the new `rateUsed`/`baseAmount` fields and (for invoices) a `baseTotal`.

---

## 6. Database

### 6.1 Migration `M-add-exchange-rates` (PR 1)

```sql
CREATE TABLE exchange_rates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_value_id uuid NOT NULL REFERENCES values(id) ON DELETE RESTRICT,
  to_value_id   uuid NOT NULL REFERENCES values(id) ON DELETE RESTRICT,
  rate          numeric(20, 10) NOT NULL,
  effective_at  timestamp NOT NULL,
  source        text,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_canonical_order CHECK (from_value_id < to_value_id),
  CONSTRAINT exchange_rates_rate_positive   CHECK (rate > 0),
  CONSTRAINT exchange_rates_unique          UNIQUE (from_value_id, to_value_id, effective_at)
);

CREATE INDEX exchange_rates_lookup_idx
  ON exchange_rates (from_value_id, to_value_id, effective_at DESC);

CREATE TABLE system_settings (
  key        varchar(64) PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
```

### 6.2 Migration `M-add-rate-snapshots` (PR 2)

```sql
ALTER TABLE invoice_items
  ADD COLUMN rate_used   numeric(20, 10),
  ADD COLUMN base_amount numeric(12, 2);

ALTER TABLE recurring_flows
  ADD COLUMN rate_used   numeric(20, 10),
  ADD COLUMN base_amount numeric(12, 2);
```

No `NOT NULL`, no defaults &mdash; pre-existing rows legitimately have no snapshot.

### 6.3 Referential integrity

- `exchange_rates.from_value_id` / `to_value_id` &mdash; `ON DELETE RESTRICT`. A `Value` referenced by any rate cannot be deleted; the admin must delete rates first. This is intentional &mdash; deleting a value that&apos;s in a rate history would silently invalidate historical snapshots.
- The system base `Value` (read from `system_settings.base_value_id`) is **not** FK-protected at the DB level (since the setting is in a key/value table); the service-layer `PUT /system-settings/base-value` validates the UUID resolves to an existing `Value`.

---

## 7. UI / UX

Per Q4.3, exchange rates get a top-level admin entry. The brainstorming file holds the full ASCII mockups; relevant components:

### 7.1 `/admin/exchange-rates` (list, PR 1)

- TanStack-table list, paginated, default sort `effectiveAt DESC`.
- Top of page: **system base value** picker (`Select` of `Value` rows). Save is disabled and shows a banner &ldquo;Snapshots exist &mdash; click &lsquo;Reset snapshots&rsquo; to enable changes&rdquo; when `snapshotsExist` is true. A red destructive button next to it triggers `POST /system-settings/base-value/reset-snapshots` (with confirmation dialog).
- Columns: Pair (with `⇄` glyph), Rate, Inverse rate (`1/rate` to 6 dp), Effective at, Source, Actions.
- Filters: pair (two `Value` select dropdowns), as-of date.

### 7.2 `/admin/exchange-rates/new` and `/[id]` (forms, PR 1)

- Two `Value` pickers, decimal `rate` input, `effectiveAt` datetime picker (defaults to now; freely future-dateable per Q2.5), optional `source` text input.
- Submit button greys out and shows inline error if `fromValue == toValue`.
- On submit, the inverse rate is shown read-only (&ldquo;Inverse: 1 EUR = 1.0869 USD&rdquo;) so the admin can sanity-check.

### 7.3 Invoice and RecurringFlow tables (PR 2)

- Add &ldquo;In base&rdquo; column. Rows with a snapshot display `€100 (≈ $108.69)`; rows with `NULL` show `€100` with a tooltip `No rate for EUR→USD at the time this was saved`.
- Detail pages show `rateUsed` and `baseAmount` in a read-only sub-section with a refresh hint (&ldquo;Save this record to update the snapshot&rdquo;).

### 7.4 Live conversion preview (PR 2)

In the create / edit forms for an invoice item and a recurring flow:

- When `nativeValueId` and `nativeAmount` are both set, debounce 250 ms and call `GET /exchange-rates/lookup?fromValueId=&toValueId=&at=now`.
- Render below the amount field: `≈ $108.69 USD (rate 1.0869 as of 2026-05-13)` or `! No rate for EUR → USD` in amber.
- Preview is **non-blocking** &mdash; the form still submits if no rate exists; the snapshot will be `NULL`.

---

## 8. Permissions

- All exchange-rate and system-settings endpoints are gated by `AdminGuard` (`packages/core/src/auth/guards/admin.guard.ts`).
- No additional roles, no per-resource ACLs.
- Mirrors the pattern in `OfferingsController`, `LocalesController`, `RecurringFlowsController`, &hellip;

---

## 9. Backend Module Layout (PR 1)

```
packages/core/src/
├── exchange-rates/
│   ├── entities/
│   │   └── exchange-rate.entity.ts
│   ├── exchange-rate.dto.ts
│   ├── exchange-rates.controller.ts
│   ├── exchange-rates.service.ts
│   └── exchange-rates.module.ts
├── system-settings/
│   ├── entities/
│   │   └── system-setting.entity.ts
│   ├── system-setting.dto.ts
│   ├── system-settings.controller.ts
│   ├── system-settings.service.ts
│   └── system-settings.module.ts
└── marketlum-core.module.ts            ← register both new modules
```

In PR 2, `InvoicesService` and `RecurringFlowsService` import `ExchangeRatesService` and `SystemSettingsService` (via dependency injection) and call them inside their `create`/`update` paths. No new directories.

---

## 10. Shared Package Additions

```
packages/shared/src/
├── schemas/
│   └── exchange-rate.schema.ts           ← new (§4)
├── schemas/invoice.schema.ts             ← add rateUsed/baseAmount/baseTotal (PR 2)
├── schemas/recurring-flow.schema.ts      ← add rateUsed/baseAmount (PR 2)
├── helpers/
│   └── exchange-rate.helpers.ts          ← canonicalise, invert, convert (§3)
└── index.ts                              ← re-export
```

`exchange-rate.helpers.ts` exports pure functions only &mdash; no DB access &mdash; so they can be reused on the web side (form preview math, defensive checks).

**Reminder per Marketlum memory:** the shared package must be rebuilt (`pnpm --filter @marketlum/shared build`) before API tests can see new exports. Both PRs touch it; both PRs need the rebuild.

---

## 11. UI Package and Web App Wiring

### 11.1 Pages (PR 1)

```
apps/web/src/app/admin/exchange-rates/
├── page.tsx                    ← list + base-value picker
├── new/
│   └── page.tsx                ← create form
└── [id]/
    └── page.tsx                ← edit form
```

Sidebar entry added to `apps/web/src/app/admin/layout.tsx`.

### 11.2 Pages (PR 2)

- `apps/web/src/app/admin/invoices/[id]/page.tsx` &mdash; render snapshot fields, &ldquo;In base&rdquo; column.
- `apps/web/src/app/admin/recurring-flows/[id]/page.tsx` &mdash; same.
- Both `invoices/new`, `invoices/[id]/edit`, `recurring-flows/new`, `recurring-flows/[id]/edit` &mdash; live conversion preview (§7.4).

### 11.3 Template synchronisation (CLAUDE.md mandate)

Every file modified or created under `apps/api/` or `apps/web/` must be mirrored to `packages/create-marketlum-app/template/`. Specifically:

**PR 1:**
- `apps/api/src/...` &mdash; nothing API-specific lives there (modules register in `packages/core`); only the AppModule import list moves. Mirror.
- `apps/web/src/app/admin/exchange-rates/**` &mdash; mirror.
- `apps/web/src/app/admin/layout.tsx` (sidebar entry) &mdash; mirror.

**PR 2:**
- Modified `invoices/**` and `recurring-flows/**` admin pages &mdash; mirror.

---

## 12. Seed Data

`apps/api/src/commands/seed-sample.command.ts` is updated in **PR 1** (the system base must exist before PR 2 can demonstrate snapshots).

Additions (idempotent &mdash; only created when missing):

| Step | Action |
|---|---|
| 1 | Insert `Value` rows for `USD`, `EUR`, `GBP`, `Hour of consulting` if not already present. |
| 2 | Write `system_settings.base_value_id = <USD.id>`. |
| 3 | Insert `ExchangeRate` rows: `USD↔EUR (rate 0.92, source 'ECB')`, `USD↔GBP (rate 0.79, source 'ECB')`, `EUR↔GBP (rate 0.86, source 'ECB')`, `USD↔Hour-of-consulting (rate 0.005, source 'Manual')` &mdash; one row each, all at `effectiveAt = now()`. |

No backdated history (Q4.6).

---

## 13. BDD Coverage

Strict-BDD per project rule. Feature files in `packages/bdd/features/`, step definitions in `apps/api/test/`.

### 13.1 New feature dir `exchange-rates/` (PR 1) &mdash; ~30 scenarios

| Feature file | Scenarios |
|---|---|
| `create-exchange-rate.feature` | happy path; canonical reorder when submitted reversed; reject `fromValue == toValue`; reject `rate <= 0`; reject duplicate `(pair, effectiveAt)`; accept `effectiveAt` in the future |
| `update-exchange-rate.feature` | update rate; update `effectiveAt`; update `source`; re-canonicalise on value-id swap; reject collision with another row |
| `delete-exchange-rate.feature` | delete; cannot delete a `Value` while it&apos;s referenced by a rate (RESTRICT) |
| `get-exchange-rate.feature` | get by id; 404 when missing |
| `list-exchange-rates.feature` | pagination; filter by `fromValueId`; filter by pair (both directions match); filter by `at` (only rows with `effectiveAt <= at`); sort by `effectiveAt DESC` (default) |
| `lookup-exchange-rate.feature` | symmetric lookup returns the same rate either way; missing pair returns `null`; multi-row pair picks the latest `effectiveAt <= at`; future-dated row is ignored when `at = now` |

### 13.2 New feature dir `system-settings/` (PR 1) &mdash; ~5 scenarios

`base-value.feature`: get returns `null` when unset; set base value; cannot change base while invoice-item or recurring-flow snapshots exist; reset-snapshots clears both tables; after reset, base can be changed.

### 13.3 Additions to existing feature dirs (PR 2)

`invoices/`:

| Scenario | Behaviour |
|---|---|
| `create-invoice-snapshots-each-item` | items get `rateUsed`/`baseAmount` set when a rate exists |
| `create-invoice-null-snapshot-when-no-rate` | items get `NULL` snapshot when no rate exists for the currency pair |
| `update-invoice-resnapshots-on-currency-change` | changing `currencyId` re-snapshots all items |
| `update-invoice-no-resnapshot-on-metadata-change` | editing the invoice number doesn&apos;t touch snapshots |
| `update-invoice-item-resnapshots-on-amount-change` | changing `quantity`/`unitPrice`/`total` re-snapshots that item only |
| `invoice-base-total` | response includes `baseTotal` summing item `baseAmount`s |

`recurring-flows/`:

| Scenario | Behaviour |
|---|---|
| `create-recurring-flow-snapshot` | snapshot populated on create |
| `create-recurring-flow-null-snapshot-no-value` | `NULL` snapshot when `valueId` is unset |
| `update-recurring-flow-resnapshots-on-amount-change` | re-snapshot when `amount` or `valueId` changes |
| `update-recurring-flow-no-resnapshot-on-description-change` | no re-snapshot on metadata edits |

Approximate total: ~30 scenarios in PR 1, ~10 in PR 2 &mdash; ~40 scenarios. Existing counts in `MEMORY.md` will need to be bumped after each PR.

---

## 14. Out of Scope

Cross-referenced to the brainstorming questions that defined each boundary.

- **`ExchangeFlow` snapshotting** (Q3.3) &mdash; the exchanges module ships with no rate awareness. A future spec can add it without altering this design.
- **Ledger `Transaction` snapshotting** (Q3.3) &mdash; ditto.
- **Transitive rate computation** (Q2.8) &mdash; `USD→GBP` via `USD→EUR→GBP` is not supported. Admin must enter the direct pair.
- **Multiple sources per pair** (Q1.5) &mdash; only one rate exists per `(pair, effectiveAt)`. The `source` field is metadata, not a discriminator.
- **Per-`ValueStream` base value** (Q3.1) &mdash; single system base only.
- **Automatic backfill** (Q3.6) &mdash; no admin endpoint; resave each row to refresh.
- **`baseValueId` per snapshot row** (Q3.2) &mdash; not stored; consequence is the &ldquo;block base change while snapshots exist&rdquo; constraint (Q4.1).
- **Audit log of who created/edited rates** (Q2.4) &mdash; `createdBy` was rejected; reverse via git/log if needed.
- **End-to-end browser tests** (Q4.7) &mdash; not in repo convention; covered by BDD plus `tsc` / `next build`.

---

## 15. Delivery Plan

### PR 1 &mdash; ExchangeRate CRUD + system_settings + admin UI

Order of work:

1. `packages/shared/src/schemas/exchange-rate.schema.ts` + helpers.
2. `packages/core/src/exchange-rates/` module (entity, service, controller, DTO).
3. `packages/core/src/system-settings/` module.
4. Migration `M-add-exchange-rates`.
5. Register both modules in `marketlum-core.module.ts`.
6. Seed-sample additions (currencies + base value + sample rates).
7. `apps/web/src/app/admin/exchange-rates/` pages + sidebar entry.
8. BDD feature files for `exchange-rates/` and `system-settings/`; step definitions.
9. Template sync to `packages/create-marketlum-app/template/`.
10. Rebuild shared package; run `pnpm test:e2e`; update test counts in `MEMORY.md`.

### PR 2 &mdash; Snapshot wiring on Invoice + RecurringFlow

Order of work:

1. Migration `M-add-rate-snapshots` adding `rate_used` / `base_amount` columns.
2. Update `InvoiceItem` and `RecurringFlow` entities (TypeORM mappings).
3. Update response schemas in `@marketlum/shared`.
4. Wire snapshot logic into `InvoicesService.create/update` and `RecurringFlowsService.create/update` (re-snapshot rule per §3.5).
5. Add `baseTotal` to invoice response.
6. Web: update invoice + recurring-flow tables and detail pages; add live conversion preview in forms.
7. BDD scenarios under `invoices/` and `recurring-flows/`; step definitions.
8. Template sync.
9. Rebuild shared; run `pnpm test:e2e`; bump counts in `MEMORY.md`.
