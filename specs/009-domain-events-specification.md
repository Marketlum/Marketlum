# 009 — Domain Events Specification

> Implementation-ready spec for an in-process domain event bus that emits `marketlum.<entity_snake_case>.<verb>` events for every CRUD mutation on primary entities. Decisions trail: [`009-domain-events-brainstorming.md`](./009-domain-events-brainstorming.md).

## 1. Overview

Marketlum publishes a typed domain event for every successful CRUD mutation against a primary entity, plus (in future PRs) named domain events for non-CRUD operations (`exchange.transitioned`, `invoice.sent`, …). v1 ships only CRUD events, the bus itself, and a dev-mode logging handler. No persistence, no external delivery, no actor attribution.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Request lifecycle                                                     │
│                                                                       │
│  Controller ──► Service ──► Repository ──► Postgres                   │
│                                  │                                    │
│                                  ▼                                    │
│                       DomainEventSubscriber                           │
│                                  │                                    │
│                                  ▼                                    │
│                   buffer (if in TX) ── afterTransactionCommit ──┐     │
│                                  │                              │     │
│                                  └── (no TX) ── emit ──────────►│     │
│                                                                 │     │
│                                                  EventEmitter2  │     │
│                                                       │         │     │
│                              ┌────────────────────────┼─────────┘     │
│                              ▼                        ▼               │
│                    @OnEvent('**') logger    @OnEvent('marketlum.…')   │
│                       (dev only)              (future handlers)       │
└──────────────────────────────────────────────────────────────────────┘
```

Key properties:
- Events fire **only after the surrounding transaction commits**. Rolled-back writes produce no events.
- Handlers run **async** (next tick) and **never fail the originating request**; thrown errors are caught, logged, and swallowed.
- Payload is the **full saved entity** plus a `code` shortcut when available.
- Coverage is **24 primary entities × 3 verbs = 72 CRUD event types**. Children/join entities (`ValueImage`, `ExchangeParty`, `ExchangeFlow`, `InvoiceItem`, `OfferingComponent`, `Address`, `Folder`) do **not** emit.

## 2. Event envelope

Every event the bus emits has the same envelope shape:

```ts
interface DomainEventEnvelope<TName extends string = string, TEntity = unknown> {
  name: TName;                              // 'marketlum.value.created'
  occurredAt: string;                       // ISO-8601, UTC
  payload: {
    id: string;                             // entity UUID (or numeric id, stringified)
    code?: string;                          // optional human-readable code (where present)
    entity: TEntity;                        // full saved entity at emit time
  };
}
```

Notes:
- `occurredAt` is stamped at emit time (after TX commit), not at the moment of `save()`.
- `payload.entity` is whatever the TypeORM subscriber's hook received as `entity` (the in-memory instance after the operation). Relations are included only if already loaded — handlers that need related data must re-fetch.
- For `deleted` events, `payload.entity` is the instance just before removal (TypeORM passes it to `afterRemove`).
- No `actor`, no `correlationId`, no `version` in v1 (Round 2 Q2.5).

## 3. Event taxonomy

### 3.1 Name format

```
marketlum.<entity_snake_case>.<verb>
```

- `<verb>` ∈ `{ created, updated, deleted }` (v1).
- `<entity_snake_case>` is the lowercase, snake_case form of the entity class name (Round 1 Q1.7).

### 3.2 Full list of v1 events (24 entities × 3 verbs = 72)

| Entity class       | Event name prefix              |
|--------------------|--------------------------------|
| `User`             | `marketlum.user.*`             |
| `Agent`            | `marketlum.agent.*`            |
| `Taxonomy`         | `marketlum.taxonomy.*`         |
| `File`             | `marketlum.file.*`             |
| `Value`            | `marketlum.value.*`            |
| `Perspective`      | `marketlum.perspective.*`      |
| `ValueInstance`    | `marketlum.value_instance.*`   |
| `ValueStream`      | `marketlum.value_stream.*`     |
| `Account`          | `marketlum.account.*`          |
| `Transaction`      | `marketlum.transaction.*`      |
| `Agreement`        | `marketlum.agreement.*`        |
| `Channel`          | `marketlum.channel.*`          |
| `Offering`         | `marketlum.offering.*`         |
| `Invoice`          | `marketlum.invoice.*`          |
| `Exchange`         | `marketlum.exchange.*`         |
| `Geography`        | `marketlum.geography.*`        |
| `Archetype`        | `marketlum.archetype.*`        |
| `Locale`           | `marketlum.locale.*`           |
| `AgreementTemplate`| `marketlum.agreement_template.*`|
| `Pipeline`         | `marketlum.pipeline.*`         |
| `Tension`          | `marketlum.tension.*`          |
| `RecurringFlow`    | `marketlum.recurring_flow.*`   |
| `ExchangeRate`     | `marketlum.exchange_rate.*`    |
| `SystemSetting`    | `marketlum.system_setting.*`   |

### 3.3 Entities explicitly excluded (Round 1 Q1.6)

| Entity              | Why excluded                                        |
|---------------------|-----------------------------------------------------|
| `ValueImage`        | Child of `Value` (image attachments).               |
| `ExchangeParty`     | Child of `Exchange` (party rows).                   |
| `ExchangeFlow`      | Child of `Exchange` (value-flow rows).              |
| `InvoiceItem`       | Child of `Invoice` (line items).                    |
| `OfferingComponent` | Child of `Offering`.                                |
| `Address`           | Child of `Agent` (one-to-many address records).     |
| `Folder`            | Grouped with `File` infrastructure for v1.          |

Mutating a child does **not** emit a child-level event, but the parent's `updated` event fires as part of the service-level orchestration that replaced/added the child rows (services already `save()` the parent after mutating children, e.g. `ExchangesService.replaceParties`).

## 4. TypeScript types (`packages/shared/src/events/`)

The shared package exports a discriminated union of all known events plus per-event aliases for handler signatures (Round 2 Q2.6).

```
packages/shared/src/events/
├── domain-event.ts          # the union, envelope type, exports
├── crud-events.ts           # generated-by-hand list of 72 CRUD events
└── index.ts
```

`packages/shared/src/events/domain-event.ts`:

```ts
import type { /* …all 24 primary entity types… */ } from '../entities';
// (Re-export entity TS types from @marketlum/core via the shared package.
//  If shared can't import core entities directly, declare structural
//  versions inline — payload.entity is opaque to type-only consumers.)

