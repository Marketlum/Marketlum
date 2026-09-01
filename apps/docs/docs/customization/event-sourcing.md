---
sidebar_position: 10
---

# Event sourcing

Marketlum is a **hybrid**: most entities are ordinary CRUD, and a small number
of aggregates with a real lifecycle are event-sourced. Today that is
[Tensions](../concepts/tensions.md); the store is built so Exchanges, Orders,
Invoices and the Ledger can follow without a schema migration.

## The store

`domain_events` is append-only and keyed by `(aggregateType, aggregateId, version)`:

| Column | Purpose |
|---|---|
| `aggregateType`, `aggregateId`, `version` | stream identity; unique together |
| `sequence` | global append order |
| `type`, `payload`, `schemaVersion` | the fact itself |
| `occurredAt` | when it happened |
| `correlationId`, `causationId` | grouping and provenance |
| `actorKind`, `userId`, `apiKeyId`, `ip`, … | attribution, denormalised |

There are **no foreign keys** — like `audit_logs`, entries must survive the
deletion of the user or API key that produced them.

### Guarantees

- **Append-only.** Rows are never updated or deleted.
- **Optimistic concurrency.** The unique constraint on
  `(aggregateType, aggregateId, version)` makes two writers at the same version
  impossible; the loser receives `409 Conflict`.
- **Transactional projection.** An event and the read-model row it implies
  commit together, so reads are never behind writes.
- **Intent on the bus.** Event-sourced aggregates emit
  `marketlum.<entity>.<verb>` with a verb per event type (`sensed`, `rescored`,
  `resolved`, …) instead of the CRUD `created`/`updated`/`deleted` triplet. The
  audit trail records these alongside everything else.

## Projections

A read model is a plain table maintained by a projector. For Tensions, one pure
reducer serves both aggregate reconstitution and the projection, so the write
model and read model cannot disagree.

Projection tables are **not** written directly. Saving a `Tension` entity by
hand appears to work until the next rebuild reverts it.

## Rebuilding

```bash
pnpm tension:rebuild             # dry run: reports the diff, writes nothing
pnpm tension:rebuild --execute   # applies it
```

The rebuild replays every stream and reconciles the table **in place** —
upserting rows, deleting those whose stream ends in a discard, and reporting any
row that has no stream at all (which means something wrote outside the command
path).

It never truncates: `exchanges.tensionId` references `tensions`, and truncating
would silently sever those links.

## Schema evolution

Every event row carries a `schemaVersion`. The rule is **additive-only**:
payloads may gain optional fields, but never rename or remove one. There is no
upcasting machinery, and it should be added the first time that rule genuinely
needs breaking — not before.

## Adding a new event-sourced aggregate

1. Define the event vocabulary and payload schemas in `@marketlum/shared`.
2. Write a pure reducer: `applyEvent(state, event) => state`.
3. Add command classes and CQRS handlers that load the stream, guard, and decide
   which events to append.
4. Add a projector and a rebuild command.
5. Remove the entity from `primaryEntityDescriptors` so the TypeORM subscriber
   stops deriving CRUD verbs for it, and emit the new verbs from the store.

`packages/core/src/tensions/` is the reference implementation.
