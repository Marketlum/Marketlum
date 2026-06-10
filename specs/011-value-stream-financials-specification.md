# 011 — Value Stream Financials (Revenue & Expenses from Invoices) — Specification

> **Status:** Ready for implementation.
> **Decision trail:** [`011-value-stream-financials-brainstorming.md`](./011-value-stream-financials-brainstorming.md) (Rounds 1–4, all answers accepted; deviations from recommendation noted there).
> **Delivery:** Single PR, layered in dependency order (see §13).

---

## 1. Overview

Track **actual** revenue and expenses per `ValueStream`, aggregated from invoice data. This is the *actuals* counterpart to the existing recurring-flow **budget** (`GET /value-streams/:id/budget`, projection of recurring flows). The two are deliberately shape-aligned so a future "budget vs. actual" overlay needs no rework, but that overlay is **out of scope** here (§12).

The core mechanic: each `Invoice` gains an explicit, required **`direction`** (`REVENUE` | `EXPENSE`). A new `GET /value-streams/:id/financials?year=&directOnly=` endpoint sums invoice line-item presentation amounts over a value stream's subtree, split by `direction`, into a month/quarter/annual rollup. A new **"Financials"** tab on the value-stream detail page renders it with summary cards, a breakdown table, and the existing D3 revenue/expense chart.

```
                          Invoice.direction (REVENUE | EXPENSE)   ← stored fact, set at creation
                                     │
   ValueStream (closure-tree)        │
        │  findDescendants           ▼
        └────────────►  invoices WHERE valueStreamId IN (subtree)
                              │  issuedAt within :year
                              │  LEFT JOIN invoice_items
                              ▼
              SUM(presentationAmount) GROUP BY month, direction
                              │
                              ▼
   { summary{revenue,expense,net}, byMonth[12], byQuarter[4],
     presentationCurrency, invoiceCount, notConvertedCount }
                              │
                              ▼
       Financials tab: summary cards + breakdown table + chart
```

### Design decisions (from brainstorm)

| # | Decision |
|---|----------|
| Q1 | New VS-scoped `GET /value-streams/:id/financials` endpoint; global dashboard untouched. |
| Q2 | Invoice→VS attribution via the existing direct `invoice.valueStreamId` only. |
| Q3 | Classification is an **explicit `direction` column on `invoices`** — *not* derived from the VS agent. |
| Q4 | Subtree rollup by default; `directOnly=true` restricts to the stream itself. |
| Q5 | All invoices with `issuedAt` in range count, regardless of `paid`. |
| Q6 | Separate endpoint, response shape aligned with `/budget`. |
| Q7 | Presentation-currency snapshot (`InvoiceItem.presentationAmount`), null-safe via `notConvertedCount`. |
| Q2.1 | New **`InvoiceDirection`** enum: `REVENUE='revenue'`, `EXPENSE='expense'` (financial meaning, diverges from flow `INBOUND`/`OUTBOUND`). |
| Q2.2 | `direction` is **NOT NULL** on every invoice. |
| Q2.3 | Migration **blanket-defaults existing invoices to `REVENUE`**. |
| Q2.4 | Form requires an **explicit, un-defaulted** direction choice (no auto-suggest). |
| Q2.5 | Response **mirrors `/budget`** exactly (plus `invoiceCount`/`notConvertedCount`). |
| Q2.6 | Scoped by `year` (+ `directOnly`). |
| Q2.7 | Dedicated **`ValueStreamFinancialsService`** with raw SQL. |
| Q3.1 | New **"Financials" tab** after "Budget". |
| Q3.2 | Parallel UI components under `value-stream-financials/`, reusing the year selector + figure helpers. |
| Q3.3 | Summary cards + breakdown table + D3 `RevenueExpensesChart`. |
| Q3.4 | Invoice form uses a **segmented Revenue \| Expense control**, required, no default. |
| Q3.5 | Invoice list: coloured `Badge` column (Revenue emerald / Expense rose) + filter. |
| Q3.6 | Missing-data states mirror the budget tab ("—" + `notConvertedCount` banner). |
| Q4.1 | `AdminGuard` at the controller level. |
| Q4.2 | PDF import leaves `direction` unselected; review form requires a pick. |
| Q4.3 | Seed a realistic `REVENUE`/`EXPENSE` mix (battery value-chain theme). |
| Q4.4 | i18n keys added to every locale file. |
| Q4.5 | Two new BDD feature files + patches to existing invoice features. |
| Q4.6 | Mirror touched `apps/web`/`apps/api` files into the `create-marketlum-app` template. |
| Q4.7 | Single PR, layered (§13). |

