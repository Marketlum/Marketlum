# Recurring Flows for Value Streams — Specification

> **Status:** Approved (brainstormed in `001-recurring-flows-brainstorming.md`)
> **Target delivery:** Single PR, end-to-end (entity + API + UI + BDD)
> **Scope:** Plan-only recurring revenue and expense flows attached to value streams.

---

## 1. Overview

Marketlum gains a first-class way to model the recurring inbound and outbound value transfers that a `ValueStream` is responsible for &mdash; subscriptions, retainers, payroll, hosting, and any other repeating commitment.

A `RecurringFlow` is a **plan**, not a ledger entry:
- It declares *what* recurs, *between whom*, *how often*, and *for how long*.
- The system uses it to compute projections and rollups.
- It never auto-creates `Transaction` rows. The ledger remains the authoritative store for actuals; recurring flows are forward-looking commitments.

```
┌────────────────────────────┐
│       ValueStream          │
└─────────────┬──────────────┘
              │ 1
              │
              │ N
┌─────────────┴──────────────┐
│       RecurringFlow        │
│  direction   amount/unit   │
│  frequency   anchorDate    │
│  status      [endDate]     │
└──┬──────┬─────────┬────────┘
   │      │         │
   │      │         └─── optional → Value
   │      └────────────── required → Agent  (counterparty)
   └──────────────────── optional → Offering / Agreement
```

---

## 2. Domain Model

### 2.1 `RecurringFlow` entity

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Primary key |
| `valueStreamId` | uuid | yes | FK → `value_streams.id`, `ON DELETE RESTRICT` |
| `counterpartyAgentId` | uuid | yes | FK → `agents.id`, `ON DELETE RESTRICT` (see §6.3) |
| `valueId` | uuid | no | FK → `values.id`, `ON DELETE SET NULL` |
| `offeringId` | uuid | no | FK → `offerings.id`, `ON DELETE SET NULL` |
| `agreementId` | uuid | no | FK → `agreements.id`, `ON DELETE SET NULL` |
| `direction` | enum | yes | `inbound` \| `outbound` |
| `amount` | decimal(14, 4) | yes | Quantity per occurrence |
| `unit` | varchar(32) | yes | Free-text: `USD`, `EUR`, `hours`, `FTE`, &hellip; |
| `frequency` | enum | yes | `daily` \| `weekly` \| `monthly` \| `quarterly` \| `yearly` |
| `interval` | int | yes | Multiplier on frequency, default `1`, must be &ge; 1 |
| `anchorDate` | date | yes | Date of the first occurrence; subsequent occurrences derived from `frequency` + `interval` |
| `endDate` | date | no | Last day on which the flow is still considered live |
| `status` | enum | yes | `draft` \| `active` \| `paused` \| `ended`, default `draft` |
| `description` | text | no | Free-form |
| `taxonomies` | M:N → `taxonomies` | no | Categorisation tags |
| `createdAt` | timestamptz | yes | Standard |
| `updatedAt` | timestamptz | yes | Standard |

**Notes:**
- `amount` uses `decimal(14, 4)` for headroom on both money (4 fractional digits handles micro-pricing) and quantities. Per Marketlum convention, all decimal values are returned as strings formatted with `Number(rawValue).toFixed(4)` &mdash; **do not** use raw `parseFloat` (per existing TypeORM gotcha).
- `unit` is free-form text but normalised on write: trimmed, max 32 chars. Validation does not enforce ISO 4217 &mdash; users may type any token.
- `anchorDate` is a `date` (no time component). Projection helpers treat occurrences as whole-day events.
- The `taxonomies` join table is named `recurring_flow_taxonomies` with columns `recurringFlowId` and `taxonomyId`, mirroring `value_taxonomies`.

### 2.2 State machine

```
       ┌──────────┐
       │  draft   │
       └────┬─────┘
            │ activate
            ▼
       ┌──────────┐      pause       ┌──────────┐
       │  active  │ ───────────────▶ │  paused  │
       │          │ ◀─────────────── │          │
       └────┬─────┘      resume      └────┬─────┘
            │ end                         │ end
            ▼                             ▼
       ┌──────────┐                       │
       │  ended   │ ◀─────────────────────┘
       └──────────┘
```

