# Spec 027 — Event-Sourced Tensions

> **Status:** Ready for implementation
> **Decision trail:** [027-event-sourced-tensions-brainstorming.md](./027-event-sourced-tensions-brainstorming.md) (Q1–Q29)
> **Depends on:** spec 020 (HRBAC), spec 026 (audit trail — `AuditContext` ALS is reused for event attribution)

## 1. Overview

Convert the Tension aggregate from CRUD to event sourcing. A new append-only `domain_events` table
becomes the record of truth; the `tensions` table is demoted to a synchronously-maintained,
rebuildable projection. Writes go through eleven commands dispatched on a `@nestjs/cqrs` bus, each
producing intent-carrying events (`TensionSensed`, `TensionRescored`, `TensionResolved`, …) rather
than an undifferentiated `updated`.

Tensions is the pilot: the smallest well-formed aggregate in the codebase (one nullable incoming FK,
low volume, a real lifecycle). The event-store schema and machinery established here are intended to
be adopted by Exchanges, Orders, Invoices and the Ledger later, but this spec converts **only**
Tensions.

```
   POST /tensions                    ┌──────────────────┐
   POST /tensions/:id/rename         │   CommandBus     │
   POST /tensions/:id/rescore   ──►  │  (@nestjs/cqrs)  │
   POST /tensions/:id/resolve        │  11 handlers     │
   DELETE /tensions/:id              └────────┬─────────┘
                                              │
                            ┌─────────────────▼──────────────────┐
                            │  ONE TRANSACTION                   │
                            │  1. reconstitute from stream       │
                            │  2. guard (legality, invariants)   │
                            │  3. append event(s)  ──────────────┼──► domain_events
                            │  4. apply to projection ───────────┼──► tensions
                            └─────────────────┬──────────────────┘
                                              │ post-commit
                                  marketlum.tension.<verb>  ──► DomainEventBus ──► AuditTrailHandler

   GET /tensions/:id            ─┐
   GET /tensions/search          ├──►  tensions (projection) + search_vector
   exchanges.tensionId FK       ─┘
   GET /tensions/:id/history     ────►  domain_events (rendered timeline)

   pnpm tension:rebuild          ────►  replay all streams, upsert-and-reconcile
```

## 2. Domain model

### 2.1 Commands and events

Eleven commands produce twelve event types. All events are past-tense facts; all carry the previous
value of what they change so the history endpoint renders without replaying (Q9).

| Command | Event(s) | Payload |
|---|---|---|
| `SenseTension` | `TensionSensed` | `{ name, currentContext, potentialFuture, score, actorId, leadUserId }` |
| `RenameTension` | `TensionRenamed` | `{ name, previousName }` |
| `RescoreTension` | `TensionRescored` | `{ score, previousScore }` |
| `ReviseTensionContext` | `TensionContextRevised` | `{ currentContext?, potentialFuture?, previousCurrentContext?, previousPotentialFuture? }` |
| `AssignTensionLead` | `TensionLeadAssigned` | `{ leadUserId, previousLeadUserId }` |
| `AssignTensionLead` (null) | `TensionLeadUnassigned` | `{ previousLeadUserId }` |
| `ReassignTension` | `TensionReassigned` | `{ actorId, previousActorId }` |
| `ResolveTension` | `TensionResolved` | `{}` |
| `DropTension` | `TensionDropped` | `{}` |
| `ReopenTension` | `TensionReopened` | `{}` |
| `ReviveTension` | `TensionRevived` | `{}` |
| `DiscardTension` | `TensionDiscarded` | `{}` |

Rules:

- A command that would change nothing (rescore 5 → 5, rename to the same string) is a **no-op**: no
  event is appended, the current projection is returned with `200`. This keeps the stream free of
  empty facts.
- `ReviseTensionContext` accepts either or both prose fields and emits one event carrying only the
  fields actually supplied and changed.
- `AssignTensionLead` with `leadUserId: null` emits `TensionLeadUnassigned`; a no-op when already
  unassigned.

