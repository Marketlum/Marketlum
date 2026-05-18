# 009 — Domain Events Brainstorming

> **Goal:** Decide how Marketlum publishes domain events (e.g. `marketlum.value.created`, `marketlum.exchange.deleted`) for every entity so internal handlers and (eventually) external integrations can react to lifecycle changes.

> **Process:** This document is **append-only**. Each round adds new questions. Move the `[x]` to your preferred option (or leave the recommended one) and write any qualifiers after `**Answer:**`. Reply "Done" when a round is complete and I'll append the next one.

## Context

Marketlum currently has **31 entities** registered in `packages/core/src/entities.ts`. Each lives behind a NestJS module (`packages/core/src/<domain>/`) with the standard `Service` → `Controller` shape:

```
Controller  →  Service.create() / update() / remove() / transition() …
                  │
                  ▼
              TypeORM Repository  →  Postgres
```

Today, services mutate state and return — nothing else hears about it. Some entities have domain-specific state machines (e.g. `Exchange.transition` uses XState), but those transitions are invisible to anyone outside the service.

What exists that we can lean on:

- **NestJS DI** everywhere; no event bus is wired in yet (no `@nestjs/event-emitter` in `packages/core/package.json`).
- **TypeORM 0.3** with full repository pattern and `EntitySubscriberInterface` available out of the box.
- **Postgres** is the only datastore. No Redis, RabbitMQ, or Kafka.
- **31 entities**, of which some are clearly "primary" (`Value`, `Exchange`, `Invoice`, `Agreement`, `ValueStream`, `Agent`, …) and some are children/joins (`ValueImage`, `ExchangeParty`, `ExchangeFlow`, `InvoiceItem`, `OfferingComponent`, `Address`).
- **Code field** recently added to 8 primary entities (commit `c6126a8`) — useful as a stable, human-readable identifier in event payloads.
- **`AdminGuard` + JWT** on every admin controller; no external API surface yet.
- **BDD-first** workflow (`packages/bdd/features/*.feature` + step defs in `apps/api/test/`).

```
┌─────────────────────────────────────────────────────────────┐
│                  Today                                       │
│                                                              │
│   Controller ──► Service ──► Repository ──► Postgres         │
│                                                              │
│                                                              │
│                  After this spec                             │
│                                                              │
│   Controller ──► Service ──► Repository ──► Postgres         │
│                     │                                        │
│                     └──► EventBus ──► [handlers]             │
│                              │                               │
│                              └──► (optional) outbox / store  │
└─────────────────────────────────────────────────────────────┘
```

---

## Round 1 — Foundations

This round nails down *why* we're doing this and *how* events flow at the most basic level. Everything else (payload shape, naming, persistence details, BDD coverage) follows from these answers.

### Q1.1 — What is the primary purpose of domain events?

Knowing the use case shapes every other decision. A pure in-process pub/sub for refactor hygiene is very different from a webhook-grade event stream.

- [x] **Internal reactive workflows (now) + external delivery (later)** — Build the bus now for in-process handlers (e.g. cache invalidation, derived-data updates, search indexing, AI hooks), with a clear path to webhooks/external pub/sub later. Keeps scope tight but doesn't paint us into a corner.
- [ ] **External integrations first (webhooks)** — Treat events primarily as a public contract. Adds significant scope (delivery, retries, signing, dashboards).
- [ ] **Audit trail / activity feed first** — Optimise for "who changed what, when". Different shape (always persisted, user attribution central).
- [ ] **Everything at once** — Internal + external + audit. Largest scope; probably one PR per concern.

**Answer:**

### Q1.2 — Which mechanism delivers events?

Marketlum is a single NestJS process talking to one Postgres. We can stay simple or invest in an outbox now.

