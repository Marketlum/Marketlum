# 017 — Orders

> **Goal:** Introduce an `Order` entity: unique number, fromAgent/toAgent, a single Channel and Pipeline, a state machine (draft → new → processing → completed, plus cancelled), a currency (Value of type CURRENCY) and a Locale, shipping and billing addresses, and a 1→N link to Invoices.

> **Process:** Structured Q&A brainstorming. Each round appends questions with preselected recommendations (`[x]`). Move the `[x]` or write below `**Answer:**` to override; silence = acceptance. This file is append-only — existing content is never edited or deleted.

## Context

What already exists in the codebase that Orders will touch:

- **Invoices** (`packages/core/src/invoices/`): `@Unique(['fromAgentId','number'])`, fromAgent/toAgent (required), currency (Value), optional channel, `market` (internal/external), items with per-agent snapshot amounts. No order reference today.
- **Agents**: hierarchical (closure table), have an `addresses` child entity (`agent_addresses`: countryCode, line1/line2, city, postalCode, isDefault, lat/lng).
- **Channels**: hierarchical tree (code, name, purpose, color, optional agent).
- **Pipelines**: flat entity (code, name, purpose, description, color, optional valueStream). No stages — `Exchange` references a pipeline *and* keeps its own `state` (xstate machine in `packages/shared/src/machines/exchange.machine.ts`).
- **Locales**: minimal entity (`code` unique).
- **Values**: typed values; currency references use `ValueType.CURRENCY` (pattern: `Invoice.currencyId`, `Agent.functionalCurrencyId`).
- **State machines**: xstate `setup().createMachine()` definitions in `packages/shared/src/machines/` (exchange, tension), enforced in services via transition checks.
- **Domain events**: primary-entity registry emits `marketlum.<entity>.<created|updated|deleted>`.

```
                 ┌─────────┐
  fromAgent ────▶│         │◀──── toAgent
  Channel ──────▶│  ORDER  │◀──── Pipeline
  Currency ─────▶│ number  │◀──── Locale
                 │ state   │
                 │ ship/   │
                 │ bill    │
                 └────┬────┘
                      │ 1..N
                 ┌────▼────┐
                 │ INVOICE │  (gains orderId?)
                 └─────────┘
```

---

## Round 1 — Foundations

This round pins down what an Order *is* structurally: whether it carries money itself, how invoices attach, how the number works, and how addresses are stored.

### Q1. Does an Order carry monetary content of its own (items / totals)?

You didn't mention line items. Invoices already carry items and snapshot amounts.

- [ ] **No items, no stored total** — the Order is a coordination/header record; monetary detail lives on the linked Invoices. A derived "invoiced total" can be shown on the detail page by summing linked invoices in the order's currency. Simplest, no double bookkeeping.
- [ ] **Manually-entered total amount** — a single `total` field in the order's currency; independent of invoices. Risk: drifts from invoiced reality.
- [x] **Order items (label, quantity, unit price)** — full order lines mirroring `invoice_items`. Most e-commerce-like, but a much bigger scope and duplicates invoice items.

**Answer:**

### Q2. How do Invoices reference the Order?

"A single Order may reference many Invoices."

- [x] **Nullable `orderId` FK on `invoices`** — an invoice belongs to at most one order; `ON DELETE SET NULL` when the order goes away. Matches the existing FK style (invoice→channel) and keeps the invoice form simple (optional order picker).
- [ ] **Join table `order_invoices`** — allows one invoice on several orders. More flexible, but hard to reason about financially and not implied by the description.
- [ ] **Order-side list of invoice ids** — denormalised; against the project's relational conventions.

**Answer:**

### Q3. Order number: uniqueness scope and generation

Invoices are unique per `(fromAgentId, number)` and the number is client-supplied.

- [x] **Auto-generated, globally unique** — service generates sequential numbers like `ORD-00001` (DB sequence); read-only in the API/UI. "Unique number" with zero user friction.
- [ ] **Client-supplied, globally unique** — user types the number, DB unique constraint. Mirrors nothing existing; risks collisions across teams.
- [ ] **Client-supplied, unique per fromAgent** — mirrors the invoice convention exactly, but weaker than "unique number" as stated.

**Answer:**

### Q4. How are shipping and billing addresses stored?