### 2.2 Lifecycle

`tensionMachine` (xstate) is **retired for Tensions** (Q12). Legality moves into pure guards in
`tension.aggregate.ts`. The transition table is unchanged:

```
                 resolve
        ┌────────────────────────►  resolved
        │                              │
      alive  ◄──────────────────────────┘
        │            reopen
        │  drop
        └────────────────────────►  stale
        ▲                              │
        └──────────────────────────────┘
                     revive
```

Illegal transitions return `400 Bad Request` with the same message shape the current
`TensionsService.transition` produces: `Cannot transition from <state> using action "<action>"`.

`packages/shared/src/machines/tension.machine.ts`, `TensionTransitionAction` and
`transitionTensionSchema` are **deleted** (see §14, breaking changes).

### 2.3 Reconstitution and projection share one reducer

A single pure function serves both aggregate reconstitution and the read-model projector:

```ts
// packages/core/src/tensions/tension.reducer.ts
export interface TensionState {
  id: string; name: string; currentContext: string | null; potentialFuture: string | null;
  score: number; state: TensionStateEnum; actorId: string; leadUserId: string | null;
  version: number; createdAt: Date; updatedAt: Date; discarded: boolean;
}

export function applyTensionEvent(state: TensionState | null, event: TensionEvent): TensionState | null;
export function reconstitute(events: TensionEvent[]): TensionState | null;
```

Command handlers call `reconstitute()` to load current state and guard; the projector calls
`applyTensionEvent()` to advance the row. One function, so the write model and read model cannot
disagree.

## 3. Event store

### 3.1 Table

Generic schema, Tensions-only usage in this spec (Q2). No foreign keys — attribution is denormalised
so entries survive user and API-key deletion, exactly as `audit_logs` does (spec 026 Q8).

```sql
CREATE TABLE "domain_events" (
  "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
  "sequence"       bigserial NOT NULL,
  "aggregateType"  character varying(64) NOT NULL,
  "aggregateId"    uuid NOT NULL,
  "version"        integer NOT NULL,
  "type"           character varying(64) NOT NULL,
  "schemaVersion"  integer NOT NULL DEFAULT 1,
  "payload"        jsonb NOT NULL DEFAULT '{}',
  "occurredAt"     timestamptz NOT NULL DEFAULT now(),
  "correlationId"  uuid,
  "causationId"    uuid,
  "actorKind"      "audit_actor_kind_enum" NOT NULL,
  "userId"         uuid,
  "userEmail"      character varying,
  "userName"       character varying,
  "apiKeyId"       uuid,
  "apiKeyName"     character varying,
  "ip"             character varying,
  "userAgent"      character varying,
  CONSTRAINT "PK_domain_events" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_domain_events_stream_version"
    UNIQUE ("aggregateType", "aggregateId", "version")
);

CREATE INDEX "IDX_domain_events_stream"      ON "domain_events" ("aggregateType", "aggregateId", "version");
CREATE INDEX "IDX_domain_events_sequence"    ON "domain_events" ("sequence");
CREATE INDEX "IDX_domain_events_correlation" ON "domain_events" ("correlationId");
```

`audit_actor_kind_enum` is reused from spec 026 — do not create a second enum.

### 3.2 Attribution, correlation, causation (Q10)

- Attribution fields are read from `AuditContext.get()` at append time. Outside a request (seeder,
  CLI, migration backfill) the store writes `actorKind = 'system'`.
- `correlationId` — one UUID per request, minted by the event store on first append within a request
  and held on the ALS context. One actor deletion cascading into N `TensionDiscarded` events
  produces N rows sharing one `correlationId`.
- `causationId` — the `domain_events.id` of the event that caused this one. `NULL` when the cause is
  a direct user command. In the actor-deletion cascade it is `NULL`, because Actors remain CRUD and
  their deletion is not itself a stored domain event; the shared `correlationId` is what groups the
  cascade. This is a known limitation and is documented in the module README.

### 3.3 Service