export interface DomainEventEnvelope<TName extends string, TEntity> {
  name: TName;
  occurredAt: string;
  payload: {
    id: string;
    code?: string;
    entity: TEntity;
  };
}

// Per-entity event aliases (3 per entity × 24 entities = 72 aliases).
// Authors of handlers use these for typed signatures.
export type ValueCreatedEvent  = DomainEventEnvelope<'marketlum.value.created',  Value>;
export type ValueUpdatedEvent  = DomainEventEnvelope<'marketlum.value.updated',  Value>;
export type ValueDeletedEvent  = DomainEventEnvelope<'marketlum.value.deleted',  Value>;
// …repeat for every entity in §3.2

// The discriminated union of every known event.
export type DomainEvent =
  | ValueCreatedEvent | ValueUpdatedEvent | ValueDeletedEvent
  | AgentCreatedEvent | AgentUpdatedEvent | AgentDeletedEvent
  | /* …all others… */;
```

`packages/shared/src/index.ts` adds:

```ts
export type {
  DomainEvent,
  DomainEventEnvelope,
  ValueCreatedEvent, ValueUpdatedEvent, ValueDeletedEvent,
  // …all 72 aliases
} from './events';
```

**No runtime constants are exported** (Round 3 Q3.6 — string literals only). Handlers write `@OnEvent('marketlum.value.created')` directly.

## 5. Backend implementation (`packages/core/src/events/`)

```
packages/core/src/events/
├── events.module.ts
├── domain-event-bus.service.ts
├── domain-event.subscriber.ts
├── logging-event.handler.ts
├── primary-entities.ts
└── index.ts
```

### 5.1 `primary-entities.ts`

Single source of truth for which entity classes emit and how their snake_case name maps:

```ts
import { User, Agent, /* …all 24 primaries… */ } from '../entities';

