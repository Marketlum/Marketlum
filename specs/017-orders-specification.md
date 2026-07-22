# 017 — Orders: Specification

> Decision trail: `specs/017-orders-brainstorming.md` (Rounds 1–4, Q1–Q26).

## 1. Overview

Introduce `Order` as a new primary entity: a commercial document flowing from one Agent to another, carrying its own line items (mirroring invoice items), snapshot shipping/billing addresses, optional Channel/Pipeline/Locale context, a required currency (Value of type CURRENCY), an auto-generated globally unique number, and a forward-only state machine. Invoices gain an optional `orderId` back-reference (one order → many invoices).

```
                    ┌──────────────────────────────┐
  fromAgent ───────▶│            ORDER             │◀─────── toAgent
  (RESTRICT)        │  number  ORD-00001 (auto)    │        (RESTRICT)
  Channel ─────────▶│  state   draft…cancelled     │◀─────── Pipeline
  (SET NULL)        │  shipping*/billing* columns  │        (SET NULL)
  Currency ────────▶│  placedAt/completedAt/       │◀─────── Locale
  (RESTRICT)        │  cancelledAt                 │        (SET NULL)
                    └──────┬──────────────┬────────┘
                           │ CASCADE      │ 1..N (invoices.orderId,
                    ┌──────▼──────┐       │       SET NULL)
                    │ ORDER_ITEM  │  ┌────▼────┐
                    │ value?, qty │  │ INVOICE │ currency must match order
                    │ unitPrice   │  └─────────┘
                    └─────────────┘
```

## 2. Domain model

### 2.1 `Order` entity (`orders` table)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `number` | varchar | UNIQUE, NOT NULL | `ORD-` + 5-digit zero-padded value from Postgres sequence `orders_number_seq`; generated in the service on create; never client-supplied (Q3, Q13) |
| `fromAgentId` | uuid | NOT NULL, FK agents RESTRICT | |
| `toAgentId` | uuid | NOT NULL, FK agents RESTRICT | |
| `currencyId` | uuid | NOT NULL, FK values RESTRICT | must be a Value of `ValueType.CURRENCY` (validated in service, like invoices) |
| `channelId` | uuid | NULL, FK channels SET NULL | |
| `pipelineId` | uuid | NULL, FK pipelines SET NULL | plain grouping reference (Q6) |
| `localeId` | uuid | NULL, FK locales SET NULL | |
| `state` | varchar enum | NOT NULL, default `'draft'` | `draft \| new \| processing \| completed \| cancelled` |
| `placedAt` | timestamptz | NULL | set by `place` |
| `completedAt` | timestamptz | NULL | set by `complete` |
| `cancelledAt` | timestamptz | NULL | set by `cancel` |
| `shippingCountryCode` | varchar(2) | NULL | address block mirrors `agent_addresses` fields (Q4) |
| `shippingLine1` | varchar(255) | NULL | |
| `shippingLine2` | varchar(255) | NULL | |
| `shippingCity` | varchar(255) | NULL | |
| `shippingPostalCode` | varchar(20) | NULL | |
| `billingCountryCode` | varchar(2) | NULL | |
| `billingLine1` | varchar(255) | NULL | |
| `billingLine2` | varchar(255) | NULL | |
| `billingCity` | varchar(255) | NULL | |
| `billingPostalCode` | varchar(20) | NULL | |
| `total` | numeric(14,2) | NOT NULL default 0 | sum of item totals, recomputed whenever items change (mirrors `Invoice.total`; serialize via `Number(raw).toFixed(2)`) |
| `createdAt` / `updatedAt` | timestamptz | | |

Addresses are optional snapshots — both blocks may be entirely null; an address block, when provided, requires `countryCode`, `line1`, `city`, `postalCode` (`line2` optional), matching `agent_addresses` nullability. No address is required to `place` (kept deliberately un-gated; see §14).

### 2.2 `OrderItem` entity (`order_items` table)

Mirrors `invoice_items` minus the spec-010 snapshot columns (Q7, Q8):

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `orderId` | uuid | NOT NULL, FK orders CASCADE |
| `valueId` | uuid | NULL, FK values SET NULL |
| `valueInstanceId` | uuid | NULL, FK value_instances SET NULL |
| `quantity` | numeric(14,2) | NOT NULL |
| `unitPrice` | numeric(14,2) | NOT NULL |
| `total` | numeric(14,2) | NOT NULL (`quantity × unitPrice`, computed in service) |
| `position` | int | NOT NULL (stable ordering) |

No domain events for items — children, like invoice items (Q21).