```ts
// packages/core/src/events/store/event-store.service.ts
class EventStore {
  append(qr: QueryRunner, aggregateType: string, aggregateId: string,
         expectedVersion: number, events: NewEvent[]): Promise<StoredEvent[]>;
  readStream(aggregateType: string, aggregateId: string): Promise<StoredEvent[]>;
  readAllStreams(aggregateType: string): AsyncIterable<StoredEvent[]>;  // grouped by aggregateId, for rebuild
}
```

`append` writes at `expectedVersion + 1 … + n`. Concurrency is optimistic (Q5): a concurrent writer
violates `UQ_domain_events_stream_version`; the handler catches the unique violation and throws
`ConflictException` → **409**. Clients recover by refetching and retrying.

## 4. Projection

The `tensions` table keeps its current columns and gains one:

| Change | Detail |
|---|---|
| `+ version integer NOT NULL DEFAULT 0` | mirrors the stream head; exposed in read responses and used to diff during rebuild |
| `actorId` FK | `ON DELETE CASCADE` → **`ON DELETE RESTRICT`** (Q7) |
| `search_vector` | unchanged — the existing trigger fires on projector upserts; never bypass it with `COPY` |
| everything else | unchanged, so `SearchService`, `exchanges.tensionId` and all read paths are untouched |

The projector runs **synchronously in the same transaction as the append** (Q16). Read-your-writes
holds; every command endpoint returns the projected entity.

### 4.1 Rebuild (Q17, Q18)

`tensions` cannot be truncated — `exchanges.tensionId` references it with `ON DELETE SET NULL`, so a
truncate would silently sever exchange↔tension links. Rebuild is **upsert-and-reconcile in place**:

1. Stream every `aggregateType='tension'` stream in `aggregateId` order.
2. `reconstitute()` each; upsert the resulting row (fires `search_vector` trigger).
3. Delete projection rows whose stream terminates in `TensionDiscarded`.
4. Delete projection rows with no stream at all, reporting each one loudly — their existence means
   something wrote to `tensions` outside the command path.
5. Report a summary: streams replayed, rows inserted / updated / unchanged / deleted.

Invoked by CLI (`nest-commander`, mirroring `audit-prune.command.ts`):

```
pnpm tension:rebuild              # dry-run: reports the diff, writes nothing
pnpm tension:rebuild --execute    # applies it
```

**Refinement of Q18:** the brainstorm said "add `--dry-run`". The implementation inverts it to match
the `audit:prune` precedent — dry by default, `--execute` to write. A destructive full-table
operation should require deliberate typing.

Scripts to add: root `package.json` → `"tension:rebuild": "pnpm --filter @marketlum/core run build && pnpm --filter @marketlum/api run tension:rebuild"`; `apps/api/package.json` → `"tension:rebuild": "ts-node src/cli.ts tension:rebuild"`.

## 5. API surface

`PATCH /tensions/:id` and `POST /tensions/:id/transitions` are **removed** (Q4, Q11 Option A).

| Method | Path | Command | Body | Success |
|---|---|---|---|---|
| POST | `/tensions` | `SenseTension` | `createTensionSchema` | 201 |
| POST | `/tensions/:id/rename` | `RenameTension` | `{ name }` | 200 |
| POST | `/tensions/:id/rescore` | `RescoreTension` | `{ score }` | 200 |
| POST | `/tensions/:id/revise` | `ReviseTensionContext` | `{ currentContext?, potentialFuture? }` | 200 |
| POST | `/tensions/:id/lead` | `AssignTensionLead` | `{ leadUserId: uuid \| null }` | 200 |
| POST | `/tensions/:id/reassign` | `ReassignTension` | `{ actorId }` | 200 |
| POST | `/tensions/:id/resolve` | `ResolveTension` | — | 200 |
| POST | `/tensions/:id/drop` | `DropTension` | — | 200 |
| POST | `/tensions/:id/reopen` | `ReopenTension` | — | 200 |
| POST | `/tensions/:id/revive` | `ReviveTension` | — | 200 |
| DELETE | `/tensions/:id` | `DiscardTension` | — | 204 |
| GET | `/tensions/search` | — | — | 200 |
| GET | `/tensions/:id` | — | — | 200 |
| GET | `/tensions/:id/history` | — | — | 200 |