---

## 2. Domain model

### 2.1 `InvoiceDirection` enum (new)

`packages/shared/src/enums/invoice-direction.enum.ts`

```ts
export enum InvoiceDirection {
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}
```

Barrel-export from `packages/shared/src/index.ts` (alongside the other enums). Naming is intentionally financial (not `INBOUND`/`OUTBOUND`) — the financials service maps `REVENUE`→revenue bucket, `EXPENSE`→expense bucket with no agent inference.

### 2.2 `Invoice` entity change

`packages/core/src/invoices/entities/invoice.entity.ts` — add one column (placed after `paid`):

```ts
@Column({ type: 'enum', enum: InvoiceDirection })
direction: InvoiceDirection;
```

- **NOT NULL**, no DB default (the application always supplies it; Zod enforces presence). The migration backfills existing rows before adding the constraint (§9).
- No relationship/index change required for the feature, but see §9 for the recommended composite index supporting the aggregation query.

### 2.3 Entity field table (invoice, post-change)

| Field | Type | Notes |
|-------|------|-------|
| … existing fields … | | unchanged |
| `paid` | boolean | unchanged |
| **`direction`** | `InvoiceDirection` enum | **new, NOT NULL** — `revenue` \| `expense` |
| `valueStreamId` | uuid, nullable | existing direct link, drives attribution |
| `items[]` | `InvoiceItem[]` | carries `presentationAmount` snapshot |

No change to `InvoiceItem`.

---

## 3. Zod schema changes (`@marketlum/shared`)

### 3.1 `packages/shared/src/schemas/invoice.schema.ts`

- `createInvoiceSchema`: add **required**
  ```ts
  direction: z.nativeEnum(InvoiceDirection),
  ```
- `updateInvoiceSchema`: add optional
  ```ts
  direction: z.nativeEnum(InvoiceDirection).optional(),
  ```
- `invoiceResponseSchema`: add
  ```ts
  direction: z.nativeEnum(InvoiceDirection),
  ```
- Add an optional `direction` to the invoice **list query** schema (wherever `paid`/`fromAgentId` filters live) for the list filter (Q3.5):
  ```ts
  direction: z.nativeEnum(InvoiceDirection).optional(),
  ```

Re-export the enum and types. **Remember to rebuild** `@marketlum/shared` before API/web typecheck (memory gotcha).

### 3.2 `packages/shared/src/schemas/value-stream-financials.schema.ts` (new)

Mirrors `value-stream-budget.schema.ts`, swapping the flow-specific tail counts for invoice counts.

```ts
import { z } from 'zod';

const valueSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
});

export const valueStreamFinancialsQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100)
    .default(() => new Date().getUTCFullYear()),
  directOnly: z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(false),
});

const figureSchema = z.object({
  monthly: z.string().nullable(),
  quarterly: z.string().nullable(),
  annual: z.string().nullable(),
});

const monthRowSchema = z.object({
  month: z.string(),       // 'YYYY-MM'
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

const quarterRowSchema = z.object({
  quarter: z.string(),     // 'YYYY-Qn'
  revenue: z.string().nullable(),
  expense: z.string().nullable(),
  net: z.string().nullable(),
});

export const valueStreamFinancialsResponseSchema = z.object({
  valueStreamId: z.string().uuid(),
  year: z.number().int(),
  directOnly: z.boolean(),
  presentationCurrency: valueSummarySchema.nullable(),
  summary: z.object({
    revenue: figureSchema,
    expense: figureSchema,
    net: figureSchema,
  }),
  byMonth: z.array(monthRowSchema).length(12),
  byQuarter: z.array(quarterRowSchema).length(4),
  invoiceCount: z.number().int(),
  notConvertedCount: z.number().int(),
});

export type ValueStreamFinancialsQuery = z.infer<typeof valueStreamFinancialsQuerySchema>;
export type ValueStreamFinancialsResponse = z.infer<typeof valueStreamFinancialsResponseSchema>;
```