### 2.3 State machine (Q9)

`packages/shared/src/machines/order.machine.ts`, xstate `setup().createMachine()` like `exchange.machine.ts`:

```
draft ──place──▶ new ──start──▶ processing ──complete──▶ completed (final)
  │               │                  │
  └───cancel──────┴─────cancel───────┘─────▶ cancelled (final)
```

- Events: `place`, `start`, `complete`, `cancel`.
- `cancel` is valid from `draft`, `new`, `processing`. No backward transitions.
- Services enforce transitions by consulting the machine (existing pattern: derive allowed events from the machine definition; invalid transition → **409**).

### 2.4 Editability & deletion rules

- **PATCH allowed only in `draft`** (header fields, addresses, items) → otherwise **409** (Q10).
- **DELETE allowed only in `draft` or `cancelled`** → otherwise **409** (Q12). Deletion cascades items and sets `invoices.orderId = NULL`.
- Invoice linking/unlinking allowed while the order is in `draft`/`new`/`processing`; linking to `completed`/`cancelled` orders → **409** (Q18/Q24).

### 2.5 Zod schemas (`packages/shared/src/schemas/order.schema.ts`)

- `orderStateSchema = z.enum(['draft','new','processing','completed','cancelled'])` (also exported as `OrderState` enum in `packages/shared/src/enums/order-state.enum.ts`).
- `orderAddressSchema = z.object({ countryCode: z.string().length(2), line1: z.string().min(1).max(255), line2: z.string().max(255).nullish(), city: z.string().min(1).max(255), postalCode: z.string().min(1).max(20) })`.
- `createOrderItemSchema = z.object({ valueId: uuid.nullish(), valueInstanceId: uuid.nullish(), quantity: positiveDecimal, unitPrice: nonNegativeDecimal })` — same decimal handling as `createInvoiceItemSchema`.
- `createOrderSchema = z.object({ fromAgentId: uuid, toAgentId: uuid, currencyId: uuid, channelId: uuid.nullish(), pipelineId: uuid.nullish(), localeId: uuid.nullish(), shippingAddress: orderAddressSchema.nullish(), billingAddress: orderAddressSchema.nullish(), items: z.array(createOrderItemSchema).optional() })` — **no** `number`, **no** `state`.
- `updateOrderSchema = createOrderSchema.partial()` — items array, when present, is replace-all (invoice pattern).
- `orderResponseSchema` — all columns + `fromAgent`/`toAgent`/`currency`/`channel`/`pipeline`/`locale` summaries, `items[]`, `total`, and on the detail endpoint `invoicedTotal: z.string().nullable()` (sum of linked invoice totals; null when no invoices linked).
- `searchOrdersQuerySchema` — `search` (number, ILIKE), `state`, `fromAgentId`, `toAgentId`, `agentId` (either-side OR, mirrors the invoice filter), `channelId`, `pipelineId`, `currencyId`, `page`, `limit`, `sortBy`, `sortOrder`.
- Invoice schema additions: `orderId: uuid.nullish()` on create/update; `order: z.object({ id, number }).nullable()` on response; `orderId` filter on the invoice search query schema.

## 3. API surface (`AdminGuard`, `ZodValidationPipe` — standard)

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /orders` | paginated search | filters per `searchOrdersQuerySchema` |
| `POST /orders` | create (state `draft`, number generated) | 400 unknown refs / non-currency `currencyId` |
| `GET /orders/:id` | detail with items, relation summaries, `invoicedTotal` | 404 |
| `PATCH /orders/:id` | update header/addresses/items | 409 unless `draft` |
| `DELETE /orders/:id` | delete | 204; 409 unless `draft`/`cancelled` |
| `POST /orders/:id/place` | `draft → new`, sets `placedAt` | 409 invalid transition |
| `POST /orders/:id/start` | `new → processing` | 409 |
| `POST /orders/:id/complete` | `processing → completed`, sets `completedAt` | 409 |
| `POST /orders/:id/cancel` | `draft/new/processing → cancelled`, sets `cancelledAt` | 409 |

Invoice linking reuses the existing invoice endpoints (Q23) — **no** dedicated link endpoints:

- `POST /invoices` / `PATCH /invoices/:id` accept `orderId` (nullable). Validation in `InvoicesService`: order must exist (400), order state must not be final (409), invoice currency must equal order currency (409, message `Invoice currency must match the order currency`) (Q24). `orderId: null` unlinks.
- `GET /invoices?orderId=<uuid>` — new filter powering the order's Invoices tab.

Transition responses return the full order response body. All transitions and PATCH emit `marketlum.order.updated`; create/delete emit `created`/`deleted` (Q21 — `Order` added to `packages/core/src/events/primary-entities.ts` as `{ cls: Order, snakeName: 'order' }`).

## 4. Domain helpers (`@marketlum/shared`)

- `machines/order.machine.ts` — the xstate machine (§2.3).
- `helpers/order.helpers.ts` — `orderItemTotal(quantity, unitPrice)` and `orderTotal(items)` pure decimal helpers (reuse the invoice decimal conventions; `Number(x).toFixed(2)`).

## 5. Backend module layout (`packages/core/src/orders/`)

```
orders/
  entities/order.entity.ts
  entities/order-item.entity.ts
  orders.controller.ts        // AdminGuard; transitions before :id routes not needed (all are POST :id/<action>)
  orders.service.ts           // number generation, currency-type check, transition guard,
                              // replace-all items with total recompute, invoicedTotal query
  orders.module.ts