- [x] **`@nestjs/event-emitter` (in-process pub/sub)** — Add the dep, inject `EventEmitter2`, fire-and-forget. Zero infra. Fine for internal handlers; no durability across crashes.
- [ ] **Outbox table + in-process emit** — Write every event to a `domain_events` row in the same transaction as the mutation, then publish. Durable, replayable, ready for external delivery, more code to write/maintain.
- [ ] **Postgres `LISTEN`/`NOTIFY`** — Use what we already have. Decouples emit from consume across processes, but limited payload size and no durability.
- [ ] **Custom lightweight bus** — Roll our own `EventBus` service. Avoid extra deps, but reinvents `@nestjs/event-emitter`.

**Answer:**

### Q1.3 — Which events do we publish?

The user's examples are CRUD-flavoured (`value.created`, `exchange.deleted`), but the codebase has richer domain operations.

- [x] **CRUD now, domain-specific events incrementally** — Ship `<entity>.created/updated/deleted` for every entity in this PR. Add named domain events (`exchange.transitioned`, `invoice.sent`, `tension.resolved`, …) as the need arises, each via the same bus.
- [ ] **CRUD only** — Just `created`/`updated`/`deleted` and nothing else; subscribers infer meaning from payload deltas.
- [ ] **CRUD + a curated set of domain events now** — Identify the obvious named operations in this spec (Exchange transitions, Invoice state changes, Tension resolution, Pipeline stage moves) and publish them alongside CRUD in this PR.
- [ ] **Domain events only, no generic CRUD** — Skip generic CRUD; require every event to be named explicitly. Most expressive but means hand-writing emits everywhere.

**Answer:**

### Q1.4 — Where does the emit happen?

This is the biggest implementation question. TypeORM subscribers feel magical but interact poorly with explicit transactions and bulk operations. Service-layer emits are explicit but verbose across 31 entities.

- [x] **Hybrid: TypeORM subscriber for CRUD, explicit service-level emits for domain events** — One subscriber catches every `afterInsert`/`afterUpdate`/`afterRemove` and emits `<entity>.<verb>`. Services additionally `eventBus.emit('exchange.transitioned', …)` for domain operations. Cheap coverage + explicit semantics where they matter.
- [ ] **Explicit at the service layer only** — Each `create`/`update`/`remove` calls `eventBus.emit(...)` by hand. No subscriber magic; touches every service. More work, fully predictable.
- [ ] **TypeORM subscriber only** — Subscriber fires for everything, including domain transitions (subscribers see `afterUpdate` with column diff). Smallest footprint; semantics get muddier (a state transition looks like any other update).
- [ ] **A decorator on service methods (`@EmitsEvent('exchange.transitioned')`)** — AOP-style. Elegant but introduces a new pattern with its own gotchas.

**Answer:**

### Q1.5 — Do we persist events?

Whether events live beyond the emit determines if we need a table, a retention policy, and migration work.

- [x] **No persistence in this PR** — Events are ephemeral; in-process handlers consume them and they're gone. Add a `domain_events` table later when we have a concrete need (webhooks, audit feed). Smallest scope today.
- [ ] **Persist every event in a `domain_events` table** — Append-only log of all events. Enables replay, audit, external delivery. Adds a migration, retention question, and storage cost from day one.
- [ ] **Persist only "important" events (configurable per type)** — Most events ephemeral; specific ones (e.g. `invoice.paid`, `exchange.cancelled`) opt into persistence. Flexible; more configuration surface.

**Answer:**

### Q1.6 — Which entities get CRUD events?

The 31 entities split naturally into top-level domain objects and children/joins.

- [x] **Primary entities only (skip pure children/joins)** — Emit for the ~24 top-level entities; skip `ValueImage`, `ExchangeParty`, `ExchangeFlow`, `InvoiceItem`, `OfferingComponent`, `Address`, `Folder` (children handled via parent events, e.g. `exchange.updated` covers party changes). Keeps the wire small; reduces noise for handlers.
- [ ] **Every entity, no exceptions** — All 31 entities emit. Simpler rule ("if it's an entity, it has events"); more noise for consumers; parent + child events fire for one logical change.
- [ ] **Primary entities + a denylist** — Same as recommended but spelled out in a config so people can opt children in later without code changes.
- [ ] **Opt-in via decorator on the entity (`@HasDomainEvents()`)** — Explicit at the entity definition. Most discoverable; one more concept to learn.