export interface PrimaryEntityDescriptor {
  cls: Function;
  snakeName: string;      // 'value', 'value_stream', 'exchange_rate', …
}

export const PRIMARY_ENTITIES: PrimaryEntityDescriptor[] = [
  { cls: User,              snakeName: 'user' },
  { cls: Agent,             snakeName: 'agent' },
  { cls: Taxonomy,          snakeName: 'taxonomy' },
  { cls: File,              snakeName: 'file' },
  { cls: Value,             snakeName: 'value' },
  { cls: Perspective,       snakeName: 'perspective' },
  { cls: ValueInstance,     snakeName: 'value_instance' },
  { cls: ValueStream,       snakeName: 'value_stream' },
  { cls: Account,           snakeName: 'account' },
  { cls: Transaction,       snakeName: 'transaction' },
  { cls: Agreement,         snakeName: 'agreement' },
  { cls: Channel,           snakeName: 'channel' },
  { cls: Offering,          snakeName: 'offering' },
  { cls: Invoice,           snakeName: 'invoice' },
  { cls: Exchange,          snakeName: 'exchange' },
  { cls: Geography,         snakeName: 'geography' },
  { cls: Archetype,         snakeName: 'archetype' },
  { cls: Locale,            snakeName: 'locale' },
  { cls: AgreementTemplate, snakeName: 'agreement_template' },
  { cls: Pipeline,          snakeName: 'pipeline' },
  { cls: Tension,           snakeName: 'tension' },
  { cls: RecurringFlow,     snakeName: 'recurring_flow' },
  { cls: ExchangeRate,      snakeName: 'exchange_rate' },
  { cls: SystemSetting,     snakeName: 'system_setting' },
];

const byCls = new Map<Function, string>(PRIMARY_ENTITIES.map((d) => [d.cls, d.snakeName]));

export function primaryEntitySnakeName(target: Function | string): string | undefined {
  if (typeof target === 'function') return byCls.get(target);
  // Fallback for string targets (TypeORM occasionally passes table name strings).
  const direct = PRIMARY_ENTITIES.find((d) => d.snakeName === target);
  return direct?.snakeName;
}
```

### 5.2 `domain-event-bus.service.ts`

Thin wrapper around `EventEmitter2` so future swap-outs (outbox, Redis pub/sub) don't need to touch every callsite.

```ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface EmitArgs<TEntity> {
  name: string;            // 'marketlum.value.created'
  id: string;
  code?: string;
  entity: TEntity;
}

@Injectable()
export class DomainEventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<TEntity>(args: EmitArgs<TEntity>): void {
    this.emitter.emit(args.name, {
      name: args.name,
      occurredAt: new Date().toISOString(),
      payload: { id: args.id, code: args.code, entity: args.entity },
    });
  }
}
```

`emit` is synchronous (publish to the in-memory ring) but `@OnEvent` handlers are registered async (§5.4).

### 5.3 `domain-event.subscriber.ts`

The single TypeORM subscriber that powers CRUD events. Handles both transactional and non-transactional saves:

- **Inside an explicit transaction** (`queryRunner.startTransaction()` somewhere up the stack): buffer events on the QueryRunner and flush them in `afterTransactionCommit`. Buffer is discarded in `afterTransactionRollback` (defensive — TypeORM also doesn't call `afterInsert` etc. for rolled-back ops, but explicit handling is clearer).
- **No explicit transaction** (the common case in Marketlum today): TypeORM still calls `afterInsert`/`afterUpdate`/`afterRemove` and there is no `afterTransactionCommit` to wait for. The subscriber emits immediately *after* the per-op hook returns, since at that point the implicit auto-commit has already happened from the application's perspective.

```ts
import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber,
         InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { DomainEventBus } from './domain-event-bus.service';
