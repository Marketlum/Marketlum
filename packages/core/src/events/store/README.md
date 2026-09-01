# Event store

Append-only store backing event-sourced aggregates (spec 027).

Today only **Tensions** writes here. The schema is generic —
`(aggregateType, aggregateId, version)` — so Exchanges, Orders, Invoices and the
Ledger can adopt it without a migration, but the *code* is deliberately not
abstracted ahead of a second consumer (spec 027 Q2).

## Guarantees

- **Append-only.** Rows are never updated or deleted. `DomainEvent` is not a
  domain-event primary entity, so appending emits no `marketlum.domain_event.*`.
- **Optimistic concurrency.** `UQ_domain_events_stream_version` makes two
  writers at the same version impossible; the loser gets a `409 Conflict`.
- **Transactional with the projection.** `append()` takes a caller-supplied
  `EntityManager`, so the event and the read-model row it implies commit
  together (spec 027 Q16). Bus emission happens after that commit.
- **No foreign keys.** Attribution is denormalised so events survive user and
  API-key deletion, exactly as `audit_logs` does (spec 026 Q8).

## Attribution, correlation, causation

Attribution is read from the `AuditContext` ALS at append time. Outside a
request — seeders, CLI commands, the migration backfill — this yields
`actorKind = 'system'`.

`correlationId` is minted on the first append in a request and reused for the
rest of it, so one unit of work is one group.

`causationId` points at the `domain_events.id` of the event that caused this
one, and is `NULL` when the cause is a direct user command.

> **Known limitation.** In the actor-deletion cascade (spec 027 Q7) the
> `TensionDiscarded` events carry `causationId = NULL`, because Actors remain a
> CRUD entity and their deletion is not itself a stored domain event. The shared
> `correlationId` is what groups that cascade. This resolves itself if and when
> Actors become event-sourced.

## Schema evolution

Each row carries `schemaVersion`. The rule is **additive-only**: payloads may
gain optional fields, but never rename or remove one. Upcasting machinery is
deliberately absent and should be added the first time that rule genuinely needs
breaking, not before (spec 027 Q22).

## Rebuilding

`pnpm tension:rebuild` replays every stream and reconciles the `tensions`
projection **in place** — upsert, then delete rows whose stream ends in
`TensionDiscarded` or which have no stream at all. It must never truncate:
`exchanges.tensionId` references `tensions`, and truncating would silently sever
those links. Dry-run by default; pass `--execute` to apply.