**Answer:**

### Q1.7 — Naming convention for event names

The user proposed `marketlum.value.created`. Worth confirming the shape and namespace prefix.

- [ ] **`marketlum.<entity>.<verb>` with kebab-case multi-word entities** — `marketlum.value.created`, `marketlum.value-stream.updated`, `marketlum.exchange-rate.deleted`, `marketlum.exchange.transitioned`. The `marketlum.` prefix future-proofs against multi-tenant / multi-product setups and matches conventional wire formats (CloudEvents-style).
- [ ] **`<entity>.<verb>` — no prefix** — Simpler internally (`value.created`). Add the `marketlum.` prefix at the wire boundary if/when we expose events externally.
- [x] **`marketlum.<entity>.<verb>` with snake_case entities** — `marketlum.value_stream.updated`. Matches the new `code` field convention (commit `c610502`).
- [ ] **`com.marketlum.<entity>.<verb>` (reverse-DNS)** — Strictest CloudEvents convention. More to type; slightly future-proofs for federation.

**Answer:**

---

Reply **Done** when this round is complete and I'll append Round 2 (event payload shape, transactional semantics, error handling).

---

## Round 2 — Shape, timing, and safety

Round 1 settled the architecture. Now we pin down what each event *looks like*, *when* it fires relative to the database, what happens when a handler explodes, and how typed it all is. These choices show up in every handler signature, so they're worth getting right.

### Q2.1 — What's in the payload?

Every event needs a body. We can be minimal (handlers re-fetch as needed) or fat (everything inline).

Options below assume an envelope of `{ name, occurredAt, payload }`. The question is what goes in `payload`.

- [x] **`{ id, code?, entity }` — full entity snapshot at emit time** — Handlers get everything without a re-fetch. For `updated`, payload is post-update state. Slightly bigger, but matches how services already return the saved entity. Relations included only if already loaded.
  ```ts
  {
    name: 'marketlum.value.updated',
    occurredAt: '2026-05-18T10:30:00Z',
    payload: { id: 'uuid', code: 'value_abc', entity: { …Value } }
  }
  ```
- [ ] **`{ id, code? }` only — handlers re-fetch** — Smallest payload; handlers always see the latest state (no stale snapshots). One extra query per handler.
- [ ] **`{ id, code?, entity, previous? }` — snapshot + previous state on updates** — Same as recommended but `updated` events also include the pre-update entity for diffing. Useful for change-detection handlers; doubles payload size on update.
- [ ] **CloudEvents envelope (`specversion`, `source`, `subject`, `type`, `data`)** — Wire-format from day one. Future-proof for external delivery; verbose for purely internal use.

**Answer:**

### Q2.2 — When exactly does an event fire relative to the DB transaction?

TypeORM subscribers expose two hook families: per-operation (`afterInsert`/`afterUpdate`/`afterRemove`, fire inside the transaction) and per-transaction (`afterTransactionCommit`, fire only on success). This matters a lot — fire too early and you announce a write that gets rolled back.

- [x] **`afterTransactionCommit` for CRUD; explicit emits in services run after `await save()`** — Subscriber buffers per-operation events and flushes them only when the surrounding transaction commits. Service-level domain emits already happen after `save()` returns successfully. **No event is emitted for a rolled-back transaction.** Most predictable; matches outbox semantics if we add one later.
- [ ] **Fire immediately inside `afterInsert`/`afterUpdate`/`afterRemove`** — Simpler; subscriber emits on every per-op hook. Risk: events fire for operations that later roll back. Acceptable today since we rarely wrap multi-step transactions, brittle as the codebase grows.
- [ ] **`afterTransactionCommit` for everything, including domain events** — Even explicit `eventBus.emit('exchange.transitioned', …)` calls would be deferred via an in-request buffer. Maximally consistent; requires plumbing a per-request event buffer through the request lifecycle.