Defined in `@marketlum/shared/src/recurring-flow.state-machine.ts` following the existing state-machine pattern. `ended` is a terminal state &mdash; once ended, a flow cannot be resumed (UI prompts &ldquo;Clone this flow&rdquo;).

Transition rules:
- `draft` → `active` (activate)
- `active` ↔ `paused` (pause / resume)
- `active` → `ended` (end)
- `paused` → `ended` (end)
- No other transitions are legal.

`endDate` is set automatically when transitioning to `ended` (default: today; user may override to a past or future date in the prompt).

### 2.3 Validation rules (Zod, in `@marketlum/shared`)

`createRecurringFlowSchema`:
- `valueStreamId`, `counterpartyAgentId` &mdash; non-empty uuid
- `valueId`, `offeringId`, `agreementId` &mdash; optional uuid or `null`
- `direction` &mdash; one of `inbound` / `outbound`
- `amount` &mdash; positive number (string or number on input, normalised to string)
- `unit` &mdash; trimmed string, 1&ndash;32 chars
- `frequency` &mdash; one of the five values
- `interval` &mdash; integer &ge; 1, default 1
- `anchorDate` &mdash; ISO date string
- `endDate` &mdash; optional ISO date string, must be &ge; `anchorDate`
- `description` &mdash; optional string
- `taxonomyIds` &mdash; optional uuid array
- Cross-field: if `direction === 'inbound'` and `offeringId` is set, no extra check; symmetric for outbound. (No hard cross-direction rule on `offeringId`; the link is informational.)

`updateRecurringFlowSchema`: all fields optional; same per-field rules. `status` is **not** mutable via update &mdash; status changes go through dedicated transition endpoints (see §3).

`transitionRecurringFlowSchema`: `{ action: 'activate' | 'pause' | 'resume' | 'end', endDate?: ISO date }` &mdash; `endDate` only relevant for `end`.

---

## 3. API Surface