import { primaryEntitySnakeName } from './primary-entities';

type Pending = { name: string; id: string; code?: string; entity: unknown };

const BUFFER_KEY = Symbol('marketlumPendingEvents');

@Injectable()
@EventSubscriber()
export class DomainEventSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource, private readonly bus: DomainEventBus) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.handle(event, 'created');
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.handle(event, 'updated');
  }

  afterRemove(event: RemoveEvent<unknown>): void {
    this.handle(event, 'deleted');
  }

  afterTransactionCommit(event: { queryRunner: QueryRunner }): void {
    const buffer = this.getBuffer(event.queryRunner, /*clear=*/ true);
    for (const p of buffer) {
      this.bus.emit(p);
    }
  }

  afterTransactionRollback(event: { queryRunner: QueryRunner }): void {
    this.getBuffer(event.queryRunner, /*clear=*/ true);   // drop pending
  }

  private handle(
    event: InsertEvent<unknown> | UpdateEvent<unknown> | RemoveEvent<unknown>,
    verb: 'created' | 'updated' | 'deleted',
  ): void {
    const target = event.metadata.target;
    const snake = primaryEntitySnakeName(target as Function);
    if (!snake) return;                                 // child/join entity, skip

    const entity = (event as any).entity ?? (event as any).databaseEntity;
    if (!entity) return;

    const id = String((entity as { id?: string | number }).id ?? '');
    if (!id) return;
    const code = (entity as { code?: string }).code;

    const pending: Pending = { name: `marketlum.${snake}.${verb}`, id, code, entity };

    if (event.queryRunner?.isTransactionActive) {
      this.getBuffer(event.queryRunner).push(pending);
    } else {
      this.bus.emit(pending);
    }
  }

  private getBuffer(qr: QueryRunner, clear = false): Pending[] {
    const data = qr.data as Record<symbol, Pending[]>;
    const existing = data[BUFFER_KEY];
    if (clear) {
      delete data[BUFFER_KEY];
      return existing ?? [];
    }
    if (!existing) data[BUFFER_KEY] = [];
    return data[BUFFER_KEY];
  }
}
```

Notes:
- Registers itself via `dataSource.subscribers.push(this)` so it picks up the Nest-injected `DomainEventBus` (TypeORM's `@EventSubscriber()` decorator alone instantiates without DI).
- The buffer is stored on `queryRunner.data` (TypeORM's per-query-runner scratch space), keyed by a module-private `Symbol` to avoid clashing with anything else.
- `afterUpdate` does **not** filter no-op updates in v1 — every `save()` of a managed entity yields an `updated` event even if no column changed. Cheap to add later if it becomes a problem.

### 5.4 `logging-event.handler.ts`

The dev-mode listener that proves the wire end-to-end (Round 3 Q3.5). Subscribes to the wildcard pattern and logs at `debug`.

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class LoggingEventHandler {
  private readonly logger = new Logger('DomainEvents');

  @OnEvent('marketlum.**', { async: true })
  handle(event: { name: string; payload: { id: string; code?: string } }): void {
    this.logger.debug(
      `${event.name} id=${event.payload.id}${event.payload.code ? ` code=${event.payload.code}` : ''}`,
    );
  }
}
```

- Wildcard `marketlum.**` matches every namespaced event without subscribing to internal Nest events.
- `async: true` registers the handler on the next tick so request handling isn't blocked.

### 5.5 `events.module.ts`

```ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventBus } from './domain-event-bus.service';
import { DomainEventSubscriber } from './domain-event.subscriber';
import { LoggingEventHandler } from './logging-event.handler';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,             // needed for 'marketlum.**' patterns
      delimiter: '.',
      maxListeners: 50,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [DomainEventBus, DomainEventSubscriber, LoggingEventHandler],
  exports: [DomainEventBus],
})
export class EventsModule {}
```

