# Per-Agent Functional Currency — Brainstorming

> **Goal:** Replace the single global base currency with a per-agent functional currency, plus a system-wide presentation currency for consolidated views. Use snapshot strategy A (dual per-row snapshots) and lazy re-snapshotting on next write.

> **Process:** This file is append-only. Each round adds a new section at the bottom. Move `[x]` to your chosen option, write free-form notes after `**Answer:**`, and signal "Done" when the round is complete.

---

## Context

### What exists today

- **No `Currency` entity.** Currencies are `Value` rows with `type='currency'` (added in migration `1700000000045`).
- **Single global base currency** stored as a row in `system_settings`: key `base_value_id`, value is a UUID pointing to a `Value`. Read via `SystemSettingsService.getBaseValueId()` at `packages/core/src/system-settings/system-settings.service.ts:76`. Changing it is blocked once any snapshot exists (`system-settings.service.ts:50`).
- **Exchange rates** are symmetric pairs stored canonically `(fromValueId < toValueId, effectiveAt)`; `ExchangeRatesService.lookup()` flips the rate if queried in reverse (`exchange-rates/exchange-rates.service.ts:181`).
- **Snapshot pattern, applied to two entities only today**: `invoice_items` and `recurring_flows` each carry `rateUsed` (decimal 20,10) + `baseAmount` (decimal 12,2), captured at write time against the system base. Added in migration `1700000000040`.
- **Money-bearing entities**:
  - `Invoice` — required `currencyId` FK to `Value`; required `fromAgentId` + `toAgentId`. Total computed from items.
  - `InvoiceItem` — `quantity`, `unitPrice`, `total` decimals; inherits currency from parent invoice; carries `rateUsed`/`baseAmount`.
  - `RecurringFlow` — `amount` + nullable `currencyId`; required `counterpartyAgentId`; **no owning-agent FK on the parent value stream**; carries `rateUsed`/`baseAmount`.
  - `Account` — required `valueId`; balance is virtual, computed from transactions. Already multi-currency-aware.
  - `Transaction` — `amount` only, currency inherited from linked accounts.
- **Agent entity** (`packages/core/src/agents/entities/agent.entity.ts`): `id`, `name`, `type`, `purpose`, `mainTaxonomyId`, `imageId`, addresses. **No currency field.**
- **ValueStream entity** (`packages/core/src/value-streams/entities/value-stream.entity.ts`): tree structure with `code`, `name`, `purpose`, `leadUserId`. **No owning agent FK.** This is a structural ambiguity for recurring flows: the only agent in the model is the counterparty.
- **Aggregations**:
  - `DashboardService.queryTimeSeries` (`dashboard/dashboard.service.ts:119`) — sums `invoice_items.total` across all currencies silently. Already a latent bug.
  - `RecurringFlowsRollupService` / `ProjectionService` — bucket per currency (safe).
  - `RecurringFlowsBudgetService` — aggregates via `baseAmount`, surfacing skipped flows when snapshot is NULL.
  - `AccountsService` — per-account balance subquery, single-currency by construction.

### Target model

```
                    ┌─────────────────────────┐
                    │  system_settings        │
                    │  presentation_currency  │  (one Value, for consolidated dashboards)
                    └─────────────────────────┘
                                 │
                                 │ (used at query time for cross-agent rollups)
                                 ▼
        ┌─────────────────────────────────────────────────┐
        │                  Agent                          │
        │  + functional_currency_id  ← per-agent books    │
        └─────────────────────────────────────────────────┘
                 ▲                            ▲
                 │                            │
       fromAgent │                            │ toAgent
                 │                            │
                 └──── Invoice ──── currencyId (transaction currency)
                              │
                              └── InvoiceItem
                                     ├── fromAgentAmount/Rate   (from-agent functional)
                                     ├── toAgentAmount/Rate     (to-agent functional)
                                     └── presentationAmount/Rate (system presentation)
```

### Locked decisions (carried in from the chat)

- Snapshot strategy = **A** (dual snapshot columns per row, plus a presentation-currency column).
- Existing snapshots = **re-snapshotted lazily on next write** (NULL until then; UI surfaces "no snapshot" state).
- **Out of scope**: transactions / ledger FX revaluation, FX gain/loss recognition on settlement, per-user presentation currency.