All mutating endpoints return the full projected tension (same `TensionResponseDto` as today, plus
`version`). Route declaration order must keep `GET /tensions/search` above `GET /tensions/:id`, as it
is today.

Status codes: `400` illegal transition or validation failure · `404` unknown tension / actor / lead
user · `409` concurrent write · `403` missing permission.

### 5.1 History response (Q15)

```jsonc
{
  "data": [
    {
      "version": 3,
      "type": "TensionRescored",
      "occurredAt": "2026-08-14T09:12:44.201Z",
      "actor": { "kind": "human", "userId": "…", "userName": "Paweł Jędrzejewski" },
      "summary": "Score raised from 5 to 8",
      "summaryKey": "history.rescored.raised",
      "summaryParams": { "from": 5, "to": 8 },
      "payload": { "score": 8, "previousScore": 5 }
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 3, "totalPages": 1 }
}
```

**Refinement of Q15:** the brainstorm specified a server-rendered `summary`. The app is
`next-intl`-localised (including Polish), so a server-rendered English string alone would be
untranslatable. The endpoint therefore returns `summary` (English, always present, usable by API and
MCP consumers) **plus** `summaryKey` + `summaryParams` so the UI can localise. The UI stays dumb in
the sense Q15 intended — it never inspects `payload` to decide what to render.

Ordered `version DESC`, paginated with the standard `paginationQuerySchema`.

## 6. Shared package additions

```
packages/shared/src/events/tension-events.ts     NEW  — TensionEventType enum, per-event payload
                                                        Zod schemas, TensionEvent discriminated union
packages/shared/src/schemas/tension.schema.ts    EDIT — add renameTensionSchema, rescoreTensionSchema,
                                                        reviseTensionContextSchema, assignTensionLeadSchema,
                                                        reassignTensionSchema, tensionHistoryEntrySchema;
                                                        add `version` to tensionResponseSchema;
                                                        REMOVE transitionTensionSchema
packages/shared/src/enums/tension-transition-action.enum.ts   DELETE
packages/shared/src/machines/tension.machine.ts               DELETE
packages/shared/src/index.ts                     EDIT — export the new schemas, drop the deleted ones
```

`updateTensionSchema` is **kept** — no endpoint uses it, but it remains the input contract for the
MCP `update_tension` tool (Q14).

Unit tests (`*.spec.ts`, `pnpm test:unit`, per AGENTS.md): `tension.reducer.spec.ts` covering
reconstitution from every event type, no-op detection, and transition guards.

## 7. Backend module layout

```
packages/core/src/events/store/                     NEW
  domain-event.entity.ts
  event-store.service.ts
  event-store.module.ts
  README.md                                         # causationId limitation, schema evolution policy

packages/core/src/tensions/
  tensions.module.ts               EDIT  # + CqrsModule, EventStoreModule, 11 handlers
  tensions.controller.ts           EDIT  # 11 command endpoints + history; PATCH/transitions removed
  tensions.service.ts              EDIT  # reads only: findOne, search, history
  tension.dto.ts                   EDIT  # Swagger DTOs per command
  tension.reducer.ts               NEW   # applyTensionEvent + reconstitute (pure)
  tension.aggregate.ts             NEW   # guards: transition legality, no-op detection
  tension.projector.ts             NEW   # writes the projection row from events
  tension-history.service.ts       NEW   # timeline rendering (summary/summaryKey/summaryParams)
  actor-deletion.handler.ts        NEW   # @OnEvent('marketlum.actor.deleted') → DiscardTension
  commands/                        NEW   # 11 command classes + 11 handlers
    sense-tension.command.ts / .handler.ts
    rename-tension.command.ts / .handler.ts
    … (rescore, revise-context, assign-lead, reassign, resolve, drop, reopen, revive, discard)

packages/core/src/commands/tension-rebuild.command.ts   NEW
packages/core/src/entities.ts                           EDIT  # + DomainEvent
packages/core/src/events/primary-entities.ts            EDIT  # REMOVE Tension (Q13)
packages/core/src/audit/audit-trail.handler.ts          EDIT  # widen VERBS (Q13)
```