```

- Number generation: `SELECT nextval('orders_number_seq')` inside the create transaction → `ORD-${String(n).padStart(5,'0')}`.
- Items replace-all: delete-and-insert within a transaction; strip the relation before `.save()` per the established cascade gotcha; recompute `total`.
- `invoicedTotal`: raw SQL `SELECT SUM(total) FROM invoices WHERE "orderId" = $1` on the detail endpoint (single-entity raw-SQL pattern), serialized with `toFixed(2)`.
- `InvoicesService`: add `orderId` handling (validation per §3) and the `orderId` search filter; invoice responses join `order` `{id, number}`.
- Register `OrdersModule` in the core module exports and in the app module (wherever sibling modules like `InvoicesModule` are registered).

## 6. Database migration

`packages/core/src/migrations/1700000000056-AddOrders.ts` (registered in `migrations/index.ts`):

1. `CREATE SEQUENCE orders_number_seq;`
2. Create `orders` (all §2.1 columns, unique index on `number`, FKs with the §2.1 on-delete behavior, indexes on `fromAgentId`, `toAgentId`, `channelId`, `pipelineId`, `currencyId`, `state`).
3. Create `order_items` (§2.2, index on `orderId`).
4. `ALTER TABLE invoices ADD COLUMN "orderId" uuid NULL REFERENCES orders(id) ON DELETE SET NULL;` + index.
5. `down()`: drop in reverse (invoices column → order_items → orders → sequence).

## 7. UI / UX (`packages/ui`)

### 7.1 Navigation
`layouts/admin-layout.tsx`: add **Orders** top-level item (between Invoices and Exchanges), route `/admin/orders` (Q14).

### 7.2 Orders list — `pages/admin/orders-page.tsx` + `components/orders/`
`orders-data-table.tsx` + `columns.tsx`, full invoices-style table (Q15): columns number (link to detail), state badge, fromAgent, toAgent, total + currency, channel, pipeline, placedAt; search by number; filters state/fromAgent/toAgent/channel/pipeline/currency; sortable; CSV export (export fetch-all must apply the same scope filters — established pattern). Scope props: `agentId` (either-side) for the agent tab reuse, hiding the agent filter/columns when scoped.

"New order" button opens `order-form-dialog.tsx` (Q16): required fromAgent/toAgent/currency pickers + optional channel/pipeline/locale. On success, navigate to the new order's detail page.

### 7.3 Order detail — `pages/admin/order-detail-page.tsx`
Header: number, state badge, transition buttons rendered from the current state (Place / Start / Complete / Cancel, each with a confirm dialog), Delete (draft/cancelled only), Edit (draft only — reopens the header dialog). Tabs (Q17):

- **Details** — header fields; two address cards (`order-address-card.tsx`) editable in draft with a "Copy from agent's default address" action (pulls the agent's `isDefault` address via the existing agent-addresses endpoint); items grid (`order-items-editor.tsx`, inline-editable like the VAM canvas editor: Value/ValueInstance pickers, quantity, unitPrice, computed line total, add/remove/reorder, footer total) — read-only outside draft.
- **Invoices** — `InvoicesDataTable` scoped by `orderId` (hides the order filter/column), plus a "Link invoice" action opening a searchable picker of unlinked invoices with matching currency; each row gets an Unlink action. Both actions `PATCH /invoices/:id` with `orderId` (Q18/Q23). Hidden/disabled once the order is final.

### 7.4 Cross-entity surfaces
- **Invoice form dialog**: optional Order picker (search by number); server enforces currency match — surface the 409 message inline (Q18).
- **Invoices list**: optional Order column (number, link) when unscoped.
- **Agent detail page**: new **Orders** tab (after Exchanges, before Invoices) rendering `OrdersDataTable agentId={agent.id}` — either-side scope (Q19).
- **No** ValueStream involvement anywhere (Q20).

### 7.5 Messages
`orders` namespace in `messages/en.json` and `pl.json`: nav label, table headers, state labels (Draft/New/Processing/Completed/Cancelled + PL), transition buttons & confirms, address card labels, items editor labels, link/unlink invoice strings, validation/409 messages.

## 8. Web app wiring + template sync

- `apps/web/src/app/admin/orders/page.tsx` and `apps/web/src/app/admin/orders/[id]/page.tsx` — thin re-exports of the `@marketlum/ui` pages (existing pattern).
- **Template sync (CLAUDE.md):** mirror both route files under `packages/create-marketlum-app/template/apps/web/src/app/admin/orders/` — the template mirrors thin route re-exports only.

## 9. Seed data (Q25)

`seed-sample.command.ts`: ~30 orders — agents drawn from the seeded pool, currencies from seeded currency Values, channel/pipeline/locale set on ~⅔, weighted states (≈5 draft / 5 new / 8 processing / 9 completed / 3 cancelled) with consistent transition timestamps, addresses copied from the agents' seeded default addresses where present, 1–4 items each referencing seeded Values, and a portion of existing seeded invoices (currency-matching) linked to processing/completed orders. Idempotent by order number prefix (reset-friendly like the rest of the seeder).

## 10. BDD test coverage (strict — features first)

`packages/bdd/features/orders/` + steps in `apps/api/test/orders/`:

| Feature file | Scenarios (≈) |
|---|---|
| `manage-orders.feature` | 8 — create draft with generated number `ORD-00001`; sequential numbers; create with unknown agent 400; non-currency `currencyId` 400; update in draft; update after place 409; delete draft 204; delete processing 409 + delete cancelled 204 |
| `order-lifecycle.feature` | 8 — place sets `placedAt`; start; complete sets `completedAt`; cancel from draft/new/processing sets `cancelledAt`; complete from draft 409; place twice 409; transitions emit `marketlum.order.updated` |
| `order-items.feature` | 5 — add items recomputes total; replace-all keeps order/position; line total = qty × unitPrice; item with unknown value 400; items rejected once placed 409 |
| `order-addresses.feature` | 3 — set shipping+billing in draft; partial address rejected 400; address edit after place 409 |
| `search-orders.feature` | 6 — filter by state; by fromAgentId; by agentId either-side; by pipeline; search by number; pagination |
| `order-invoices.feature` | 7 — link via invoice create; link via PATCH; unlink with null; currency mismatch 409; link to completed order 409; list invoices by orderId; deleting order sets invoice orderId NULL |
| `events` (within above) | order created/updated/deleted events asserted in manage/lifecycle scenarios |

≈37 scenarios. Existing invoice suites extended only where the schema changed (orderId accepted, order summary in response). Reminder: rebuild `@marketlum/shared` before running API tests; one `and()` registration per identical And line.

## 11. Permissions

`AdminGuard` at the controller level (default; no deviation chosen).

## 12. Out of scope (with decision references)

- Spec-010 snapshot columns on order items — Q8.
- Backward transitions / reopen — Q9.
- Kanban/board views — Q6, Q15.
- ValueStream reference & VS-page Orders tab — Q20.
- Dedicated transition event names (`marketlum.order.placed` …) — Q21.
- Dedicated link/unlink endpoints — Q23.
- Agent-pair consistency between order and invoices — Q24.
- "Generate invoice from order" prefill action — Q26 (natural follow-up; item shape chosen to make it cheap).

## 13. Delivery plan (one PR)

1. Shared: enum, machine, helpers, Zod schemas (order + invoice additions) → build shared.
2. Feature files (`packages/bdd/features/orders/`, invoice feature deltas).
3. Core: entities, migration 1700000000056, module/service/controller, invoices service/schema deltas, primary-entities registration.
4. Step definitions in `apps/api/test/orders/` + invoice step deltas; run targeted e2e.
5. UI: components/pages/nav/messages; `tsc --noEmit` in apps/web.
6. Web routes + template mirror.
7. Seeder additions; verify on a scratch DB (`DATABASE_NAME` override pattern).
8. Full targeted e2e pass, commit.

## 14. Open follow-ups (non-blocking)

- Whether `place` should eventually require addresses or a non-empty items list — deliberately un-gated in v1; revisit with real usage.
- "Generate invoice from order" (Q26).