Differences from budget response: `invoiceCount` replaces `activeFlowCount`; `notConvertedCount` replaces `skippedFlows`. Everything else is byte-identical so the UI table/cards map one-to-one.

---

## 4. API surface

### 4.1 New endpoint

```
GET /value-streams/:valueStreamId/financials?year=2026&directOnly=false
```

- **Guard:** `AdminGuard` (controller level).
- **Query:** `valueStreamFinancialsQuerySchema` via `ZodValidationPipe` (`year` defaults to current UTC year, `directOnly` defaults `false`).
- **404** if the value stream does not exist (mirror `RecurringFlowsBudgetService`).
- **Response:** `ValueStreamFinancialsResponse` (§3.2).

**Example response (presentation currency configured):**

```json
{
  "valueStreamId": "…",
  "year": 2026,
  "directOnly": false,
  "presentationCurrency": { "id": "…", "name": "Euro", "code": "EUR" },
  "summary": {
    "revenue": { "monthly": "12500.00", "quarterly": "37500.00", "annual": "150000.00" },
    "expense": { "monthly": "4000.00",  "quarterly": "12000.00", "annual": "48000.00" },
    "net":     { "monthly": "8500.00",  "quarterly": "25500.00", "annual": "102000.00" }
  },
  "byMonth": [ { "month": "2026-01", "revenue": "10000.00", "expense": "3000.00", "net": "7000.00" }, … 11 more ],
  "byQuarter": [ { "quarter": "2026-Q1", "revenue": "30000.00", "expense": "9000.00", "net": "21000.00" }, … 3 more ],
  "invoiceCount": 42,
  "notConvertedCount": 3
}
```

**Example response (no presentation currency configured)** — null-safe, mirrors budget:

```json
{
  "valueStreamId": "…", "year": 2026, "directOnly": false,
  "presentationCurrency": null,
  "summary": { "revenue": {"monthly":null,"quarterly":null,"annual":null},
               "expense": {"monthly":null,"quarterly":null,"annual":null},
               "net":     {"monthly":null,"quarterly":null,"annual":null} },
  "byMonth":  [ {"month":"2026-01","revenue":null,"expense":null,"net":null}, … ],
  "byQuarter":[ {"quarter":"2026-Q1","revenue":null,"expense":null,"net":null}, … ],
  "invoiceCount": 42,
  "notConvertedCount": 0
}
```

### 4.2 Invoice CRUD (existing endpoints, augmented)

- `POST /invoices` / `PATCH /invoices/:id`: accept and persist `direction` (required on create, optional on update).
- `GET /invoices` (list): accept optional `direction` filter; include `direction` in each response row.
- No new invoice endpoints.

---

## 5. Backend module layout

### 5.1 New service — `packages/core/src/invoices/value-stream-financials.service.ts`

Lives in the **invoices module** (its data source is `invoices`/`invoice_items`), mirroring how `RecurringFlowsBudgetService` lives in the recurring-flows module.

```ts
@Injectable()
export class ValueStreamFinancialsService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(ValueStream) private readonly valueStreamRepository: TreeRepository<ValueStream>,
    @InjectRepository(Value) private readonly valueRepository: Repository<Value>,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  async forValueStream(
    valueStreamId: string,
    query: ValueStreamFinancialsQuery,
  ): Promise<ValueStreamFinancialsResponse> { … }
}
```

**Algorithm:**

1. Load the value stream; **404** if missing.
2. `scopeIds = directOnly ? [id] : (await findDescendants(vs)).map(v => v.id)` — identical to budget.
3. Resolve presentation currency via `SystemSettingsService.getPresentationCurrencyId()` → load `Value`. If absent, return the **all-null** shape (§4.1 second example) with `invoiceCount`/`notConvertedCount` still computed.
4. Date window: `[`${year}-01-01`, `${year + 1}-01-01`)` on `issuedAt` (half-open, UTC), mirroring the dashboard's `issuedAt` handling.
5. **Aggregation SQL** (single query):

   ```sql
   SELECT
     TO_CHAR(i."issuedAt", 'YYYY-MM')                                AS month,
     i.direction                                                     AS direction,
     COALESCE(SUM(ii."presentationAmount"), 0)                       AS amount,
     COUNT(*) FILTER (WHERE ii."presentationAmount" IS NULL)         AS not_converted
   FROM invoices i
   LEFT JOIN invoice_items ii ON ii."invoiceId" = i.id
   WHERE i."valueStreamId" = ANY($1)
     AND i."issuedAt" >= $2
     AND i."issuedAt" <  $3
   GROUP BY month, direction
   ```