All endpoints under `/recurring-flows`. JSON in/out. Uses the standard `ZodValidationPipe` for body/query validation.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/recurring-flows` | List with filters (see below) |
| `POST` | `/recurring-flows` | Create |
| `GET` | `/recurring-flows/:id` | Detail (includes related entities) |
| `PATCH` | `/recurring-flows/:id` | Update non-status fields |
| `DELETE` | `/recurring-flows/:id` | Delete (only allowed for `draft` flows; otherwise end first) |
| `POST` | `/recurring-flows/:id/transitions` | Activate / pause / resume / end |
| `GET` | `/recurring-flows/export.csv` | CSV export of the filtered list |
| `GET` | `/value-streams/:id/recurring-flows` | Scoped list for a single stream |
| `GET` | `/value-streams/:id/recurring-flows/rollup` | Per-stream rollup (see §4) |
| `GET` | `/value-streams/:id/recurring-flows/projection` | Per-stream projection (see §4) |

### 3.1 List filters (`GET /recurring-flows`)

Query params (all optional):
- `valueStreamId` &mdash; uuid
- `counterpartyAgentId` &mdash; uuid
- `direction` &mdash; `inbound` / `outbound`
- `status` &mdash; one of the four states (repeatable for multi-select)
- `frequency` &mdash; repeatable
- `unit` &mdash; exact match (repeatable)
- `taxonomyId` &mdash; repeatable; matches any
- `q` &mdash; free-text search across `description`
- `page`, `pageSize` &mdash; standard pagination
- `sortBy`, `sortDir` &mdash; standard sort (default: `anchorDate` desc)

Default behavior: returns all statuses including `ended` (UI applies `status != ended` by default; see §5).

### 3.2 Rollup endpoint

`GET /value-streams/:id/recurring-flows/rollup` returns:

```json
{
  "valueStreamId": "...",
  "activeFlowCount": 12,
  "byDirection": [
    {
      "direction": "inbound",
      "totals": [
        { "unit": "USD", "monthly": "5000.0000", "annualized": "60000.0000" },
        { "unit": "EUR", "monthly": "800.0000",  "annualized": "9600.0000" }
      ]
    },
    {
      "direction": "outbound",
      "totals": [
        { "unit": "USD", "monthly": "1200.0000", "annualized": "14400.0000" }
      ]
    }
  ],
  "net": [
    { "unit": "USD", "monthly": "3800.0000", "annualized": "45600.0000" },
    { "unit": "EUR", "monthly": "800.0000",  "annualized": "9600.0000" }
  ]
}
```

**Monthly normalisation rule:** each active flow contributes `amount * occurrences-per-month` to its unit&apos;s total. Conversion table:

| frequency | occurrences per month |
|---|---|
| `daily` | `30 / interval` |
| `weekly` | `(52 / 12) / interval` ≈ `4.3333 / interval` |
| `monthly` | `1 / interval` |
| `quarterly` | `1 / (3 * interval)` |
| `yearly` | `1 / (12 * interval)` |

Annualised is `monthly * 12`. Net is `inbound - outbound` per unit (only units present on both sides appear in the net; inbound-only or outbound-only units appear under their direction only and are listed in `net` with `inbound`/`outbound` sign preserved).

### 3.3 Projection endpoint

`GET /value-streams/:id/recurring-flows/projection?monthsAhead=12` returns per-month totals for the next N months (default 12, max 36), one entry per `(month, direction, unit)`:

```json
{
  "valueStreamId": "...",
  "horizonMonths": 12,
  "months": [
    {
      "month": "2026-06",
      "byDirection": [
        { "direction": "inbound", "totals": [{ "unit": "USD", "amount": "5000.0000" }] },
        { "direction": "outbound", "totals": [{ "unit": "USD", "amount": "1200.0000" }] }
      ]
    },
    { "month": "2026-07", "byDirection": [ ... ] }
    // ...
  ]
}
```

The projection counts occurrences whose date falls in the calendar month, using each flow&apos;s `anchorDate` + `frequency` + `interval`, clipped by `status` (only `active` and `paused` &mdash; though paused flows contribute zero) and `endDate`. **Paused flows** are projected as **zero** for paused months (they don&apos;t generate occurrences) but still appear in metadata; **ended** and `draft` flows are excluded.

### 3.4 Transition endpoint

`POST /recurring-flows/:id/transitions` body:

```json
{ "action": "end", "endDate": "2026-12-31" }
```

Server validates against the state machine and 400s on illegal transitions with `{ "error": "Illegal transition: active → draft" }`.

---

## 4. Domain Helpers (in `@marketlum/shared`)

Pure-function helpers, no I/O:

- `nextOccurrences(flow, count): Date[]` &mdash; first N occurrence dates from `anchorDate`, respecting `endDate`.
- `occurrencesInMonth(flow, yearMonth: { year, month }): number` &mdash; count of occurrences in a given month.
- `monthlyEquivalent(flow): number` &mdash; the per-month contribution as defined in §3.2.
- `formatFrequency(flow): string` &mdash; e.g. `&ldquo;every 1 month&rdquo;`, `&ldquo;every 2 years&rdquo;`.
- `RecurringFlowStateMachine` &mdash; defines legal transitions; consumed by both API and UI.

All date math uses native `Date` (no `date-fns` / `luxon`). Helpers operate in UTC.

---

## 5. UI / UX

### 5.1 Top-level page: `/admin/recurring-flows`

Standard admin shell with a `DataTable` and a toolbar.

**Columns** (column-visibility toggleable; default-shown marked **\***):
- **\*** Direction (icon: ↓ green for `inbound`, ↑ red for `outbound`)
- **\*** Counterparty (link to Agent detail)
- **\*** Value (link to Value detail, when set; otherwise dash)
- **\*** Description (truncated)
- **\*** Amount + Unit (right-aligned, e.g. `5,000.00 USD`)
- **\*** Frequency (`every 1 month`)
- Anchor date
- End date
- **\*** Status (badge)
- **\*** Value Stream (link)
- Created at

**Toolbar:**
- Filter sheet: Direction, Status (multi), Frequency (multi), Unit (multi), Counterparty (combobox), Value Stream (combobox), Taxonomy (multi-combobox)
- Free-text search (description)
- Column visibility dropdown
- `Export CSV` button (calls `/recurring-flows/export.csv` with current filters)
- `New Recurring Flow` primary button

**Defaults:**
- Status filter pre-applied to exclude `ended` (visible chip; user can clear)
- Sort: `anchorDate` desc

### 5.2 Per-stream tab: `/admin/value-streams/[id]` &rarr; &ldquo;Flows&rdquo; tab

Two tabs at the top of the stream detail page:
1. **Overview** (existing content) &mdash; with a new `RecurringFlowsSummaryCard` injected at the top.
2. **Flows** &mdash; scoped DataTable (same columns as §5.1 minus the `Value Stream` column; `New Recurring Flow` pre-fills the stream).
3. **Projections** &mdash; chart + table (§5.4).

### 5.3 Summary card

`RecurringFlowsSummaryCard` props: `valueStreamId`.

Renders three columns (Revenues / Expenses / Net) and a fourth small block (`Active flows: 12`). Each column lists per-unit totals as `$5,000.00 / mo`, `€800.00 / mo`. Long unit lists are truncated with a &ldquo;+2 more&rdquo; affordance.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Recurring Flows                                                        │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│  REVENUES        │  EXPENSES        │  NET             │  Active flows │
│                  │                  │                  │       12      │
│  $5,000.00 / mo  │  $1,200.00 / mo  │  $3,800.00 / mo  │               │
│  €800.00   / mo  │                  │  €800.00   / mo  │               │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

Backed by a single fetch to `/value-streams/:id/recurring-flows/rollup`.

### 5.4 Projections view

The &ldquo;Projections&rdquo; tab renders:

1. **Horizon selector** (3 / 6 / 12 / 24 / 36 months; default 12)
2. **Unit filter** (multi-select; defaults to all)
3. **Stacked-bar chart** (one bar per month; revenue stacked green up, expense stacked red down; one series per unit)
4. **Breakdown table** below the chart: rows = months, columns = `Revenue (per-unit), Expense (per-unit), Net`

Chart implementation in `@marketlum/ui/components/charts/recurring-flows-projection-chart.tsx`, using `d3` (already a UI dep) wrapped in a small React component (no new dependency).

### 5.5 Create / edit form

Modal dialog (matches existing entity dialogs), with sections:

1. **Direction** &mdash; segmented control (`Inbound` / `Outbound`)
2. **Value Stream** &mdash; combobox (locked if opened from a stream context)
3. **Counterparty** &mdash; Agent combobox (required)
4. **Value** &mdash; Value combobox (optional)
5. **Amount + Unit** &mdash; two side-by-side inputs
6. **Recurrence** &mdash; inline row: `Every [interval] [frequency] starting [anchorDate]`, with optional `ending [endDate]` toggle
   - Below the row: dim text `Next 3 occurrences: Feb 15, Mar 15, Apr 15`
7. **Description** &mdash; textarea
8. **Categorisation** &mdash; taxonomy multi-combobox
9. **Optional links** &mdash; collapsible section: Offering combobox, Agreement combobox

`status` is **not** on the form. On create, the flow is born `draft`. Status transitions happen via the dedicated action menu (§5.6).

### 5.6 Status actions

On both the row and the detail/dialog, an action menu (`…`) shows the legal transitions only:

- `draft` &rarr; `Activate`, `Delete`, `Edit`
- `active` &rarr; `Pause`, `End`, `Edit`
- `paused` &rarr; `Resume`, `End`, `Edit`
- `ended` &rarr; `Clone`, `Edit` (read-mostly)

`End` opens a small dialog prompting for `endDate` (default: today). `Clone` opens the create dialog pre-populated with the source flow&apos;s data and `status = draft`, `anchorDate = today`.

### 5.7 Navigation

A new entry in the admin sidebar: **Recurring Flows** (uses an icon like `RefreshCw` from lucide), placed between **Exchanges** and **Invoices**.

---

## 6. Database

### 6.1 New tables

**`recurring_flows`**

```sql
CREATE TYPE recurring_flow_direction_enum AS ENUM ('inbound', 'outbound');
CREATE TYPE recurring_flow_frequency_enum AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE recurring_flow_status_enum AS ENUM ('draft', 'active', 'paused', 'ended');