---

## Round 1 — Foundations

This round nails down the terminology, where currency lives, defaults for new data, and exactly which entities get dual snapshots. The one real surprise from the codebase exploration: value streams have no owning agent, which forces a decision on the "self" side of recurring-flow snapshots (Q3).

### Q1 — Terminology

- [x] **`functional_currency` on agent, `presentation_currency` at system level** — matches IFRS terminology; clear distinction between operational and consolidated views
- [ ] **`currency` on agent, `base_currency` at system level** — shorter, more colloquial; reuses the existing "base" word but risks confusion since "base" historically meant system-wide
- [ ] **`reporting_currency` everywhere with role disambiguation** — single term; loses the operational-vs-consolidated distinction

**Answer:**

### Q2 — Nullability of `agents.functional_currency_id`

- [ ] **NOT NULL after backfill** — every agent must have a functional currency; backfill existing rows from current system base; flip column to NOT NULL in the same migration
- [x] **Nullable** — agent without a declared functional currency falls back to the system presentation currency at query time
- [ ] **NOT NULL from the start, fail migration if no presentation currency exists** — strictest; forces deployment ordering

**Answer:**

### Q3 — Whose perspectives are snapshotted on a recurring flow?

`ValueStream` has no owning agent, so the only agent attached to a `RecurringFlow` is the counterparty. The "self" side has no agent to draw a functional currency from. Options:

- [ ] **Snapshot counterparty-agent functional + system presentation only** — one agent-side column pair (`counterpartyAgentAmount` / `counterpartyAgentRate`) plus the presentation pair. Mirrors the data model honestly. Matches invoices' dual pattern only loosely.
- [x] **Add an owning agent to `ValueStream`** — model the "self" side as a real agent; recurring flows then get full dual snapshots like invoices. Bigger change but more uniform.
- [ ] **Treat system presentation currency as the "self" side** — both columns exist but `selfAgentAmount` is conceptually the presentation amount. Confusing; effectively the same as option 1 with worse naming.
- [ ] **Defer ValueStream-side snapshots; recurring flows get presentation-currency snapshot only** — simpler now but loses the per-agent point for flows.

**Answer:**

### Q4 — Invoice item snapshot columns

Confirming the column layout on `invoice_items` (the user has already chosen strategy A; this nails the names):

- [x] **`fromAgentAmount` / `fromAgentRate` + `toAgentAmount` / `toAgentRate` + `presentationAmount` / `presentationRate`** — three pairs; explicit perspective names matching `Invoice.fromAgentId` / `toAgentId`
- [ ] **`payerAmount` / `payeeAmount` / `presentationAmount`** — accounting-oriented names; risks confusion if direction differs from convention (e.g. credit notes)
- [ ] **Polymorphic: `snapshots` JSONB column keyed by agent id** — flexible; harder to query/index; doesn't match the rest of the schema's style

**Answer:**

### Q5 — Presentation currency storage in `system_settings`

The current key is `base_value_id`. Options:

- [x] **Rename via data migration: `base_value_id` → `presentation_currency_id`** — clean break; new code reads only the new key; the existing snapshot-lock semantics carry over to the renamed key
- [ ] **Keep `base_value_id` as the storage key, change only the semantic interpretation** — no data migration; less invasive; but every reader still uses the legacy name forever
- [ ] **Add `presentation_currency_id` alongside, deprecate `base_value_id`** — both keys exist during transition; risk of drift between them

**Answer:**

### Q6 — Default functional currency for new agents

- [ ] **Default to system presentation currency, pre-filled in the form, user can change** — least friction; matches today's behaviour where everything assumed one currency
- [x] **Required field, no default** — user must pick explicitly; better data quality, more friction
- [ ] **Inherit from a related entity (e.g. main taxonomy or country in primary address)** — clever but unreliable; not enough signal

**Answer:**

### Q7 — Scope: which entities get dual snapshots?

- [x] **`invoice_items` and `recurring_flows` only** — same two entities that today carry `baseAmount`/`rateUsed`. Accounts/transactions remain single-currency-per-account (no FX revaluation). Offerings, agreements, value streams have no money columns and are unaffected.
- [ ] **Plus accounts/transactions with FX revaluation** — full multi-currency ledger; significantly larger project
- [ ] **Just `invoice_items`** — recurring flows keep a single presentation snapshot; smaller blast radius but inconsistent with the per-agent goal
- [ ] **All entities with any decimal column (quantities, etc.)** — over-broad; sweeps in non-money decimals