Agents already have an `agent_addresses` child table, but those rows are mutable — an order should keep the address as it was at order time.

- [x] **Embedded snapshot columns on the order** — two groups of columns (`shipping*`, `billing*`: countryCode, line1, line2, city, postalCode), copied/typed at creation and editable while draft. Historically accurate; no FK coupling. Optionally the UI offers "copy from agent address" as a convenience.
- [ ] **FK references to `agent_addresses` rows** — no duplication, but editing/deleting the agent address silently rewrites history on old orders.
- [ ] **FK + snapshot copy** — both provenance and accuracy, at the cost of extra columns and sync rules.

**Answer:**

### Q5. Which references are required vs optional?

Elsewhere: `Invoice.channelId` is nullable, `Exchange.pipelineId` is nullable.

- [x] **fromAgent, toAgent, currency required; channel, pipeline, locale optional** — consistent with how channel/pipeline are used as optional context elsewhere; locales are a small ancillary entity.
- [ ] **Everything required** — the description says "references a single Channel and a Pipeline", read strictly. Forces users to always pick all five references.
- [ ] **Only agents required** — currency optional too; weakest, complicates any total display.

**Answer:**

### Q6. What role does the Pipeline play for an Order?

Pipelines have no stages; `Exchange` treats its pipeline as a grouping label while its own `state` machine drives lifecycle.

- [x] **Plain grouping reference, like Exchange** — the order's lifecycle is driven solely by its own state machine; pipeline is contextual categorisation (filterable in the list).
- [ ] **Pipeline drives a board view** — orders get a kanban grouped by pipeline with state columns. UI scope grows considerably; can be added later.

**Answer:**

---

## Round 2 — Shape

Round 1 made items part of the Order, so this round pins down the item shape, then the state machine mechanics, editability, timestamps, deletion, and the number format. For reference, `invoice_items` today are: optional `valueId`/`valueInstanceId` (a Value + concrete ValueInstance), `quantity`, `unitPrice`, `total`, plus three snapshot amount/rate pairs from spec 010.

### Q7. What is the shape of an order item?

- [x] **Mirror invoice items: optional Value/ValueInstance reference + quantity + unitPrice + total** — same structure and editing UX as invoice items, and a future "generate invoice from order" becomes a near-copy. Amounts in the order's currency.
- [ ] **Offering-based items** — items reference `Offering` instead of Value. Closer to e-commerce catalogs, but invoices couldn't be derived 1:1 and offerings have no price field.
- [ ] **Free-text label + quantity + unitPrice** — simplest, but breaks symmetry with invoice items and loses the Value linkage used elsewhere.

**Answer:**

### Q8. Do order items get the spec-010 snapshot columns (presentation / fromAgent / toAgent amounts)?

- [x] **No snapshots on order items** — snapshots exist for financial reporting, which stays invoice-based (Agent Financials reads invoices only). Orders are operational documents; their totals display in the order currency only.
- [ ] **Full snapshot trio like invoice items** — order values become reportable in any agent's functional currency, at the cost of replicating the whole snapshot machinery (rates lookup, business-date rules) for little current use.

**Answer:**

### Q9. State machine: allowed transitions

```
draft ──place──▶ new ──start──▶ processing ──complete──▶ completed
  │               │                  │
  └────cancel─────┴──────cancel──────┘──▶ cancelled
```

- [x] **Forward-only + cancel from draft/new/processing** — `place`, `start`, `complete`, `cancel`; `completed` and `cancelled` are final. Mirrors the exchange/tension machine style; xstate machine in `@marketlum/shared`.
- [ ] **Also backward transitions** — e.g. `processing → new` (pause/reopen). More flexible, but complicates invariants (what happens to linked invoices?).
- [ ] **No cancel from draft** — drafts are deleted, not cancelled; cancel only from new/processing. Slightly cleaner semantics, but users often expect cancel everywhere pre-completion.

**Answer:**

### Q10. What is editable in which state?

- [x] **Fully editable in draft; frozen afterwards** — header fields (agents, currency, channel, pipeline, locale), addresses and items editable only in `draft`. From `new` onwards only state transitions and invoice linking/unlinking are allowed (PATCH returns 409). Mirrors the RDHY "draft-only edits" rule.
- [ ] **Editable through new** — freeze at `processing`. Looser; currency/agent changes after placing make linked-invoice consistency murky.
- [ ] **Always editable** — no freeze; simplest but an order's addresses/items could change after completion.