CREATE TABLE recurring_flows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "valueStreamId" uuid NOT NULL REFERENCES value_streams(id) ON DELETE RESTRICT,
  "counterpartyAgentId" uuid NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  "valueId" uuid REFERENCES values(id) ON DELETE SET NULL,
  "offeringId" uuid REFERENCES offerings(id) ON DELETE SET NULL,
  "agreementId" uuid REFERENCES agreements(id) ON DELETE SET NULL,
  direction recurring_flow_direction_enum NOT NULL,
  amount numeric(14, 4) NOT NULL CHECK (amount > 0),
  unit varchar(32) NOT NULL,
  frequency recurring_flow_frequency_enum NOT NULL,
  "interval" int NOT NULL DEFAULT 1 CHECK ("interval" >= 1),
  "anchorDate" date NOT NULL,
  "endDate" date CHECK ("endDate" IS NULL OR "endDate" >= "anchorDate"),
  status recurring_flow_status_enum NOT NULL DEFAULT 'draft',
  description text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_flows_value_stream ON recurring_flows("valueStreamId");
CREATE INDEX idx_recurring_flows_agent ON recurring_flows("counterpartyAgentId");
CREATE INDEX idx_recurring_flows_status ON recurring_flows(status);
CREATE INDEX idx_recurring_flows_anchor_date ON recurring_flows("anchorDate");
```

**`recurring_flow_taxonomies`** (join table)

```sql
CREATE TABLE recurring_flow_taxonomies (
  "recurringFlowId" uuid NOT NULL REFERENCES recurring_flows(id) ON DELETE CASCADE,
  "taxonomyId" uuid NOT NULL REFERENCES taxonomies(id) ON DELETE CASCADE,
  PRIMARY KEY ("recurringFlowId", "taxonomyId")
);