### 7.1 Actor deletion (Q7)

`tensions.actorId` becomes `RESTRICT`, so the database can no longer silently delete tensions. An
`@OnEvent('marketlum.actor.deleted')` handler dispatches `DiscardTension` for every tension belonging
to that actor, ahead of the actor row being removed.

> **Implementation note.** `marketlum.actor.deleted` fires *post-commit*, by which time a `RESTRICT`
> FK would already have rejected the actor delete. The discard must therefore happen **before** the
> actor row is removed. Implement it in `ActorsService.remove()`: dispatch `DiscardTension` for each
> of the actor's tensions inside the same transaction as the actor delete, sharing one
> `correlationId`. The `@OnEvent` handler is not viable here — this is the one place the spec
> deviates from "listen on the bus", and the reason is ordering, not preference.

## 8. Bus and audit rewiring (Q13)

- `Tension` is removed from `primaryEntityDescriptors` in `events/primary-entities.ts`, so
  `DomainEventSubscriber` stops deriving `marketlum.tension.{created,updated,deleted}` from TypeORM
  hooks.
- The event store emits `marketlum.tension.<verb>` post-commit, where `<verb>` is the snake-cased
  event suffix: `sensed`, `renamed`, `rescored`, `context_revised`, `lead_assigned`,
  `lead_unassigned`, `reassigned`, `resolved`, `dropped`, `reopened`, `revived`, `discarded`.
  Envelope shape is unchanged (`{ name, id, code?, entity }`), so existing subscribers keep working.
- `AuditTrailHandler.VERBS` widens to include the twelve tension verbs. `entityType` extraction
  (`segments.slice(1, -1).join('.')`) already yields `tension` and needs no change.

**Known redundancy (accepted).** `audit_logs` and `domain_events` will both record every tension
mutation. Acceptable for one aggregate — audit is cross-cutting and also covers auth and MCP calls —
but revisit once several aggregates are event-sourced. Recorded here so it is not rediscovered as a
bug.

## 9. MCP (Q14)

The roster stays at **31 tools**. `update_tension` keeps its current input shape
(`updateTensionSchema`) and its handler fans out to `RenameTension` / `RescoreTension` /
`ReviseTensionContext` / `AssignTensionLead` / `ReassignTension` as needed, dispatching only the
commands whose fields actually changed. `create_tension`, `get_tension` and `search_tensions` are
unaffected apart from `version` appearing in responses.

## 10. Database migration

`packages/core/src/migrations/1700000000066-AddEventSourcedTensions.ts` (registered in
`migrations/index.ts`).

**Up:**
1. `CREATE TABLE "domain_events"` + three indexes + the unique constraint (§3.1).
2. `ALTER TABLE "tensions" ADD COLUMN "version" integer NOT NULL DEFAULT 0`.
3. Backfill (Q23) — for each existing row, insert a `TensionSensed` at version 1 carrying the row's
   current field values, `occurredAt = "createdAt"`, `actorKind = 'system'`; then where `state <> 'alive'`,
   insert `TensionResolved` or `TensionDropped` at version 2 with `occurredAt = "updatedAt"`.
   Set `tensions.version` to the resulting stream head (1 or 2).
4. Drop and recreate the `tensions.actorId` FK with `ON DELETE RESTRICT`.

**Down:** restore the `CASCADE` FK, drop `tensions.version`, drop `domain_events`. The synthetic
events are lost on revert, which is correct — they did not exist before.