**Answer:**

### Q11. State-change timestamps

- [x] **`placedAt`, `completedAt`, `cancelledAt` nullable timestamps** — set by the respective transitions (pattern: EMC `startedAt`/`endedAt`). List/detail can show them; no extra table.
- [ ] **Only `createdAt`/`updatedAt`** — minimal, but "when was this placed?" becomes unanswerable.
- [ ] **Full state-transition log table** — complete audit trail; heavier than anything else in the codebase today.

**Answer:**

### Q12. Deleting orders

- [x] **DELETE only in `draft` or `cancelled`; otherwise 409** — placed orders are business records; cancelling is the way out. Deleting sets `invoices.orderId` to NULL (per Q2).
- [ ] **Only `draft` deletable** — strictest; cancelled orders accumulate forever.
- [ ] **Any state deletable** — simplest, but destroys completed business records.

**Answer:**

### Q13. Number format

- [x] **`ORD-` + zero-padded global sequence (`ORD-00001`)** — Postgres sequence, no yearly reset, padding to 5 digits (grows naturally past 99999).
- [ ] **Year-scoped (`ORD-2026-0001`)** — resets each year; nicer for humans, but needs reset logic and the year adds no uniqueness.
- [ ] **Plain integer** — cheapest, but bare numbers read poorly next to invoice numbers in the UI.

**Answer:**

---

## Round 3 — UI / UX

Where Orders live in the admin, how they're created and edited given the draft-centric lifecycle, and how they surface on related pages.

### Q14. Navigation and list page

- [x] **Top-level "Orders" item in the admin sidebar** — a data table page at `/admin/orders`, peer of Invoices and Exchanges. Orders are a primary entity; burying them helps nobody.
- [ ] **Nested under another section** — e.g. next to invoices under a "Commerce" grouping; the sidebar has no such grouping concept today.

**Answer:**

### Q15. List table: columns, filters, export

- [x] **Full invoices-style data table** — columns: number, state (badge), fromAgent, toAgent, total, currency, channel, pipeline, placedAt; search by number; filters for state, fromAgent, toAgent, channel, pipeline, currency; sortable; CSV export. Matches the established data-table pattern (incl. scope-aware export).
- [ ] **Lean table** — number, agents, state, total only; fewer filters. Less to build, but inconsistent with sibling tables.
- [ ] **Board view (kanban by state)** — visual, but a new UI paradigm for the admin; can come later.

**Answer:**

### Q16. Create/edit UX

The invoice dialog already edits line items inline, but an order adds two addresses (~10 more fields) plus locale/pipeline. RDHY agreements use: small create dialog → full editing on the detail page while draft.

- [x] **Small create dialog + draft detail-page editing** — dialog captures the required header (fromAgent, toAgent, currency, optional channel/pipeline/locale); the order opens in `draft` where addresses and items are edited in place (items grid like the VAM canvas editor, address forms with "copy from agent's default address"). Best fit for the draft→place lifecycle.
- [ ] **One big form dialog** — everything (header, addresses, items) in a single dialog like invoices. Consistent with the invoice dialog, but ~25 fields in a modal.
- [ ] **Dedicated full-page create form** — a `/admin/orders/new` route; a new pattern for the admin (everything today is dialog- or detail-page-based).

**Answer:**

### Q17. Order detail page layout

- [x] **Header + tabs: Details and Invoices** — header shows number, state badge and transition buttons (Place/Start/Complete/Cancel with confirm); Details tab: header fields, shipping/billing addresses, items table with total; Invoices tab: scoped invoices data table. Mirrors the agent/value-stream detail pattern.
- [ ] **Single scrolling page** — no tabs; fine now, cramped once invoices are linked.

**Answer:**

### Q18. Linking invoices to orders — from which side?