CREATE INDEX idx_recurring_flow_taxonomies_taxonomy ON recurring_flow_taxonomies("taxonomyId");
```

### 6.2 Migration

Single hand-written migration `<timestamp>-AddRecurringFlows.ts` registered in `packages/core/src/migrations/index.ts`. Up creates the enums, both tables, and indexes. Down drops them in reverse. No backfill needed (greenfield feature).

### 6.3 Referential integrity

- `valueStreamId`, `counterpartyAgentId` &mdash; `ON DELETE RESTRICT`. Deleting a stream or agent with any non-`ended` flow returns a `409 Conflict` with a structured error pointing at the conflicting flows.
- `valueId`, `offeringId`, `agreementId` &mdash; `ON DELETE SET NULL`. Optional references survive their target&apos;s removal.
- Application-level reinforcement: the `delete` endpoints for `Agent` and `ValueStream` pre-check for blocking flows and return a friendly message listing them.

---

## 7. Permissions

Implemented in `RecurringFlowsService` and `RecurringFlowsController`:

| Action | Who |
|---|---|
| List, read | Any authenticated user |
| Create, update, delete, transition | Platform admin **OR** the `leadUserId` of the flow&apos;s `ValueStream` |
| Export CSV | Same as list/read (any authenticated user) |

A new guard `ValueStreamLeadOrAdminGuard` (or service-level check) reads the flow&apos;s value stream and verifies `req.user.id === stream.leadUserId || req.user.isAdmin`. Failed checks return `403 Forbidden`.

---

## 8. Backend Module Layout

`packages/core/src/recurring-flows/`

```
entities/
  recurring-flow.entity.ts
recurring-flow.dto.ts
recurring-flows.controller.ts
recurring-flows.service.ts
recurring-flows.module.ts
projection.service.ts          # pure projection logic, calls helpers from @marketlum/shared
rollup.service.ts              # rollup queries
```

Registered in `marketlum-core.module.ts` alongside existing modules. Exports `RecurringFlowsService` from `packages/core/src/index.ts`.

---

## 9. Shared Package Additions

`packages/shared/src/`

```
recurring-flow.ts                     # DTOs / Zod schemas / types
recurring-flow.state-machine.ts       # state transitions
recurring-flow.helpers.ts             # nextOccurrences, monthlyEquivalent, formatFrequency, occurrencesInMonth
```

All exported from `packages/shared/src/index.ts`.

Remember to rebuild shared (`pnpm --filter @marketlum/shared build`) before API tests can pick up the new exports (existing gotcha).

---

## 10. UI Package Additions

`packages/ui/src/`

```
components/recurring-flows/
  columns.tsx
  recurring-flows-data-table.tsx
  recurring-flow-form-dialog.tsx
  recurring-flow-recurrence-input.tsx   # the inline natural-language builder + preview
  recurring-flow-status-badge.tsx
  recurring-flow-status-actions.tsx     # menu + end-date dialog
  recurring-flows-summary-card.tsx
components/charts/
  recurring-flows-projection-chart.tsx  # d3 + React wrapper
pages/
  recurring-flows-page.tsx              # top-level /admin/recurring-flows
  recurring-flow-detail-page.tsx