Written by hand, not via `migration:generate` (per the project's drift-artifact gotcha).

## 11. Permissions (Q24)

No catalog change — `'tensions'` is already in `PERMISSION_RESOURCES`. `AdminGuard` stays at the
controller level exactly as today.

| Endpoints | Permission |
|---|---|
| the eleven command endpoints | `tensions:write` |
| `GET /tensions/:id`, `/search`, `/:id/history` | `tensions:read` |

The rebuild CLI runs outside HTTP and is not permission-gated; it is protected by requiring shell
access and `--execute`.

## 12. UI

### 12.1 Components

| File | Change |
|---|---|
| `components/tensions/tension-form-dialog.tsx` | **create-only** — edit mode removed |
| `components/tensions/tension-inline-field.tsx` | **NEW** — inline editor (label, value, editor type, `onSave`), used per field |
| `components/tensions/tension-history.tsx` | **NEW** — paginated timeline, localises via `summaryKey`/`summaryParams` |
| `components/tensions/tensions-data-table.tsx` | remove the row-level edit dialog (line ~417); keep create (~407) and delete; the row edit action navigates to the detail page (Q27) |
| `pages/admin/tension-detail-page.tsx` | replace `handleEdit`/`api.patch` with per-field inline editors (Q20); the four transition buttons call `/resolve`, `/drop`, `/reopen`, `/revive`; add the history section (Q21) |
| `hooks/use-tensions.ts` | unchanged (read-only) |
| `i18n/` | new keys: inline-editor labels, the twelve `history.*` summary strings, per locale incl. Polish |

Detail page layout:

```
┌────────────────────────────────────────────────────────┐
│  Tension name                    [Resolve] [Drop]      │  ← inline-editable title
│  alive · score 8 · Acme Corp · lead: P. Jędrzejewski   │  ← each segment inline-editable
├────────────────────────────────────────────────────────┤
│  Current context            [edit]                     │
│  Potential future           [edit]                     │
├────────────────────────────────────────────────────────┤
│  History                                               │
│   v3  14 Aug 09:12  PJ   Score raised from 5 to 8      │
│   v2  12 Aug 16:40  PJ   Renamed to "Battery supply…"  │
│   v1  02 Aug 11:03  PJ   Tension sensed                │
│                                        [ load more ]   │
└────────────────────────────────────────────────────────┘
```

A `409` from any inline save shows a toast ("changed elsewhere — reloading") and refetches.

### 12.2 Web app wiring and template sync

`apps/web/src/app/admin/tensions/{page.tsx,[id]/page.tsx}` are thin re-exports and need no change.

Per `CLAUDE.md`, both must be mirrored into
`packages/create-marketlum-app/template/web/src/app/admin/tensions/` — they are **currently missing**
(Q28), so this PR adds them. `@nestjs/cqrs` must also be added to the template's API `package.json`
alongside `packages/core` and `apps/api`.

## 13. Seed data (Q26)

`packages/core/src/commands/seeders/tension.seeder.ts` switches from `TensionsService.create()` to
`commandBus.execute(new SenseTension(...))`, so seeded tensions carry genuine streams from version 1
and survive a rebuild. `exchange.seeder.ts` consumes the returned ids exactly as it does today and
needs no change.

## 14. Breaking changes (UPGRADE.md)

Marketlum is a published framework; this spec breaks the public surface. `UPGRADE.md` gains a section
covering:

1. `PATCH /tensions/:id` removed → eleven command endpoints (§5).
2. `POST /tensions/:id/transitions` removed → `/resolve`, `/drop`, `/reopen`, `/revive`.
3. `marketlum.tension.{created,updated,deleted}` replaced by twelve intent-carrying verbs (§8) —
   plugins subscribing to the old names must be updated.
4. `tensionMachine`, `TensionTransitionAction`, `transitionTensionSchema` removed from
   `@marketlum/shared`.
5. `tensions.actorId` is now `ON DELETE RESTRICT`; deleting an actor discards its tensions through
   the command path instead of a silent database cascade.
6. New dependency `@nestjs/cqrs` (v10 line, matching NestJS 10.4.22) in `@marketlum/core`.

Documentation site (`apps/docs/`): update the Tensions concept page with the event vocabulary and
history feature, and add an "Event sourcing" page describing the `domain_events` store, the rebuild
CLI and the schema-evolution policy. `packages/core/README.md` gains the rebuild command.

## 15. BDD coverage (Q25)

Feature files in `packages/bdd/features/tensions/`, step definitions in `apps/api/test/tensions/`.

| File | Status | ~Scenarios |
|---|---|---|
| `sense-tension.feature` | replaces `create-tension.feature` | 6 |
| `amend-tension.feature` | **new** — rename / rescore / revise / lead / reassign, incl. no-op cases | 14 |
| `transition-tension.feature` | rewritten for four endpoints | 9 |
| `discard-tension.feature` | replaces `delete-tension.feature` | 4 |
| `get-tension.feature` | unchanged (+ `version` assertion) | 3 |
| `list-tensions.feature` | unchanged | 4 |
| `search-tensions.feature` | unchanged | 4 |
| `tension-history.feature` | **new** — ordering, pagination, attribution, summary text per event type | 7 |
| `tension-concurrency.feature` | **new** — concurrent append → 409, client retry succeeds | 3 |
| `tension-rebuild.feature` | **new** — projection matches after replay; discarded rows stay deleted; exchange links survive | 4 |
| `tension-actor-deletion.feature` | **new** — deleting an actor discards its tensions and writes events | 3 |
| | **total** | **~61** |

Each `.feature` file is written **before** its implementation slice, per the BDD rule in `AGENTS.md`.
`tension-rebuild.feature` drives the CLI through the same Nest application context the other suites
use, not a shell-out.

## 16. Out of scope

| Excluded | Reference |
|---|---|
| `tension_state_periods` analytics projection | Q19 — deferred; a second projector over the same stream, cheap to add later |
| Converting Exchanges, Orders, Invoices, Ledger | this spec is the pilot; the store schema is designed for them |
| Asynchronous / lagging projections | Q16 — synchronous by choice |
| Event upcasters | Q22 — `schemaVersion` recorded, additive-only rule, machinery deferred |
| Aggregate snapshots | unnecessary at tension stream lengths |
| Atomic batch command endpoint | Q20 — rejected as PATCH by another name |
| Resolving the `audit_logs` / `domain_events` overlap | §8 — accepted for one aggregate |
| A generic `EventStore` abstraction with aggregate base classes | Q2 — generic *schema*, Tension-specific *code* |

## 17. Delivery plan (Q29)

One PR, six phased commits, `.feature` files landing with or before their slice.

1. **Shared** — event types and payload schemas, command input schemas, `version` on the response
   schema, delete the machine/action enum, `@nestjs/cqrs` in `core` + `api` + template.
   `tension.reducer.spec.ts`.
2. **Migration** — `domain_events`, `tensions.version`, the genesis backfill, `actorId` → `RESTRICT`.
3. **Event store + projector + rebuild CLI** — `events/store/`, `tension.reducer.ts`,
   `tension.projector.ts`, `tension-rebuild.command.ts`, package scripts.
   Feature: `tension-rebuild.feature`.
4. **Commands + controller** — eleven command/handler pairs, `tension.aggregate.ts` guards, rewritten
   controller, `tension-history.service.ts`.
   Features: `sense-`, `amend-`, `transition-`, `discard-`, `tension-history`, `tension-concurrency`.
5. **Rewiring** — remove `Tension` from `primary-entities.ts`, widen the audit verb filter, actor
   deletion in `ActorsService.remove()`, MCP `update_tension` fan-out, seeder via `SenseTension`.
   Feature: `tension-actor-deletion.feature`.
6. **UI + docs** — inline field editors, history section, data-table edit action, i18n keys, template
   route mirrors, `UPGRADE.md`, `apps/docs/`.

Verification per AGENTS.md and the session's standing preference: `pnpm test:unit`, `pnpm test:e2e`,
`tsc`, and `next build` — no full end-to-end browser run required in-conversation.