**Answer:**

### Q8 — Behaviour of the snapshot-lock guard on presentation currency change

Today `SystemSettingsService.setBaseValue` refuses to change the base if any snapshot exists. Under the new model:

- [x] **Keep the lock for the *presentation* currency** — changing the presentation currency invalidates all `presentationAmount` snapshots, so block it once any exist (one-way migration via re-snapshot or admin tool)
- [ ] **Drop the lock; recompute presentation amounts on read from `*AgentRate`** — more flexible but loses locked historic values
- [ ] **Drop the lock; warn the user and mark old snapshots as "stale"** — flexible with an audit trail; needs a `stale` flag and UI

**Answer:**

---

When you've worked through Q1–Q8, reply with **Done** (or any signal) and I'll summarise the accepted answers and append Round 2 (Shape: write paths, exchange-rate lookup semantics, validation, error handling).

---

## Round 1 — Accepted answers

- **Q1** Terminology: `functional_currency` on agent, `presentation_currency` at system level.
- **Q2** *(changed)* `agents.functional_currency_id` is **nullable**; falls back to presentation currency at query time.
- **Q3** *(changed)* Add an owning agent to `ValueStream` so recurring flows get full dual snapshots (uniform with invoices).
- **Q4** `invoice_items` columns: `fromAgentAmount`/`Rate` + `toAgentAmount`/`Rate` + `presentationAmount`/`Rate`.
- **Q5** Rename `system_settings` key `base_value_id` → `presentation_currency_id` via data migration.
- **Q6** *(changed)* New agents: **required field, no default** (Zod-enforced; DB column stays nullable per Q2).
- **Q7** Dual snapshots on `invoice_items` and `recurring_flows` only; accounts/transactions unchanged.
- **Q8** Keep the snapshot-lock guard for the presentation currency.

**Reconciliation:** Q2 (nullable column) + Q6 (required on create) coexist — DB is permissive for legacy rows; Zod is strict on the create/update API. ValueStream gaining `agentId` (Q3) means recurring-flow snapshots become symmetric with invoices.

---

## Round 2 — Shape & Write Paths

With the structural shape settled, this round defines the moving parts: when snapshots get captured, which rate is used, and how the system degrades when data is missing.

### Q1 — `ValueStream.agentId` nullability + backfill