### 5.6 `index.ts`

```ts
export { EventsModule } from './events.module';
export { DomainEventBus } from './domain-event-bus.service';
```

### 5.7 Wire-up in `marketlum-core.module.ts`

`MarketlumCoreModule` imports `EventsModule` **before** `TypeOrmModule.forRoot(...)` is finished bootstrapping the DataSource. `DomainEventSubscriber` injects `DataSource` and pushes itself onto `dataSource.subscribers` in its constructor — TypeORM is fine with subscribers being registered after `init` as long as it happens before the first query.

```ts
// packages/core/src/marketlum-core.module.ts
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig()),
    EventsModule,                          // ← new
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    /* …existing modules… */
  ],
  exports: [
    /* …existing… */
    EventsModule,                          // ← also exported so apps can inject DomainEventBus
  ],
})
export class MarketlumCoreModule {}
```

### 5.8 `packages/core/src/index.ts` additions

```ts
export { EventsModule } from './events/events.module';
export { DomainEventBus } from './events/domain-event-bus.service';
```

## 6. Service-level emit pattern (forward compatibility)

v1 ships **no** service-level emits — every CRUD event comes from the subscriber. But the bus is built so domain-specific events (added in future PRs) follow this pattern:

```ts
// example: future ExchangesService.transition()
async transition(id: string, action: ExchangeTransitionAction): Promise<Exchange> {
  // …existing transition logic, ends with:
  const saved = await this.exchangeRepository.save(exchange);

  this.eventBus.emit({
    name: 'marketlum.exchange.transitioned',
    id: saved.id,
    code: saved.code,
    entity: saved,
  });

  return saved;
}
```

When the `save()` above is **not** in an explicit transaction, the CRUD `marketlum.exchange.updated` event fires from the subscriber, then `marketlum.exchange.transitioned` fires from the service. Handlers that want to react to "any update" still see `updated`; handlers that want the narrower signal subscribe to `transitioned`.

## 7. Dependencies

`packages/core/package.json` adds:

```json
"@nestjs/event-emitter": "^2.0.4"
```

(`^2.x` is the Nest 10-compatible line; matches the rest of `@nestjs/*` v10 deps already in the repo.)

No new dependency in `packages/shared` — types only.

## 8. Database / migrations

**None.** No persistence in v1 (Round 1 Q1.5). No table, no migration, no data backfill.

## 9. UI / Web

**None.** No admin pages, no live stream view, no SSE endpoint (Round 3 Q3.5 — explicitly out of scope for v1).

## 10. Permissions

**None.** Events are emitted in-process; nothing crosses an HTTP boundary. The existing `AdminGuard` on controllers is unchanged — events fire as a side effect of authenticated mutations, never independently.

## 11. Test harness (`apps/api/test/setup.ts`)

Add an `EventRecorder` that subscribes wildcard, records every emission, and exposes inspection helpers. Step definitions retrieve it via `getApp().get(EventRecorder)` and clear it between scenarios.

### 11.1 `apps/api/test/event-recorder.ts`

```ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface RecordedEvent {
  name: string;
  occurredAt: string;
  payload: { id: string; code?: string; entity: unknown };
}

@Injectable()
export class EventRecorder {
  private events: RecordedEvent[] = [];

  @OnEvent('marketlum.**')
  capture(event: RecordedEvent): void {
    this.events.push(event);
  }

  getAll(): RecordedEvent[] {
    return [...this.events];
  }

  getByName(name: string): RecordedEvent[] {
    return this.events.filter((e) => e.name === name);
  }

  clear(): void {
    this.events.length = 0;
  }
}
```

### 11.2 Wire into the test app

`apps/api/test/setup.ts` registers the recorder as an extra provider on the test module:

```ts
// In bootstrapApp() in apps/api/test/setup.ts:
const moduleFixture: TestingModule = await Test.createTestingModule({
  imports: [AppModule],
  providers: [EventRecorder],              // ← new
}).compile();

// Existing app setup…

// Expose helper for step files:
export function getEventRecorder(): EventRecorder {
  return app.get(EventRecorder);
}
```

`cleanDatabase()` also clears the recorder so events from one scenario don't leak into the next:

```ts
export async function cleanDatabase(): Promise<void> {
  // …existing TRUNCATE + throttler reset…
  app.get(EventRecorder).clear();
}
```

## 12. BDD coverage

Per Round 3 Q3.3 (user override): add event-emission assertions to **existing** feature files for **4 entities only**, not all 24. The chosen four:

| Entity   | Feature file                                        | Why |
|----------|-----------------------------------------------------|-----|
| `Value`  | `packages/bdd/features/values.feature`              | Most representative top-level entity, has `code`. |
| `Agent`  | `packages/bdd/features/agents.feature`              | Has `code`, simple shape. |
| `Invoice`| `packages/bdd/features/invoices.feature`            | Richer shape with line items (verifies child-mutation does NOT emit child events). |
| `Exchange`| `packages/bdd/features/exchanges.feature`          | State-machine entity (verifies that `transition` still emits `updated`; reserves the room for `transitioned` later). |

### 12.1 New scenarios per feature

For each of the four features, append a `Scenario` section like:

```gherkin
Scenario: Creating a value emits marketlum.value.created
  Given I am authenticated as an admin
  When I POST to "/values" with a valid payload
  Then the response status is 201
  And the event "marketlum.value.created" was published with the new value's id and code

Scenario: Updating a value emits marketlum.value.updated
  Given I am authenticated as an admin
  And a value exists
  When I PATCH the value with a new name
  Then the response status is 200
  And the event "marketlum.value.updated" was published with the value's id

Scenario: Deleting a value emits marketlum.value.deleted
  Given I am authenticated as an admin
  And a value exists
  When I DELETE the value
  Then the response status is 204
  And the event "marketlum.value.deleted" was published with the value's id
```

For `Invoice`, add an additional scenario asserting the *child* boundary:

```gherkin
Scenario: Adding an invoice item emits invoice.updated but no item-level event
  Given I am authenticated as an admin
  And an invoice exists
  When I PATCH the invoice to add a line item
  Then the response status is 200
  And the event "marketlum.invoice.updated" was published with the invoice's id
  And no event with name matching "marketlum.invoice_item.*" was published
```

### 12.2 New step definitions

Add a shared steps helper (used by all four feature files):

`apps/api/test/events/event-steps.ts`:

```ts
import { DefineStepFunction } from 'jest-cucumber';
import { getEventRecorder } from '../setup';

export function registerEventSteps(then: DefineStepFunction, and: DefineStepFunction) {
  then(/^the event "(.*)" was published with the .*'s id$/, (name: string) => {
    const events = getEventRecorder().getByName(name);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[events.length - 1].payload.id).toBeTruthy();
  });

  and(/^the event "(.*)" was published with the .*'s id and code$/, (name: string) => {
    const events = getEventRecorder().getByName(name);
    expect(events.length).toBeGreaterThanOrEqual(1);
    const last = events[events.length - 1];
    expect(last.payload.id).toBeTruthy();
    expect(last.payload.code).toBeTruthy();
  });

  and(/^no event with name matching "(.*)" was published$/, (pattern: string) => {
    const prefix = pattern.replace(/\*+$/, '');
    const matches = getEventRecorder().getAll().filter((e) => e.name.startsWith(prefix));
    expect(matches).toEqual([]);
  });
}
```

Each of the four `*.steps.ts` files imports `registerEventSteps` and calls it inside its `defineFeature(...)` block. The 4 features × 3 verbs (+ 1 boundary check on Invoice) = **13 new scenarios**.

Update the test count in `MEMORY.md` after the PR lands.