**Answer:**

### Q2.3 — How are handlers invoked: sync or async?

`@nestjs/event-emitter` supports both. The choice affects whether a slow/throwing handler can degrade or fail the originating request.

- [x] **All handlers async (registered with `@OnEvent('…', { async: true })`)** — Handlers run on the next tick; the originating request returns before they complete. A slow indexing handler can't slow down a `POST /values`. Handler failures cannot fail the request.
- [ ] **All handlers sync (default)** — Handlers run inline in the same tick as the emit. Simpler mental model, easier tests, but a slow handler blocks the response and a thrown handler can take down the request.
- [ ] **Default async, handler can opt into sync** — Most handlers async; rare cases (e.g. cache invalidation that must happen before the response) declare sync. Most flexible; one more thing to remember.

**Answer:**

### Q2.4 — What happens when a handler throws?

Even async handlers can blow up. We need a policy.

- [x] **Catch + log + swallow** — Handler errors are logged with the event name and payload id, but never propagate. A broken handler can't break unrelated handlers or the originating request. Risk: silent failures need monitoring.
- [ ] **Catch + log + re-emit as `marketlum.event.handler_failed`** — Same as recommended, plus a follow-up event so failed handlers are observable on the bus itself. Self-instrumenting; small risk of feedback loops.
- [ ] **Propagate (let the process crash)** — Tells you immediately when something is broken; one buggy handler can take down the API.
- [ ] **Per-handler policy via decorator** — Default swallow, opt-in propagate via `@OnEvent('…', { strict: true })`. Most flexible; least consistent.

**Answer:**

### Q2.5 — Do we attach the actor (current user) to events?

The originating user is often the most-asked-for context (audit, "who deleted this?", AI activity). The request already has it; the event currently doesn't.

- [ ] **Yes, via `AsyncLocalStorage`-backed request context** — A NestJS middleware/interceptor stashes `{ userId, requestId }` in async-local storage on every request; the event bus reads it and stamps every event envelope with `actor: { userId }` and `correlationId`. Zero changes to service signatures. Modest plumbing.
- [ ] **Yes, but passed explicitly** — Services accept an optional `ctx: { userId }` argument and forward it into emits. Touches every service signature; no magic.
- [x] **Skip for now** — Don't include actor; revisit when we build an activity feed.

**Answer:**

### Q2.6 — How typed are events?

Stronger typing makes handlers safer but adds upkeep across 24+ entities × 3 verbs.

- [x] **TypeScript discriminated-union types in `@marketlum/shared`** — One union `DomainEvent` = all known events; handler signatures are `(e: ValueCreatedEvent) => …`. Auto-completion + compile-time safety. No runtime validation (consumers in-process can be trusted).
  ```ts
  type DomainEvent =
    | { name: 'marketlum.value.created';  payload: { id: string; code?: string; entity: Value } }
    | { name: 'marketlum.value.updated';  payload: { id: string; code?: string; entity: Value } }
    | …
  ```
- [ ] **Zod schemas + TS types (full validation at boundaries)** — Each event has a Zod schema; emit-time validation in non-prod. Strongest contract; most maintenance.
- [ ] **Untyped (`Record<string, unknown>`) with name constants** — Just export a `const EVENTS = { VALUE_CREATED: 'marketlum.value.created', … }`. Minimal; gives up most of the benefit.
- [ ] **Generated types from a single registry** — A `defineEvent()` helper builds both runtime constants and TS types. DRYest; more meta-programming.

**Answer:**

### Q2.7 — Bulk operations and cascades — one event or many?