- [x] **Both sides** — the invoice form dialog gains an optional Order picker (searchable by number), and the order detail's Invoices tab gets "Link invoice" / unlink actions for existing invoices. Linking allowed in any non-final order state (draft/new/processing).
- [ ] **Invoice side only** — order picker in the invoice form; the order's Invoices tab is read-only. Fewer endpoints, but linking an existing invoice means editing each invoice individually.
- [ ] **Order side only** — invoices stay unaware in their form; less discoverable when creating an invoice for an order.

**Answer:**

### Q19. Orders tab on the Agent detail page

Recent work added Offerings/Agreements/Exchanges/Invoices tabs to the agent detail page, with either-side scoping for invoices.

- [x] **Yes — an Orders tab** scoped to orders where the agent is fromAgent *or* toAgent (either-side `agentId` filter like invoices). Keeps the agent-centric view complete.
- [ ] **Not in v1** — smaller scope; the agent page loses sight of orders.

**Answer:**

### Q20. Should an Order reference a ValueStream?

You recently removed the invoice→ValueStream reference ("ValueStreams are a simple grouping mechanism"). Orders are a new primitive.

- [x] **No ValueStream reference** — consistent with the invoice decision; the order's pipeline/channel already provide grouping context, and pipelines themselves may reference a value stream.
- [ ] **Optional valueStream FK + Orders tab on the VS detail page** — treats VS as the universal grouping for the new primitive too; contradicts the direction just taken with invoices.

**Answer:**

---

## Round 4 — Integration, consistency rules, delivery

Final round: events, referential integrity, the invoice-link API mechanics, cross-entity consistency, seed data, and what stays out of scope.

### Q21. Domain events

- [x] **Order joins the primary-entities registry** — `marketlum.order.created/updated/deleted`; state transitions emit `updated`. Order items are children (no events), like invoice items.
- [ ] **Dedicated transition events too** — additionally `marketlum.order.placed/completed/cancelled`. Richer, but no existing entity does this (exchange transitions emit plain `updated`).
- [ ] **No events** — inconsistent; every primary entity emits.

**Answer:**

### Q22. Referential integrity for order references

Invoices set the pattern: required refs `RESTRICT`, optional refs `SET NULL`.

- [x] **Same pattern** — fromAgent/toAgent/currency `RESTRICT` (deleting them is blocked while orders exist); channel/pipeline/locale `SET NULL`; order items `CASCADE` with the order; `invoices.orderId` `SET NULL`.
- [ ] **CASCADE agents** — deleting an agent deletes its orders; destroys business records silently.

**Answer:**

### Q23. Invoice link/unlink API mechanics

- [x] **Reuse `PATCH /invoices/:id` with an `orderId` field** — the invoice owns the FK; the order detail's "Link invoice" action just PATCHes the chosen invoice (`orderId: null` to unlink). No new endpoints; the invoice form dialog gets the picker for free.
- [ ] **Dedicated sub-resource endpoints** — `POST/DELETE /orders/:id/invoices/:invoiceId`; more explicit REST, but duplicates what PATCH already expresses.

**Answer:**

### Q24. Consistency between an order and its linked invoices

- [x] **Currency must match; agents unconstrained** — linking an invoice whose currency differs from the order's returns 409 (keeps the order's "invoiced total" a meaningful single-currency sum); the agent pair is not enforced (sub-agents or third parties may legitimately invoice within an order).
- [ ] **Currency and agent pair must match** — strictest; breaks the sub-agent case.
- [ ] **No constraints** — flexible, but the invoiced total becomes a mixed-currency sum you can't display honestly.

**Answer:**

### Q25. Seed data

- [x] **Seed ~30 sample orders** — spread across all five states, addresses copied from agents' seeded addresses, 1–4 items each, a portion of existing seeded invoices linked to processing/completed orders. Keeps dashboards and tables demonstrable.
- [ ] **A handful (~5)** — quicker, thinner demo.
- [ ] **No seeding** — empty tables in the demo.

**Answer:**

### Q26. "Generate invoice from order" action

Order items deliberately mirror invoice items, so prefilling the invoice dialog from an order is cheap later.

- [x] **Out of scope for v1** — noted as a follow-up; v1 links existing invoices only. Keeps this spec focused on the entity + lifecycle.
- [ ] **Include it now** — a "Create invoice" button on the order detail that opens the invoice dialog prefilled (agents, currency, channel, items, orderId). One more UI flow plus edge rules (number entry, market flag).

**Answer:**