### 12.3 The remaining 20 primary entities

Their CRUD events are still produced by the subscriber and verified indirectly: the subscriber has unit-test-grade coverage via the four feature files above (every verb, child-exclusion case). The remaining 20 entities don't need their own scenarios in v1 — the generic plumbing is the same code path. Per-entity coverage can be added later when a handler attached to one of those entities actually relies on the event.

## 13. Out of scope (v1)

Captured from the brainstorming so reviewers know what's deliberately deferred:

| Excluded                                | From brainstorm | When to revisit |
|-----------------------------------------|-----------------|-----------------|
| Persistent `domain_events` table        | Q1.5            | When we need audit/replay/external delivery. |
| Webhook delivery to external consumers  | Q1.1            | When the first external integration is requested. |
| Activity-feed UI                        | Q1.1            | When an audit feature is scoped. |
| Domain-specific named events (`exchange.transitioned`, `invoice.sent`, …) | Q1.3 | Added incrementally per use case; bus is ready. |
| Actor (`userId`) attribution            | Q2.5            | When an activity feed or attribution UI ships. |
| Runtime constants for event names       | Q3.6            | If/when refactor pressure makes string literals painful. |
| Per-row `previous` state on `updated`   | Q2.1            | When a diff-based handler is built. |
| Coalesced batch events                  | Q2.7            | If bulk-import noise becomes a real problem. |
| Template (`create-marketlum-app`) changes | Q3.7          | Template inherits the bus via the `@marketlum/core` upgrade automatically. |
| CRUD events for `ValueImage`, `ExchangeParty`, `ExchangeFlow`, `InvoiceItem`, `OfferingComponent`, `Address`, `Folder` | Q1.6 | When a consumer needs child-level granularity. |

## 14. Delivery plan

Single PR. Order within the PR:

1. **Shared types**
   - `packages/shared/src/events/{domain-event.ts,crud-events.ts,index.ts}`
   - Update `packages/shared/src/index.ts`
   - Rebuild shared: `pnpm --filter @marketlum/shared build`
2. **Core: events module**
   - `packages/core/src/events/{events.module.ts,domain-event-bus.service.ts,domain-event.subscriber.ts,logging-event.handler.ts,primary-entities.ts,index.ts}`
   - Wire `EventsModule` into `MarketlumCoreModule` (`imports` + `exports`)
   - Export `EventsModule` and `DomainEventBus` from `packages/core/src/index.ts`
   - Add `@nestjs/event-emitter` to `packages/core/package.json`; run `pnpm install`
   - Build core: `pnpm --filter @marketlum/core build`
3. **Test harness**
   - `apps/api/test/event-recorder.ts`
   - Patch `apps/api/test/setup.ts` (register provider, clear in `cleanDatabase`, export `getEventRecorder`)
   - `apps/api/test/events/event-steps.ts`
4. **BDD: feature edits**
   - Append CRUD-event scenarios to `values.feature`, `agents.feature`, `invoices.feature`, `exchanges.feature`
   - Append invoice-item boundary scenario to `invoices.feature`
   - Call `registerEventSteps(...)` in each of the four `*.steps.ts` files
5. **Run + tighten**
   - `pnpm test:e2e` — confirm new scenarios pass and existing 670 do not regress
   - `pnpm --filter api typecheck` and `pnpm --filter @marketlum/shared build` clean
6. **Memory bump**
   - Update test count in `MEMORY.md` (670 → 683 expected).

### Verification (per the project's "no full e2e in conversation" rule)

- Type checks: `pnpm --filter @marketlum/shared build`, `pnpm --filter @marketlum/core build`, `pnpm --filter api typecheck`.
- Targeted e2e: `pnpm test:e2e -- values.feature agents.feature invoices.feature exchanges.feature`.
- Manual smoke: `pnpm dev`, hit `POST /values` once with `LOG_LEVEL=debug`; expect a `[DomainEvents] marketlum.value.created id=… code=…` line.