Several services do bulk writes (e.g. `replaceParties` deletes all and re-inserts in `ExchangesService`). TypeORM cascades also produce N inserts for one logical action.

- [x] **One event per row, but emit only for **primary** entities** — Combined with Round 1's primary-only entity rule, cascades on child tables (`ExchangeParty`, `InvoiceItem`, etc.) don't fire events at all. Bulk operations on primary entities still emit one event per row — handlers see the same shape regardless of how the write happened.
- [ ] **Coalesce per request into a single batch event** — `marketlum.value.created.batch` with `payload.entities: Value[]`. Better for bulk import; new event shape to learn; handlers need to handle both.
- [ ] **One event per row, no batch shape** — As recommended but no special-casing; a 100-row bulk insert produces 100 events even on primary entities. Simpler rule; noisier bus.

**Answer:**

---

Reply **Done** when this round is complete and I'll append Round 3 (handler conventions, file layout, BDD coverage, observability).

---

## Round 3 — Layout, tests, observability, delivery

Round 1 set the shape, Round 2 set the semantics. This round is about *where the code goes*, *how we prove it works*, *how we see it running*, and *what ships in v1 beyond the bus itself*.

### Q3.1 — Where does the bus + subscriber + types live?

We need a home for the new infrastructure. Marketlum already organises by domain (`packages/core/src/<domain>/`).

- [ ] **New `packages/core/src/events/` module** — Self-contained: `events.module.ts`, `domain-event-bus.service.ts`, `domain-event.subscriber.ts`, `primary-entities.ts` (the allow-list). Imported by `MarketlumCoreModule`. Shared types live in `packages/shared/src/events/`. Single place to find anything event-related; matches existing module-per-concern layout.
- [x] **Inline in `packages/core/src/common/`** — Treat it as cross-cutting infrastructure alongside `CsrfProtectionGuard`, `ZodValidationPipe`. Slightly lower visibility; `common/` becomes a grab-bag.
- [ ] **Spread across each domain module** — `values/events/value-created.event.ts`, etc. Maximally local; bus wiring still needs a home; harder to see the whole event surface.

**Answer:**

### Q3.2 — Where do event handlers live?

Once the bus exists, somebody will write the first handler. Where does that file go?

- [x] **In the module that owns the side effect** — A handler that re-indexes search lives in `search/handlers/value-events.handler.ts`. A handler that recomputes a cached rollup lives in `value-streams/handlers/…`. The emitter doesn't know who listens; listeners discover events by name. Standard pub/sub hygiene.
- [ ] **In the module that emits** — `values/handlers/…` for everything reacting to value events. Easy to find "what happens after a value changes" in one place; couples emitter to consumers.
- [ ] **Dedicated `packages/core/src/events/handlers/`** — Centralised list of every handler. Most discoverable; couples handlers to the events module rather than the domain they belong to.

**Answer:**

### Q3.3 — How do we test events in BDD?

Project rule is strict BDD: feature file + step definitions before the code. Events are infrastructure — they're observed *via* tests on the feature.

- [ ] **New `domain-events.feature` with one scenario per (primary entity × verb)** — Scenarios look like: *Given an authenticated admin / When I `POST /values` / Then a `marketlum.value.created` event is published with the new value's id and code*. Steps install a test listener that records emissions; assertions check the recorded list. ~72 scenarios (24 primary entities × 3 verbs); generic, table-driven.
- [x] **Sprinkle event assertions into existing feature files** — `value.feature` already exercises `POST /values`; just add a `Then` step. Lighter; events become part of the per-entity coverage. Risk: easy to forget for new entities.
- [ ] **A single `domain-events.feature` with a `Scenario Outline` over an `Examples:` table** — One scenario, parameterised over all entity×verb combinations. Compact; same coverage; uses jest-cucumber's outline support.
- [ ] **Skip BDD; unit-test the subscriber directly** — Faster to write; violates the project's strict BDD rule.