```

All exported from `packages/ui/src/index.ts`. New translation keys added to `packages/ui/messages/en.json` and `pl.json` under `RecurringFlows.*`.

---

## 11. Web App Wiring

`apps/web/src/app/admin/recurring-flows/page.tsx` &mdash; re-exports `RecurringFlowsPage` from `@marketlum/ui`.

`apps/web/src/app/admin/value-streams/[id]/page.tsx` &mdash; updated to render the Overview / Flows / Projections tabs and inject the summary card. (Currently this file already lives in the scaffolded shell; the tabbed shell is added here.)

Per the template-sync rule, both pages are mirrored under `packages/create-marketlum-app/template/web/src/app/admin/`.

---

## 12. Seed Data

`packages/core/src/commands/seeders/recurring-flow.seeder.ts`:

For each existing value stream produced by the sample seeder, generate **3&ndash;5** recurring flows:
- Mix of `inbound` and `outbound` (at least one of each per stream where possible)
- Units mixed across `USD`, `EUR`, `hours` (and one `FTE` example)
- Frequencies mixed across `monthly`, `quarterly`, `yearly`
- `interval` mostly `1`, occasionally `2` or `3`
- `anchorDate` randomly in the last 18 months
- Counterparty agents drawn from the existing seeded agents (filtered to avoid the value stream&apos;s own lead, where applicable)
- Status mostly `active`, a few `paused`, one or two `ended`
- Approx half link to an existing offering, a third link to an agreement, none links to a value (Value reference is contextual; let downstream usage drive seeded examples later)

Invoked from `seed-sample.command.ts` after the agreement / offering seeders.

---

## 13. Test Coverage (BDD)

Per the strict BDD workflow, feature files live in `packages/bdd/features/recurring-flows/` and step definitions in `apps/api/test/recurring-flows/`. Expect a scenario count in the same range as `offerings` (~28&ndash;35).

Feature files (one per area, approx. scenarios shown):

- `create-recurring-flow.feature` (5)
- `list-recurring-flows.feature` (4: pagination, filters, search, sort)
- `read-recurring-flow.feature` (2)
- `update-recurring-flow.feature` (3)
- `delete-recurring-flow.feature` (3: only-draft, blocks otherwise, cascade-on-stream-delete-restricted)
- `status-transitions.feature` (6: each legal transition + illegal-transition rejection + end-date capture)
- `permissions.feature` (4: admin-can-do-all, lead-can-do-own-stream, non-lead-cannot, anyone-can-read)
- `referential-integrity.feature` (3: agent-delete-restricted, value-delete-nullifies, stream-delete-restricted)
- `rollup.feature` (3: empty stream, single unit, mixed units with net)
- `projection.feature` (3: empty, monthly only, mixed frequencies and units)
- `csv-export.feature` (1)

Total ≈ 37 scenarios.

---

## 14. Out of Scope (v1)

- Auto-materialising `Transaction` rows from recurring flows (Q1.3).
- Currency conversion across units (Q3.6).
- Allocation splits across multiple value streams (Q1.5).
- RRULE / cron / freeform recurrence expressions (Q2.3).
- Bulk operations on the list view (Q3.7).
- Audit log / change-reason capture on status transitions (Q3.7).
- Soft-delete on Agent (Q4.3).
- Excel / PDF export (Q4.4).
- A dedicated calendar view of occurrences (Q3.5).

Any of these can be a follow-up once v1 has feedback.

---

## 15. Delivery Plan

Single PR titled `Add recurring flows for value streams`. Order of work within the PR:

1. Schemas, state machine, helpers in `@marketlum/shared` (+ tests of the pure helpers as plain unit tests).
2. TypeORM entity + migration in `@marketlum/core`.
3. Service (CRUD), rollup service, projection service.
4. Controller (REST endpoints) + permission guard.
5. Module wiring + public exports.
6. BDD feature files + step definitions; iterate until green.
7. Shared package rebuild.
8. UI components (table, form dialog, recurrence input, status actions, summary card, projection chart).
9. Pages and admin sidebar wiring.
10. i18n strings.
11. Seeder additions.
12. Template sync to `packages/create-marketlum-app/template/web/src/app/admin/`.

Verification before merge:
- `pnpm test:e2e` green.
- `pnpm build` green across all packages.
- Manual UI walkthrough of the seven scenarios in §13&apos;s `status-transitions.feature`.
- Visual check of the summary card and projection chart against the seed data.
