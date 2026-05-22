---
sidebar_position: 7
---

# Domain Events

`@marketlum/core` publishes a typed domain event after every successful CRUD mutation on a primary entity. You can subscribe to these events from your own code in `apps/api` to send webhooks, write to an audit log, push notifications, sync to a search index, or anything else that needs to react to writes &mdash; **without modifying core**.

## Event name convention

Every event name follows this shape:

```
marketlum.<entity_snake_case>.<verb>
```

- `<verb>` is one of `created`, `updated`, `deleted`.
- `<entity_snake_case>` is the lowercase, snake_case form of the entity class (`value`, `value_stream`, `exchange_rate`, &hellip;).

So when an admin creates a value through the UI or API, `marketlum.value.created` fires; when they delete an agent, `marketlum.agent.deleted` fires.

## Event envelope

Every event the bus emits has the same shape. Import the type from `@marketlum/shared`:

```ts
import type { DomainEventEnvelope } from '@marketlum/shared';

interface DomainEventEnvelope<TName extends string, TEntity> {
  name: TName;                  // e.g. 'marketlum.value.created'
  occurredAt: string;           // ISO-8601 UTC, stamped when the event fires
  payload: {
    id: string;                 // entity id (UUID, stringified)
    code?: string;              // human-readable code, when the entity has one
    entity: TEntity;            // the full saved entity at emit time
  };
}
```

Per-entity aliases are also exported so handler signatures stay typed:

```ts
import type {
  ValueCreatedEvent,
  ValueUpdatedEvent,
  ValueDeletedEvent,
  AgentCreatedEvent,
  // ...
} from '@marketlum/shared';
```

There are 72 such aliases (24 entities &times; 3 verbs). The generic argument lets you narrow `payload.entity` to your own entity type if you need it.

## Subscribing to events

Domain events ride on `@nestjs/event-emitter`. Inside any provider in `apps/api`, decorate a method with `@OnEvent` and the event name:

```ts title="apps/api/src/webhooks/value-listener.ts"
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ValueCreatedEvent } from '@marketlum/shared';

@Injectable()
export class ValueListener {
  private readonly logger = new Logger(ValueListener.name);

  @OnEvent('marketlum.value.created')
  async handleValueCreated(event: ValueCreatedEvent) {
    this.logger.log(`new value: ${event.payload.id} (${event.payload.code})`);
    // forward to a webhook, write to an audit table, etc.
  }
}
```

Register the provider in any module that `apps/api` imports:

```ts title="apps/api/src/webhooks/webhooks.module.ts"
import { Module } from '@nestjs/common';
import { ValueListener } from './value-listener';

@Module({
  providers: [ValueListener],
})
export class WebhooksModule {}
```

Wildcards work too. The dot is the delimiter, `*` matches one segment, `**` matches the rest of the chain:

```ts
@OnEvent('marketlum.value.*')        // any verb on values
@OnEvent('marketlum.*.deleted')      // any entity, only deletions
@OnEvent('marketlum.**')             // every domain event
```

## What you can rely on

A handful of guarantees the bus gives you:

- **Events fire only after the surrounding database transaction commits.** A rolled-back write produces no event. Inside an explicit transaction, all events from that transaction are buffered and flushed together on commit.
- **Handlers run asynchronously on the next tick.** They never block the originating HTTP request.
- **A throw inside your handler never fails the originating request.** Errors are caught and logged; the request that triggered the event still succeeds.
- **`payload.entity` is the in-memory instance at emit time.** Relations are included only if they were already loaded. If you need related data, refetch it inside your handler with the relevant service or repository.
- **`deleted` events carry the entity that was just removed**, so you still have access to its columns after deletion.

## Available events

The bus emits for these 24 primary entities. Each row contributes three event names (`*.created`, `*.updated`, `*.deleted`):

| Entity              | Event prefix                          |
|---------------------|---------------------------------------|
| `User`              | `marketlum.user.*`                    |
| `Agent`             | `marketlum.agent.*`                   |
| `Taxonomy`          | `marketlum.taxonomy.*`                |
| `File`              | `marketlum.file.*`                    |
| `Value`             | `marketlum.value.*`                   |
| `Perspective`       | `marketlum.perspective.*`             |
| `ValueInstance`     | `marketlum.value_instance.*`          |
| `ValueStream`       | `marketlum.value_stream.*`            |
| `Account`           | `marketlum.account.*`                 |
| `Transaction`       | `marketlum.transaction.*`             |
| `Agreement`         | `marketlum.agreement.*`               |
| `Channel`           | `marketlum.channel.*`                 |
| `Offering`          | `marketlum.offering.*`                |
| `Invoice`           | `marketlum.invoice.*`                 |
| `Exchange`          | `marketlum.exchange.*`                |
| `Geography`         | `marketlum.geography.*`               |
| `Archetype`         | `marketlum.archetype.*`               |
| `Locale`            | `marketlum.locale.*`                  |
| `AgreementTemplate` | `marketlum.agreement_template.*`      |
| `Pipeline`          | `marketlum.pipeline.*`                |
| `Tension`           | `marketlum.tension.*`                 |
| `RecurringFlow`     | `marketlum.recurring_flow.*`          |
| `ExchangeRate`      | `marketlum.exchange_rate.*`           |
| `SystemSetting`     | `marketlum.system_setting.*`          |

## Child entities don&apos;t emit

Some tables are modelled as children of a primary entity and do **not** emit their own events. Mutating one of these still fires the parent&apos;s `updated` event, because the service that owns the parent saves it as part of the same operation.

| Child / join entity   | Parent      |
|-----------------------|-------------|
| `ValueImage`          | `Value`     |
| `ExchangeParty`       | `Exchange`  |
| `ExchangeFlow`        | `Exchange`  |
| `InvoiceItem`         | `Invoice`   |
| `OfferingComponent`   | `Offering`  |
| `Address`             | `Agent`     |
| `Folder`              | `File`      |

So if you add a line item to an invoice, you&apos;ll see `marketlum.invoice.updated` &mdash; not `marketlum.invoice_item.created`. Subscribe at the parent boundary.

## Tips

- **Side-effects only.** Treat handlers as fire-and-forget side effects, not part of the request path. The bus is in-process; there is no retry, persistence, or external delivery in this version.
- **Use the dev logger to discover events.** With `LOG_LEVEL=debug`, every emitted event is logged as `[DomainEvents] marketlum.value.created id=&hellip; code=&hellip;`. A quick way to see what fires during a workflow you&apos;re building against.
- **Don&apos;t emit your own `marketlum.*` events.** That namespace belongs to core. If you need your own events, use your own namespace (e.g. `myorg.invoices.paid`).
- **Don&apos;t modify the entity inside a handler.** Treat `payload.entity` as read-only. If you need to react with a write, call a service or repository &mdash; that write will then emit its own event.