6. **Counts** (separate, to keep the group-by clean):

   ```sql
   SELECT
     COUNT(DISTINCT i.id)                                           AS invoice_count,
     COUNT(ii.*) FILTER (WHERE ii."presentationAmount" IS NULL)     AS not_converted_count
   FROM invoices i
   LEFT JOIN invoice_items ii ON ii."invoiceId" = i.id
   WHERE i."valueStreamId" = ANY($1) AND i."issuedAt" >= $2 AND i."issuedAt" < $3
   ```

7. Fold rows into a 12-slot `months[]` accumulator: `direction = 'revenue'` → `revenue += amount`; `'expense'` → `expense += amount`. Build `byMonth`, `byQuarter` (3-month slices), `summary` (annual + annual/12, annual/4) exactly as `budget.service.ts` does. `net = revenue − expense` per period.
8. All money formatted with `Number(x).toFixed(2)` (memory gotcha: never `String()` / `parseFloat().toString()`).

**Edge cases:**
- Empty scope / no invoices → all-zero figures (not null) when presentation currency exists; `invoiceCount = 0`.
- `presentationAmount IS NULL` line items contribute `0` to sums but increment `notConvertedCount`.
- `directOnly=true` on a leaf stream == subtree (scope is just itself).

### 5.2 New controller — `packages/core/src/invoices/value-stream-financials.controller.ts`

```ts
@ApiTags('invoices')
@ApiCookieAuth('access_token')
@Controller('value-streams/:valueStreamId')
@UseGuards(AdminGuard)
export class ValueStreamFinancialsController {
  constructor(private readonly financialsService: ValueStreamFinancialsService) {}

  @Get('financials')
  @ApiOperation({ summary: 'Get value-stream actuals (revenue/expense from invoices) for a calendar year' })
  @ApiParam({ name: 'valueStreamId', type: String })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'directOnly', required: false, type: Boolean })
  async financials(
    @Param('valueStreamId') valueStreamId: string,
    @Query(new ZodValidationPipe(valueStreamFinancialsQuerySchema)) query: ValueStreamFinancialsQuery,
  ) {
    return this.financialsService.forValueStream(valueStreamId, query);
  }
}
```

### 5.3 `invoices.module.ts` changes

- `TypeOrmModule.forFeature([...existing, ValueStream, Value])` (add `ValueStream`, `Value` if not present).
- Register `SystemSettingsModule` import (or inject `SystemSettingsService` — match how the budget module wires it).
- Add `ValueStreamFinancialsController` to `controllers`, `ValueStreamFinancialsService` to `providers`.

> Route-collision note: both `ValueStreamRecurringFlowsController` and `ValueStreamFinancialsController` mount on `@Controller('value-streams/:valueStreamId')`. NestJS allows multiple controllers sharing a path prefix as long as method routes differ (`/budget` vs `/financials`) — no conflict.

### 5.4 Invoice service / DTO