**Answer:Do it for 3-4 entities, not all of them.**

### Q3.4 — How does the test listener attach?

Whichever BDD shape we pick, tests need to *see* what was emitted. Two patterns work with `@nestjs/event-emitter`.

- [x] **Test-only `EventRecorder` service registered in the test module** — Subscribes to `**` (wildcard), pushes every event into an array, exposes `getAll()` / `getByName()` / `clear()`. Imported in `setup-app.ts`; step definitions call `eventRecorder.getByName('marketlum.value.created')`. Real bus, real subscriber, real handlers (if any) all still fire.
- [ ] **Replace `EventEmitter2` with a Jest mock** — Steps assert against the mock's call args. Decouples from real handlers; loses end-to-end fidelity.
- [ ] **Tap into Nest's `EventEmitter2.onAny` directly in steps** — No new service; each step file wires its own listener. Simpler infra; more boilerplate per feature.

**Answer:**

### Q3.5 — What ships in v1 beyond the bus?

The bus alone is invisible. Worth deciding what (if anything) we wire as the first real handler.

- [x] **Just the bus + a dev-mode logging handler** — `LoggingEventHandler` subscribes to `**`, logs `{ name, payload.id, payload.code? }` at `debug` level. Off by default in production via Nest log level. Lets us see events flow without committing to a feature. No production behaviour changes.
- [ ] **Just the bus, nothing else** — Truly minimal. Bus is unobservable until somebody writes a real handler.
- [ ] **Bus + replace one existing direct call with a handler** — e.g. `SearchService.reindex` currently called from `ValuesService.create`/`update`/`remove`; move it behind a `value-events.handler.ts`. Proves the pattern end-to-end; introduces a behaviour-equivalent refactor on top of the new infrastructure.
- [ ] **Bus + an admin "live event stream" page** — SSE endpoint + Next.js page showing the bus in real time. Great DX; significant UI scope creep for v1.

**Answer:**

### Q3.6 — How are the event-name constants exposed?

Handler authors will need to refer to event names. Magic strings or constants?

- [ ] **Named constants generated alongside the type union** — `@marketlum/shared` exports both `DomainEvent` (the union) and `DOMAIN_EVENTS` (`{ VALUE_CREATED: 'marketlum.value.created', … }`). Handlers use `@OnEvent(DOMAIN_EVENTS.VALUE_CREATED)`. Refactor-safe; auto-completion.
- [x] **String literals everywhere** — `@OnEvent('marketlum.value.created')`. Simplest; typos only caught at runtime; rename = find/replace.
- [ ] **A `payloadFor<T>()` lookup helper** — `@OnEvent(eventNameOf<ValueCreatedEvent>())`. Type-driven; cleverer than necessary.

**Answer:**

### Q3.7 — Template sync — what mirrors into `create-marketlum-app`?

The project's `CLAUDE.md` rule: changes to `apps/api/`/`apps/web/` need mirroring under `packages/create-marketlum-app/template/`. Most of this spec lives in `packages/core/`, which **is** the template via npm install. Worth confirming the boundary.

- [ ] **Bus + types via `@marketlum/core` upgrade; template gets the dev-mode logging handler example only** — Since `@marketlum/core` is a dependency in the template's `apps/api/package.json`, the bus, subscriber, types, and constants travel automatically when the template bumps the dep. The only file we need to mirror is the dev-logging handler (or a placeholder `events/handlers/` directory with a README pointing at the bus) so new projects know where to add their own listeners.
- [ ] **Mirror everything explicitly** — Copy the events module into the template too. Decouples the template from the published core version; duplicates source.
- [x] **No template changes** — Template projects discover the bus by reading `@marketlum/core` exports. Lowest scaffolding cost; no in-template example.

**Answer:**

---

Reply **Done** when this round is complete. I'm planning to stop after Round 3 — these answers should give us enough to write the specification, unless something here uncovers a new question worth a fourth round.