- [x] **Nullable column, no backfill** — existing value streams stay `NULL`; users fill in via the UI when relevant; recurring-flow snapshots leave the value-stream-agent pair `NULL` when the stream's agent is unset
- [ ] **NOT NULL, backfill to a single chosen agent** — strictest; requires picking a sensible default agent for every existing stream (which doesn't really exist)
- [ ] **Nullable column, backfill to the agent of the first attached recurring flow's counterparty** — clever heuristic, but a stream's "self" agent isn't its counterparty; almost always wrong

**Answer:**

### Q2 — Tree inheritance for `ValueStream.agentId`

Value streams form a closure-table tree. When a child is created under a parent:

- [ ] **Visual inheritance (form default)** — the create form pre-fills the child's agent from the parent; user can override before saving; stored value is explicit
- [ ] **Hard inheritance (stored as NULL, resolved up the tree at query time)** — DRY but every read pays a tree walk; subtle when a parent's agent changes
- [x] **No inheritance** — each stream's agent is independent; risk of inconsistent trees but simplest semantics

**Answer:**

### Q3 — Recurring flow snapshot column naming

Now that the value stream has an owning agent, recurring flows have two real agent perspectives:

- [ ] **`valueStreamAgentAmount`/`valueStreamAgentRate` + `counterpartyAgentAmount`/`counterpartyAgentRate` + `presentationAmount`/`presentationRate`** — names map directly to the FKs they derive from; verbose but self-documenting
- [x] **`fromAgentAmount`/`toAgentAmount`** with the direction enum deciding which is which — mirrors invoices' naming; couples column semantics to the `RecurringFlowDirection` enum (INCOMING/OUTGOING), which is fragile if direction changes
- [ ] **`selfAgentAmount`/`counterpartyAgentAmount`** — shorter; "self" loses the link back to `ValueStream.agentId`

**Answer:**

### Q4 — Effective date for rate lookup

Which date is passed to `ExchangeRatesService.lookup(from, to, at)` when capturing a snapshot?

- [x] **Business date on the row** — `Invoice.issuedAt` for invoice items, `RecurringFlow.startDate` for flows. Matches when the obligation was created.
- [ ] **Row `createdAt`** — when the row was saved in the system. Diverges from business reality if you back-date an invoice.
- [ ] **`updatedAt` at re-snapshot time** — locks every re-snapshot to "now," so historic invoices re-saved tomorrow get tomorrow's rate. Probably wrong.

**Answer:**

### Q5 — Snapshot fallback when an agent's `functional_currency_id` is NULL

Since `agents.functional_currency_id` is nullable (Q2/R1) and `ValueStream.agentId` is nullable (Q1/R2), the relevant agent on a row may not have a functional currency to convert into. Options:

- [x] **Leave that perspective's `*Amount` / `*Rate` columns NULL; UI surfaces "no agent-side snapshot"** — same graceful degradation as today's `noRate` state
- [ ] **Fall back to the presentation currency for that perspective** — every row always has values; obscures that the agent has no declared currency
- [ ] **Block the save with a validation error** — forces explicit currency setup before any invoice/flow can be written; brittle during onboarding

**Answer:**

### Q6 — Snapshot fallback when no exchange rate exists for the pair on the effective date

- [x] **Leave the affected `*Amount` / `*Rate` columns NULL; UI surfaces "no rate"** — current behaviour for the single base; extend it per-pair
- [ ] **Block the save with a validation error** — forces an admin to enter a rate before any invoice/flow involving that currency can be written
- [ ] **Fall back to the most recent rate regardless of date** — convenient but silently uses stale FX

**Answer:**

### Q7 — Can an agent's `functional_currency_id` change once snapshots reference it?

Symmetric to the presentation-currency lock in Q8/R1, but at the agent level:

- [x] **Yes, with a UI warning** — historic snapshots remain locked in the previous currency (correct accounting); future writes use the new currency; modal lists affected row counts before confirming
- [ ] **Yes, freely (no warning)** — minimal friction; risk of users not realising past data is in the old currency
- [ ] **No, blocked once any snapshot references the agent** — strict; mirrors presentation-currency lock; over-restrictive for an agent-level setting

**Answer:**

### Q8 — Re-snapshot trigger condition

The "lazy re-snapshot on next write" rule from the locked decisions — what counts as "a write"?

- [x] **Any save to the row** — call `service.save()`; snapshot logic runs unconditionally; simplest, matches current invoice/flow services
- [ ] **Only when amount-, currency-, or date-affecting fields change** — cheaper; needs change detection; risks missing updates if a relevant field changes via a path that bypasses the diff check
- [ ] **Only when explicitly triggered (admin "re-snapshot" endpoint)** — fully manual; predictable but adds operator burden

**Answer:**

---

When you've worked through Q1–Q8, reply **Done** and I'll summarise and append Round 3 (UI / UX: agent form, value stream form, dashboard currency toggle, invoice list columns, validation messages).

---

## Round 2 — Accepted answers

- **Q1** `ValueStream.agentId` is nullable; no backfill of existing streams.
- **Q2** *(changed)* No tree inheritance for `ValueStream.agentId`; each stream's agent is independent.
- **Q3** *(changed)* Recurring flow snapshot columns are `fromAgentAmount`/`fromAgentRate` + `toAgentAmount`/`toAgentRate` + `presentationAmount`/`presentationRate`, identical to `invoice_items`. The `from`/`to` mapping is direction-dependent — `INCOMING` ⇒ counterparty is `fromAgent`, value-stream agent is `toAgent`; `OUTGOING` reverses it.
- **Q4** Effective date for `ExchangeRatesService.lookup`: `Invoice.issuedAt` for invoice items; `RecurringFlow.startDate` for flows.
- **Q5** When an agent's `functional_currency_id` is NULL, leave that perspective's `*Amount`/`*Rate` NULL; UI surfaces "no agent-side snapshot".
- **Q6** When no exchange rate exists for the pair/date, leave the affected `*Amount`/`*Rate` NULL; UI surfaces "no rate".
- **Q7** Agent functional-currency changes are allowed with a UI warning that lists affected row counts (historic snapshots stay locked in old currency).
- **Q8** Re-snapshot trigger = any save to the row (unconditional, matches current pattern).

**Consequence:** `invoice_items` and `recurring_flows` end up with structurally identical snapshot column sets, simplifying shared helpers, schemas, and aggregation queries.

---

## Round 3 — UI / UX

The model and write paths are settled. This round defines how users interact with functional currency in the admin: where the selectors live, how perspective is communicated in lists/dashboards, and how NULL snapshots and currency changes surface visually.

### Q1 — Agent edit form: functional currency selector

The agent edit page lives under `apps/web/src/app/admin/agents/[id]/page.tsx` (mirrored to template). Today it has name, type, purpose, main taxonomy, image, addresses.

- [x] **New field in the main form block, after `purpose`, as a searchable Value combobox filtered to `type='currency'`** — sits with other agent attributes; matches existing combobox pattern in the codebase
- [ ] **New collapsible "Accounting" sub-section** — groups currency with future accounting fields (tax id, etc.) but is over-engineered for one field today
- [ ] **Inline pill on the agent header** — compact, but harder to discover and inconsistent with how other FK fields are edited

**Answer:**

### Q2 — Value stream edit form: agent selector

Value stream edit form lives under `apps/web/src/app/admin/value-streams/[id]/page.tsx`.

- [x] **New required-looking but optional field after `lead`, as a searchable Agent combobox** — keeps a logical pairing with `lead` (both identify "who owns this stream"); column is nullable so submit is allowed empty
- [ ] **Tab/section "Ownership" with `lead` + `agent`** — over-engineered for two fields
- [ ] **Inline on the stream header** — compact but inconsistent with `lead`'s placement in the form

**Answer:**

### Q3 — Functional-currency change confirmation flow on the agent form

When the user changes an agent's `functional_currency_id` and the agent is referenced by existing snapshots:

- [ ] **Modal on save: "X invoice items and Y recurring flows reference {Agent} in {oldCurrency}. Historic snapshots will remain in {oldCurrency}. New writes will use {newCurrency}. Confirm?"** — explicit, auditable, single confirmation gate
- [x] **Inline warning banner above the form** — passive; user may click save without reading
- [ ] **No warning; rely on tooltip on the field** — too easy to miss; risk of accidental change

**Answer:**

### Q4 — Invoice list table: which amount columns are shown?

Current invoice list (`packages/ui/src/components/invoices/columns.tsx`) shows `total` (invoice currency) and `baseTotal` (current single base). Per-agent functional brings more options:

- [x] **`total` (invoice currency) + `presentationTotal` (system presentation, sum of `presentationAmount`)** — keeps the existing two-column layout; matches today's mental model; per-agent views happen on agent detail pages
- [ ] **`total` + `fromAgentTotal` + `toAgentTotal` + `presentationTotal`** — four columns; complete but cluttered for a list view
- [ ] **`total` + a "View in" selector that swaps between presentation / from-agent / to-agent** — flexible but adds UI state and surprises in CSV exports
- [ ] **`total` only, drop snapshot columns from the list** — simplest; users see snapshots only on detail page

**Answer:**

### Q5 — Invoice detail page: displaying three snapshot perspectives

On the invoice detail view, each item carries three snapshot pairs. Options:

- [x] **Three subtotal rows in the totals block** — "Total (in {invoiceCurrency})", "In {fromAgent}'s books ({fromCurrency})", "In {toAgent}'s books ({toCurrency})", "In presentation ({presentationCurrency})". Each row hidden if currency identical to invoice currency to avoid noise.
- [ ] **One row + a "Show all perspectives" toggle** — saves vertical space; hides useful information by default
- [ ] **Per-item snapshot columns in the items table** — fine-grained but very wide; obscures the per-invoice view

**Answer:**

### Q6 — Dashboard time series default currency

`DashboardService.queryTimeSeries` today sums `invoice_items.total` across currencies (latent bug). Options for the rewrite:

- [x] **Sum `presentationAmount` (system presentation currency); skip rows where it's NULL; surface "X items not converted" warning** — matches today's intent; consolidates correctly; uses the snapshot pattern already proven by `RecurringFlowsBudgetService`
- [ ] **Show separate series per invoice currency** — no conversion needed; cluttered if many currencies
- [ ] **Sum in a user-chosen currency via "View in" dropdown** — flexible; requires re-conversion logic at query time and pushes complexity to clients

**Answer:**

### Q7 — Per-agent dashboard view

Per-agent financial summaries (in that agent's functional currency) are a natural follow-up. For this spec:

- [x] **Defer per-agent dashboard to a follow-up spec** — keep current dashboard scope (consolidated, presentation currency); add a single "Functional currency" field on the agent detail page (read-only summary card)
- [ ] **Add a basic per-agent rollup on agent detail page in this spec** — total receivables/payables in functional currency; reuses snapshot data but adds new endpoint + UI
- [ ] **Add full per-agent dashboard mirroring the global one** — scope explosion

**Answer:**

### Q8 — Visual indicator for NULL snapshots

When `presentationAmount` or an agent-side amount is NULL on a row (no rate / no functional currency), how is it surfaced?

- [ ] **Muted "—" with hover tooltip explaining why ("no rate on {date}", "{Agent} has no functional currency", etc.)** — consistent with how the current `noRate` state renders; minimal visual noise
- [x] **Warning badge / yellow pill** — more visible; risks alarm fatigue if many rows are missing rates during initial onboarding
- [ ] **Hide the column entirely if any row is NULL** — too aggressive; breaks columnar comparison

**Answer:**

---

When you've worked through Q1–Q8, reply **Done** and I'll summarise and append Round 4 (Integration, security, delivery: ValueStream agent-FK migration ordering, permission scoping, seed data updates, BDD coverage breakdown, phased rollout).

---

## Round 3 — Accepted answers

- **Q1** Agent edit form: Value combobox (filtered to `type='currency'`) after `purpose`.
- **Q2** Value stream edit form: Agent combobox after `lead`.
- **Q3** *(changed)* Inline warning banner above the form when changing functional currency on an agent that has referencing snapshots (passive, no modal).
- **Q4** Invoice list table keeps two columns: `total` (invoice currency) + `presentationTotal`.
- **Q5** Invoice detail page shows three subtotal rows in the totals block; rows identical to the invoice currency are hidden.
- **Q6** Dashboard sums `presentationAmount`, skips NULL rows, and surfaces an "X items not converted" warning.
- **Q7** Per-agent dashboard deferred; agent detail page shows a read-only "Functional currency" card.
- **Q8** *(changed)* NULL snapshots render as a yellow warning badge / pill, not a muted dash.

---

## Round 4 — Integration, Security & Delivery

Final round. Locks down auth, migration strategy, seed data, domain events, exports, and BDD coverage so the spec can be turned into an implementation plan.

### Q1 — Permissions on new and changed endpoints

- [x] **`AdminGuard` on every new/changed endpoint** — matches the project default (`OfferingsController`, `LocalesController`, etc.); no per-agent ownership scoping for this iteration
- [ ] **`AdminGuard` plus per-agent ownership scoping** — non-admin users can only set their own agent's currency; meaningful only once a non-admin role exists, which it doesn't
- [ ] **Open (no guard)** — clearly wrong; included for completeness

**Answer:**

### Q2 — Existing snapshot columns: in-place rename or add-and-drop?

`invoice_items.baseAmount` / `baseRate` and `recurring_flows.baseAmount` / `rateUsed` exist today. Data semantics ("amount in the value that is the system base") map 1:1 onto the new `presentationAmount` / `presentationRate` after the system-settings key rename.

- [x] **In-place rename** — single migration; `ALTER TABLE ... RENAME COLUMN`; preserves data; one breaking commit; matches the locked-decision "lazy re-snapshot on next write" (new `fromAgent*`/`toAgent*` columns are added empty)
- [ ] **Add new columns, copy data, drop old in a later migration** — safer if there were live readers; not needed for solo dev
- [ ] **Keep both columns; write to both during transition** — most cautious; doubles write logic; never needed given no production deployments at play

**Answer:**

### Q3 — Migration commit strategy

- [x] **Single migration covering all schema changes** — `1700000000050-AddFunctionalCurrency.ts` (or similar) handles: rename system_settings key, add `agents.functional_currency_id`, add `value_streams.agentId`, rename and extend invoice_items + recurring_flows columns. Atomic; matches project style of one migration per feature.
- [ ] **One migration per touched table** — five+ migrations; easier to revert one piece; harder to reason about ordering
- [ ] **Phased: schema first, then a second migration that adds the new snapshot columns once write paths are ready** — over-engineered for this codebase

**Answer:**

### Q4 — Seed sample data updates

`pnpm seed:sample` (`packages/core/src/commands/seeders/sample-data.seeder.ts`) currently seeds agents, invoices, etc., all implicitly in the single base currency.

- [x] **Seed at least two agents in different functional currencies (e.g. one USD, one EUR), and an invoice that crosses them** — exercises the dual-snapshot path end-to-end; future BDD smoke tests can rely on it; small, deliberate dataset
- [ ] **Seed all agents with the same functional currency** — leaves cross-currency invoices untested in seed; smaller change but loses coverage
- [ ] **No seed changes; leave existing seeds backfilled to NULL functional currency** — relies on UI/forms to create test data; weaker baseline

**Answer:**

### Q5 — Domain events for functional currency changes

Memory notes the project has a `DomainEventSubscriber` that emits generic `marketlum.<entity_snake>.<created|updated|deleted>` events. A functional-currency change on an agent is already covered by the generic `marketlum.agent.updated` event.

- [x] **Rely on the generic `agent.updated` event** — no new event types; consumers that care can diff the payload
- [ ] **Add a specific `marketlum.agent.functional_currency_changed` domain event** — explicit; new event type to maintain; not requested by any consumer today
- [ ] **No event** — would require suppressing the generic emitter, which is more work than letting it fire

**Answer:**

### Q6 — CSV export columns

Per memory, the project has CSV export for invoices (8 BDD scenarios). Currently exports include `total` and `baseTotal`.

- [x] **Replace `baseTotal` with `presentationTotal` in the exported header and value; keep column count the same** — invisible-rename behaviour; existing import tools that consume header names by string will break, but no such consumers are in-tree
- [ ] **Add `fromAgentTotal` and `toAgentTotal` columns alongside `presentationTotal`** — completionist; wider CSV; matches the new model fully
- [ ] **Keep exporting under the old `baseTotal` header for compatibility** — confusing; column name lies about content

**Answer:**

### Q7 — BDD coverage breakdown

Estimated new/changed `.feature` files and scenario counts (please adjust if you'd like more or fewer):

```
agents/functional-currency.feature            ~6   (create with currency, change with banner, NULL allowed, validation: must be type=currency, …)
value-streams/agent-owner.feature             ~4   (set/unset agent, no tree inheritance, validation)
invoices/snapshot-per-agent.feature           ~8   (3 perspectives written, identical-currency suppression, no-rate NULL, NULL functional currency, cross-currency invoice, lazy re-snapshot on update)
recurring-flows/snapshot-per-agent.feature    ~8   (same shape as invoice; INCOMING vs OUTGOING direction mapping; value-stream-agent NULL)
system-settings/presentation-currency.feature ~4   (rename, lock when snapshots exist, error path, get/set)
dashboard/presentation-currency.feature       ~3   (presentation sum, skip-NULL count, warning surfaces)
```

- [x] **Counts as estimated above (~33 new scenarios), with updates to existing invoice/flow snapshot scenarios** — broadly proportional to other completed specs (008 had ~6, 009 had ~12); enough to cover the new behaviour without bloat
- [ ] **Lighter: cover only happy paths; rely on integration tests for edge cases** — faster; weaker safety net
- [ ] **Heavier: add per-perspective tests for every aggregation service** — diminishing returns; aggregation logic is shared and well-tested already

**Answer:**

### Q8 — Delivery: single PR or phased PRs?

- [x] **Single PR for the whole spec** — additive schema + write paths + UI + tests; given solo dev, simpler review and one rollback unit; matches how prior specs landed
- [ ] **Phased PRs (1) schema + write paths, (2) aggregations, (3) UI** — easier review per step; longer cycle; needs intermediate "dead" UI states
- [ ] **Two PRs: backend (schema/services/tests), then frontend (UI)** — middle ground

**Answer:**

---

When you've worked through Q1–Q8, reply **Done** and I'll write `specs/010-functional-currency-specification.md` and commit both files.