- `InvoicesService.create/update`: persist `direction` (already flows through if the service spreads the validated DTO; verify it isn't stripped).
- `InvoicesService.search`: add `direction` to the optional filter `where` clause.
- Map `direction` in the invoice → response mapper.
- Add `ValueStreamFinancialsResponseDto` (Swagger) mirroring `ValueStreamBudgetResponseDto`.

### 5.5 Domain events

No new event types. `direction` is a plain column on `invoices`, so it rides the existing `marketlum.invoice.created` / `marketlum.invoice.updated` events automatically (it's part of the entity payload). The financials endpoint is read-only and emits nothing. (Ref: domain-events spec 009.)

---

## 6. UI / UX

### 6.1 New "Financials" tab

`packages/ui/src/layouts/value-stream-layout.tsx` — add a `TabDef` immediately after the `budget` tab:

```ts
{ segment: 'financials', label: t('tabFinancials') },
```

### 6.2 Web route (apps/web) — **template-synced** (§11)

`apps/web/src/app/admin/value-streams/[id]/financials/page.tsx`:

```tsx
export { ValueStreamFinancialsPage as default } from '@marketlum/ui';
```

(Matches the existing `…/[id]/budget/page.tsx` wrapper pattern.)

### 6.3 Page — `packages/ui/src/pages/admin/value-stream-financials-page.tsx`

Mirrors `value-stream-budget-page.tsx`:

1. Breadcrumb + title + **`YearSelector`** (reused as-is — `year` + `directOnly`, URL-synced to `?year=&directOnly=`).
2. **`FinancialsSummaryCards`** (3-up: monthly / quarterly / annual; revenue emerald, expense red `−` prefix, net coloured by sign; `—` when null).
3. **`FinancialsBreakdownTable`** (tabs: Months / Quarters; rows Revenue / Expense / Net).
4. **`RevenueExpensesChart`** — reused. Map `byMonth` → its `DashboardTimeSeriesPoint[]` shape:
   ```ts
   const chartData = data.byMonth.map((m) => ({
     period: m.month,
     revenue: m.revenue ?? '0',
     expenses: m.expense ?? '0',   // note: chart prop is `expenses` (plural)
   }));
   ```
5. **Missing-data banner** (Q3.6): when `presentationCurrency === null`, show the budget-style "configure a presentation currency" notice; when `notConvertedCount > 0`, show an info banner: *"{count} invoice lines couldn't be converted to the presentation currency and are excluded."*

Data fetched via a new hook `packages/ui/src/hooks/use-value-stream-financials.ts` (TanStack Query), calling a new `apiClient.getValueStreamFinancials(id, { year, directOnly })`.

### 6.4 New components — `packages/ui/src/components/value-stream-financials/`

- `financials-summary-cards.tsx` — prop `financials: ValueStreamFinancialsResponse`.
- `financials-breakdown-table.tsx` — prop `financials: ValueStreamFinancialsResponse`.

**Figure helpers (reuse, don't duplicate — Q3.2):** the budget components currently hold `formatFigure(value, currencyCode)` and `cellClass(value)` (sign → `'' | text-emerald-600 | text-red-600`). Extract these into a shared module `packages/ui/src/lib/figures.ts` and have **both** the budget and financials components import them. This is the only refactor touching shipped budget code; it is a pure move (no behaviour change).

### 6.5 Invoice form — segmented direction control (Q3.4)

`packages/ui/src/components/invoices/invoice-form-dialog.tsx`:

- Add a **required, un-defaulted** segmented control (two buttons: **Revenue** | **Expense**), placed next to the Value Stream field.
- Implementation: a two-button toggle group (`Button` variants — `default` for the active side, `outline` for the inactive), bound to `direction` in the form state; no `__none__`, no preselected value.
- Validation: `createInvoiceSchema` makes it required → submitting without a pick shows the field error. On **edit**, seed from the loaded invoice's `direction`.
- **PDF import (Q4.2):** when `prefill` is present, `direction` stays unset; the review form blocks save until the user picks (same required-field path — extraction never guesses).

### 6.6 Invoice list — direction badge + filter (Q3.5)

- `packages/ui/src/components/invoices/columns.tsx`: add a `direction` column rendering a `Badge`:
  - `REVENUE` → emerald badge (`text/bg` matching chart `#10b981`), label `t('directionRevenue')`.
  - `EXPENSE` → rose badge (matching `#f43f5e`), label `t('directionExpense')`.
  - Slot it adjacent to the `paid` badge column.
- `DataTableFilterSheet`: add a `direction` filter `Select` (`all` / `revenue` / `expense`), URL-syncable, surfaced as an `ActiveFilters` chip — mirroring the `paid` filter exactly. Filter value passed to the list query (§4.2).

### 6.7 api-client

`packages/ui/src/lib/api-client.ts`: add

```ts
getValueStreamFinancials(id: string, params: { year: number; directOnly: boolean }): Promise<ValueStreamFinancialsResponse>
```

(mirror `getValueStreamBudget`).

---

## 7. ASCII mockup — Financials tab

```
┌ Value Stream ▸ Cell Manufacturing ───────────────────────────────────────┐
│  Overview  Values  Offerings  …  Invoices  Recurring Flows  Budget  [Financials] │
├──────────────────────────────────────────────────────────────────────────┤
│  ◀  2026  ▶      ☐ Direct only                                            │
│                                                                          │
│  ┌─ Monthly ─────┐  ┌─ Quarterly ───┐  ┌─ Annual ──────┐                 │
│  │ Rev  12 500 € │  │ Rev  37 500 € │  │ Rev 150 000 € │                 │
│  │ Exp  −4 000 € │  │ Exp −12 000 € │  │ Exp −48 000 € │                 │
│  │ Net   8 500 € │  │ Net  25 500 € │  │ Net 102 000 € │                 │
│  └───────────────┘  └───────────────┘  └───────────────┘                 │
│                                                                          │
│  ⚠ 3 invoice lines couldn't be converted and are excluded.               │
│                                                                          │
│  ┌─ Revenue vs Expenses (monthly) ──────────────────────────────────┐    │
│  │  █▌  █▌   █▌  …  (emerald = revenue, rose = expense)              │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [ View Months | View Quarters ]                                         │
│           Jan     Feb     Mar    …    Dec                                │
│  Revenue 10 000  11 000  9 000  …  13 000                                │
│  Expense  3 000   3 500  2 500  …   4 000                                │
│  Net      7 000   7 500  6 500  …   9 000                                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database

### 8.1 DDL outcome

```sql
CREATE TYPE invoices_direction_enum AS ENUM ('revenue', 'expense');

ALTER TABLE invoices ADD COLUMN direction invoices_direction_enum;   -- nullable first
UPDATE invoices SET direction = 'revenue' WHERE direction IS NULL;   -- Q2.3 backfill
ALTER TABLE invoices ALTER COLUMN direction SET NOT NULL;            -- no DB default

-- supports the aggregation query
CREATE INDEX idx_invoices_vs_issued ON invoices ("valueStreamId", "issuedAt");
```

### 8.2 Referential integrity

- `direction` is a scalar enum — no FK.
- Attribution relies on the existing `invoices.valueStreamId` FK (`ON DELETE SET NULL`); an invoice whose value stream is deleted simply drops out of every stream's financials (already the dashboard's behaviour).

---

## 9. Migration

`packages/core/src/migrations/<timestamp>-AddInvoiceDirection.ts` — **hand-written** (memory gotcha: `migration:generate` adds drift artifacts).

- `up()`: create enum type; add `direction` nullable; `UPDATE invoices SET direction = 'revenue'`; set `NOT NULL`; create `idx_invoices_vs_issued`.
- `down()`: drop index; drop column; drop enum type.

Run via `pnpm migration:run`.

---

## 10. Seed data (Q4.3)

`apps/api/src/database/seed-sample.command.ts` (or wherever invoices are seeded):

- Set `direction` on **every** seeded invoice (now required).
- Assign a realistic mix themed to the battery value chain: sales/output invoices → `REVENUE`; supplier/material/service invoices → `EXPENSE`. Ensure at least one value stream's subtree has **both** revenue and expense invoices across multiple months of the current year, so the Financials tab renders a non-trivial chart and a positive-and-negative net out of the box.
- Keep `presentationAmount` snapshots populated (existing seed already does) so figures convert; optionally leave one line unconverted to exercise the `notConvertedCount` banner.

---

## 11. Template sync (Q4.6 — `CLAUDE.md` rule)

Mirror every touched `apps/web` / `apps/api` file into `packages/create-marketlum-app/template/`:

- **New:** `template/apps/web/src/app/admin/value-streams/[id]/financials/page.tsx` (the re-export wrapper).
- **Changed:** the invoice-direction migration under `template/apps/api/src/migrations/…` (mirror the new migration), and the seed command `template/apps/api/src/database/seed-sample.command.ts`.
- Verify no other `apps/*` files changed; UI/shared/core live in `packages/*` (consumed by the template as workspace deps) and are **not** mirrored.

Enumerate the exact mirrored paths in the PR description.

---

## 12. Permissions

`AdminGuard` at the controller level for `ValueStreamFinancialsController`, identical to every other admin endpoint (Q4.1). No new roles.

---

## 13. BDD test coverage (Q4.5)

Strict BDD — features precede implementation.

### 13.1 `packages/bdd/features/value-streams/financials.feature` (new)

Step defs: `apps/api/test/value-streams/financials.steps.ts`. Use `createAuthenticatedUser()` (service-level) and seed invoices via services.

Scenarios (~7):
1. Revenue and expense split by `direction` for a single value stream (direct invoices).
2. Subtree rollup — child-stream invoices included when `directOnly=false`.
3. `directOnly=true` excludes descendant streams.
4. Year scoping — invoices outside `:year` excluded; month/quarter/annual rollups correct.
5. No presentation currency configured → all-null figures, counts still returned.
6. `notConvertedCount` reflects line items with NULL `presentationAmount`; those contribute 0 to sums.
7. 404 for a non-existent value stream.

### 13.2 `packages/bdd/features/invoices/direction.feature` (new)

Step defs: `apps/api/test/invoices/direction.steps.ts`.

Scenarios (~5):
1. Create invoice with `direction=revenue` → persisted and returned.
2. Create invoice with `direction=expense` → persisted and returned.
3. Create invoice **without** `direction` → 400 validation error.
4. Update an invoice's `direction` → reflected in response.
5. List invoices filtered by `direction=expense` → only expense invoices returned.

### 13.3 Existing invoice features — patch

Add `direction` to every invoice-creation payload in existing feature files / step defs (e.g. `invoices/*.feature`, snapshot-per-agent steps) so the now-required field doesn't break them.

> Run `pnpm --filter @marketlum/shared build` before `pnpm test:e2e` so the API sees the new enum/schema exports.

---

## 14. Shared / UI / i18n additions summary

**`@marketlum/shared`**
- `enums/invoice-direction.enum.ts` (new)
- `schemas/value-stream-financials.schema.ts` (new)
- `schemas/invoice.schema.ts` — `direction` on create/update/response/list-query
- barrel exports in `index.ts`

**`@marketlum/ui`**
- `pages/admin/value-stream-financials-page.tsx` (new)
- `components/value-stream-financials/financials-summary-cards.tsx`, `financials-breakdown-table.tsx` (new)
- `lib/figures.ts` (new — extracted `formatFigure`/`cellClass`, also adopted by budget components)
- `hooks/use-value-stream-financials.ts` (new)
- `layouts/value-stream-layout.tsx` — Financials tab
- `components/invoices/invoice-form-dialog.tsx` — segmented direction control
- `components/invoices/columns.tsx` + filter sheet — direction badge + filter
- `lib/api-client.ts` — `getValueStreamFinancials`

**i18n (Q4.4 — every locale file):** `tabFinancials`, `directionRevenue`, `directionExpense`, `directionLabel`, financials banner/empty strings, summary-card and table headers (reuse budget keys where identical).

**`apps/web`** (+ template mirror): `admin/value-streams/[id]/financials/page.tsx`.

**`apps/api`** (+ template mirror): migration, seed command.

---

## 15. Out of scope

- **Unified "budget vs. actual" view** (brainstorm Q6) — shapes are aligned for it, but the combined endpoint/overlay is a follow-up.
- **Cash-basis / paid-only actuals and a paid filter on financials** (Q5) — financials count all issued invoices; a `paid` filter is a later addition.
- **Line-item-level value-stream attribution** (Q2) — attribution stays at invoice level.
- **Deriving direction from agents / per-invoice override / auto-suggest** (Q3, Q2.4) — direction is an explicit stored choice only.
- **Per-agent functional-currency reporting** for value streams (Q7) — presentation currency only.
- **Arbitrary date-range reporting** (Q2.6) — `year`-scoped only.
- **Touching the global dashboard's value-stream handling** (Q1) — left as-is.
- **A finer-grained financials permission/role** (Q4.1).

---

## 16. Delivery plan (single PR, Q4.7)

1. **Shared:** `InvoiceDirection` enum; `value-stream-financials.schema.ts`; `direction` on invoice schemas; barrel exports. Rebuild `@marketlum/shared`.
2. **Entity + DB:** invoice `direction` column; hand-written migration with backfill + index.
3. **Backend:** `ValueStreamFinancialsService` + controller; invoice service/DTO `direction` handling + list filter; module wiring.
4. **BDD:** `financials.feature`, `invoices/direction.feature`, step defs; patch existing invoice features. Make them pass.
5. **UI:** extract `lib/figures.ts`; financials page + components + hook + api-client; Financials tab; invoice form segmented control; invoice list badge + filter.
6. **Seed + i18n + template sync:** seed direction mix; locale keys; mirror `apps/web`/`apps/api` files into the template.

Verification per project convention: `tsc` / `next build` + `pnpm test:e2e` (no full e2e walkthrough in-conversation — memory feedback).
