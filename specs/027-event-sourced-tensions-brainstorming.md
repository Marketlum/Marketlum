# Spec 027 — Event-Sourced Tensions — Brainstorming

> **Goal:** Convert the Tension aggregate from CRUD to event sourcing, with a domain event
> vocabulary (`TensionSensed`, `TensionResolved`, `TensionRescored`, `TensionDropped`, …) as the
> record of truth, and establish the event-sourcing machinery that Exchanges, Orders, Invoices and
> the Ledger can adopt later.

> **Process:** Append-only. Each round is appended below; existing questions and answers are never
> edited or removed. Move `[x]` to change a choice, and/or write free-form text after `**Answer:**`.
> Silence on a question means the preselected recommendation is accepted.

---

## Context

Tensions is the smallest well-formed aggregate in the codebase and the natural pilot for event
sourcing. What exists today:

**Domain**
- `Tension` entity (`packages/core/src/tensions/entities/tension.entity.ts`) — `name`,
  `currentContext`, `potentialFuture`, `score` (int, default 5), `state`, `actorId` (FK,
  `ON DELETE CASCADE`), `leadUserId` (FK, `SET NULL`), timestamps, plus a DB-trigger-maintained
  `search_vector` (not mapped in the entity).
- `tensionMachine` (`packages/shared/src/machines/tension.machine.ts`) — xstate:
  `alive → resolved` (`resolve`), `alive → stale` (`drop`), `resolved → alive` (`reopen`),
  `stale → alive` (`revive`). `TensionTransitionAction` already names all four.
- `TensionsService` (229 lines) — `create`, `findOne`, `search`, `update`, `transition`, `remove`.
  `update()` and `transition()` both do the `delete (tension as any).actor` dance to dodge
  TypeORM cascade inserts.

**Surface area — deliberately small**
- One incoming FK in the entire codebase: `Exchange.tensionId` (nullable, `ON DELETE SET NULL`).
- 7 BDD feature files (`packages/bdd/features/tensions/`), 4 MCP tools (`create_tension`,
  `get_tension`, `search_tensions`, `update_tension`).
- `SearchService` reads `tensions` with raw SQL against `search_vector`.
- UI: `packages/ui/src/components/tensions/` (columns, form dialog, data table) and web routes
  `apps/web/src/app/admin/tensions/{page.tsx,[id]/page.tsx}`.
- `AdminGuard` at the controller level; permission resource `'tensions'` already in
  `packages/shared/src/permissions.ts`.

**Existing infrastructure this spec can lean on**
- `DomainEventSubscriber` — TypeORM-hook-derived, post-commit, buffered per transaction. Emits
  `marketlum.tension.{created,updated,deleted}` with the whole entity. No intent, no diff.
- `AuditTrailHandler` + `audit_logs` — append-only, full entity snapshot in jsonb, attribution via
  `AuditContext` ALS. Explicitly best-effort: `AuditService.record` swallows failures.
- `AuditContext` (AsyncLocalStorage) — gives `userId`/`apiKeyId`/`ip`/`userAgent` per request, and
  is already the project's answer to "who did this".

**The target shape**

```
            ┌──────────────── writes ─────────────────┐
            │                                         │
  POST   /tensions              ┌──────────────┐      │
  PATCH  /tensions/:id     ──►  │   Command    │      │
  POST   /:id/transitions       │   handlers   │      │
  DELETE /tensions/:id          └──────┬───────┘      │
                                       │ append       │
                              ┌────────▼────────┐     │
                              │ tension_events  │  ◄── record of truth
                              │  (append-only)  │     │
                              └────────┬────────┘     │
                                       │ project      │
                              ┌────────▼────────┐     │
                              │ tensions table  │  ◄── read model
                              │  + search_vector│     │
                              └────────┬────────┘     │
                                       │              │
        GET /tensions/search ◄─────────┤              │
        GET /tensions/:id    ◄─────────┤              │
        exchanges.tensionId  ◄─────────┴──────────────┘
        SearchService, MCP tools, UI
```

**Known trap, called out up front:** `Tension.actorId` is `ON DELETE CASCADE`. Deleting an actor
removes tension rows *at the database level*, invisibly to any event store — no event is written,
and a rebuild would resurrect them. Q7 settles this.

---

## Round 1 — Foundations

This round fixes the architecture: how literally "event-sourced" we go, where events live, how
commands are handled, and what happens to the existing HTTP surface.

### Q1. How far do we take event sourcing?

- [x] **Full event sourcing** — `tension_events` is the record of truth; the `tensions` table becomes a projection rebuilt from the stream. This is what "event-sourced instead of CRUD" actually means, and Tensions is the safest place in the codebase to do it (one nullable incoming FK, low volume, real state machine).
- [ ] **Event-first CRUD** — events are appended in the same transaction as the row write, but the `tensions` table stays authoritative and is never rebuilt. Lower risk, keeps every read path trivially correct, but you never exercise the replay machinery — which is the main thing this pilot is meant to prove out.
- [ ] **Events as an enriched audit log** — keep CRUD writes, upgrade the existing audit trail to carry intent. Cheapest, but doesn't move the architecture.

**Answer:**

### Q2. What shape is the event store table?

Whatever we build here is the thing Exchanges and Orders inherit later, so the *schema* is worth
generalising even if the *code* stays Tension-specific.

- [x] **Generic schema, Tensions-only usage** — one `domain_events` table keyed by `(aggregateType, aggregateId, version)`, but this spec only ever writes `aggregateType='tension'`. No premature abstraction in code, no migration needed when Exchanges follow.
- [ ] **Dedicated `tension_events` table** — narrowest possible, typed columns per aggregate. Cleanest for one aggregate; means a new table (and new plumbing) per aggregate later.
- [ ] **Full generic event-store module** — abstract `EventStore` service, aggregate base class, repository generics, all built now. Maximal reuse, but designs the abstraction against a sample size of one.

**Answer:**

### Q3. How are commands handled?

- [ ] **Command methods on `TensionsService`, events built inline** — keep the service as the entry point; each public method decides which events to append, then delegates to an `EventStore` + projector. Smallest diff, keeps the module shape the project already uses everywhere else.
- [ ] **Explicit aggregate class** — a `TensionAggregate` with `raise()`/`rescore()`/`resolve()` methods, `apply(event)` reducers and reconstitution from the stream. The textbook shape and the most faithful to ES, but introduces a pattern that exists nowhere else in the codebase.
- [x] **Command bus + handlers** (`@nestjs/cqrs`) — full CQRS wiring. Most machinery, and a new dependency for one aggregate.

**Answer:**

### Q4. What happens to the existing HTTP surface?

- [ ] **Unchanged, plus a history endpoint** — `POST /tensions`, `PATCH /tensions/:id`, `POST /tensions/:id/transitions`, `DELETE /tensions/:id`, `GET` reads all keep their exact contracts; add `GET /tensions/:id/history`. All 7 existing feature files, the 4 MCP tools and the UI keep working untouched — the conversion stays invisible from outside.
- [ ] **Add explicit command endpoints** — `POST /tensions/:id/rescore`, `/rename`, `/reassign` alongside the existing PATCH. More honest about intent at the API layer, but forks the surface and forces UI + MCP changes in the same PR.
- [x] **Replace PATCH with command endpoints** — fully command-oriented REST. Cleanest conceptually, breaks the UI, the MCP `update_tension` tool and several BDD scenarios.

**Answer:**

### Q5. Concurrency control on the stream

- [x] **Optimistic, `UNIQUE (aggregateId, version)`** — each append computes `version = last + 1`; a concurrent writer hits the unique violation and the request returns `409 Conflict`. Standard, cheap, and it makes lost updates structurally impossible (today two concurrent PATCHes silently last-write-wins).
- [ ] **Row-level lock on the projection** — `SELECT … FOR UPDATE` on the `tensions` row before appending. Simpler mental model, serialises writers, no 409s for the client to handle.
- [ ] **No concurrency control** — append with a monotonic sequence, accept interleaving. Least work; gives up one of the main correctness wins of the conversion.

**Answer:**

### Q6. What does deleting a tension mean?

- [x] **`TensionDiscarded` event, projection row removed** — the stream is retained forever, the read-model row disappears, `exchanges.tensionId` nulls out exactly as it does today. `DELETE /tensions/:id` keeps returning 204, and a rebuild correctly reproduces "deleted" rather than resurrecting the row.
- [ ] **Soft delete only** — a `discardedAt` on the projection, row stays, reads filter it out. More ES-idiomatic (nothing ever really disappears), but changes list/search semantics and the Exchange FK behaviour.
- [ ] **Delete the stream too** — hard-remove events on discard. Simple and privacy-friendly; throws away the history the whole exercise is meant to preserve.

**Answer:**

### Q7. The `ON DELETE CASCADE` integrity hole

Today, deleting an Actor silently deletes its tensions in the database — no service call, no event.
Under event sourcing that means a rebuild resurrects tensions that a user deleted.

- [x] **Drop the cascade to `RESTRICT`, delete tensions explicitly** — an `ActorDeleted` handler (the existing `marketlum.actor.deleted` bus event) issues real discard commands first, so every deletion goes through the event store. Correct, and it makes actor deletion's blast radius visible instead of implicit. Costs one behavioural change: deleting an actor with tensions now needs them discarded first, or the handler does it in the same flow.
- [ ] **Keep the cascade, reconcile on rebuild** — leave the FK alone and have the projector skip tensions whose actor no longer exists. No behaviour change; leaves the event store lying about what happened.
- [ ] **Keep the cascade, accept the drift** — document it as a known limitation of the pilot. Cheapest; undermines the "events are the record of truth" claim on day one.

**Answer:**

---

## Round 2 — Event vocabulary and command surface

Round 1 settled that events are the record of truth (Q1), that commands run through a
`@nestjs/cqrs` bus (Q3), and that PATCH is replaced by command endpoints (Q4). This round names
every event and command, fixes the payload and envelope shape, and decides what happens to the
existing `marketlum.tension.*` bus events and the MCP `update_tension` tool.

Starting vocabulary, using the names from the request:

| Command | Event | Trigger |
|---|---|---|
| `SenseTension` | `TensionSensed` | creation |
| `RenameTension` | `TensionRenamed` | `name` |
| `RescoreTension` | `TensionRescored` | `score` |
| `ReviseTensionContext` | `TensionContextRevised` | `currentContext` / `potentialFuture` |
| `AssignTensionLead` | `TensionLeadAssigned` / `TensionLeadUnassigned` | `leadUserId` |
| `ReassignTension` | `TensionReassigned` | `actorId` |
| `ResolveTension` | `TensionResolved` | `alive → resolved` |
| `DropTension` | `TensionDropped` | `alive → stale` |
| `ReopenTension` | `TensionReopened` | `resolved → alive` |
| `ReviveTension` | `TensionRevived` | `stale → alive` |
| `DiscardTension` | `TensionDiscarded` | deletion |

### Q8. Granularity of the field-change events

- [x] **Fine-grained, as tabled above** — one event per meaningful change, `TensionContextRevised` covering the two prose fields together (they are almost always edited as a pair). Eleven event types total. This is the point of the exercise: the stream reads as a narrative rather than a diff log.
- [ ] **Split context into two** — `TensionCurrentContextRevised` + `TensionPotentialFutureRevised`. Maximum fidelity; twelve types, and the two fire together nearly every time.
- [ ] **Coarser** — collapse rename/rescore/revise into a single `TensionAmended` carrying changed fields. Fewer types to maintain; loses exactly the intent the conversion is meant to capture.

**Answer:**

### Q9. Event payload shape

- [x] **Changed values only** — each event carries just the fields it changes (`TensionRescored: { score: 8 }`), plus the previous value where it aids reading (`{ score: 8, previousScore: 5 }`). Compact, unambiguous to project, and the previous value makes the history endpoint renderable without replaying.
- [ ] **Changed values, no previous** — strictly minimal facts. Purest, but the history UI then has to replay the stream to show "5 → 8".
- [ ] **Full snapshot per event** — every event carries the complete post-state. Trivially projectable and rebuild-proof, but the stream stops being a record of *what changed* and storage grows with every keystroke.

**Answer:**

### Q10. Event envelope / metadata

Beyond `aggregateType`, `aggregateId`, `version`, `type`, `payload`:

- [ ] **Attribution + timing + correlation** — `occurredAt`, and from the existing `AuditContext` ALS: `userId`, `userEmail`, `apiKeyId`, `ip`, `userAgent`; plus a `correlationId` per request so the cascade in Q7 (one actor deletion → many `TensionDiscarded`) is traceable as one unit of work. Reuses infrastructure spec 026 already built.
- [ ] **Attribution + timing only** — drop `correlationId`. Simpler; the Q7 cascade becomes N unrelated events with no way to group them.
- [x] **Add `causationId` too** — full correlation/causation chain, each event pointing at the event or command that caused it. Textbook-complete, and unused by anything we're building now.

**Answer:**

### Q11. The command endpoint surface

Q4 replaces `PATCH /tensions/:id`. But `POST /tensions/:id/transitions { action }` is *already*
command-shaped, already has a passing feature file, and is already what the UI and MCP call.

**Option A — split everything**
```
POST   /tensions                  SenseTension
POST   /tensions/:id/rename       RenameTension
POST   /tensions/:id/rescore      RescoreTension
POST   /tensions/:id/revise       ReviseTensionContext
POST   /tensions/:id/lead         AssignTensionLead
POST   /tensions/:id/reassign     ReassignTension
POST   /tensions/:id/resolve      ResolveTension
POST   /tensions/:id/drop         DropTension
POST   /tensions/:id/reopen       ReopenTension
POST   /tensions/:id/revive       ReviveTension
DELETE /tensions/:id              DiscardTension
GET    /tensions/:id/history
```

**Option B — split PATCH, keep `/transitions`**: the six mutation endpoints above, plus the
existing `POST /tensions/:id/transitions { action }` untouched for the four lifecycle moves.

- [ ] **Option B — split PATCH only** — Q4 was about replacing PATCH, and `/transitions` is not PATCH. It already dispatches a named action through the state machine, so it *is* a command endpoint with a different spelling. Keeping it preserves `transition-tension.feature` and the UI/MCP transition paths, and the diff stays focused on what was actually wrong.
- [x] **Option A — split everything** — one endpoint per command, no exceptions. Maximally consistent and the most honest reading of "fully command-oriented REST"; costs a rewrite of `transition-tension.feature` and every transition call site for no behavioural gain.
- [ ] **Option A, with `/transitions` kept as a deprecated alias** — both surfaces during a transition period. Nothing breaks; carries two ways to do one thing in a codebase with one user.

**Answer:**

### Q12. Where does transition legality live?

- [ ] **Keep `tensionMachine` as the authority** — the command handler reconstitutes state from the stream, asks xstate whether the action is legal, and appends the event only if it is. The machine stays the single declarative source of the lifecycle, shared with the frontend, exactly as today.
- [x] **Move legality into the aggregate** — hand-written guards in the command handlers, xstate retired for Tensions. Fewer moving parts; loses the declarative machine the UI also reads, and diverges from Exchanges/Orders which keep theirs.
- [ ] **Both** — machine for the UI, duplicated guards on the server. Defence in depth, two places to change a rule.

**Answer:**

### Q13. What happens to the `marketlum.tension.*` bus events?

Today `DomainEventSubscriber` derives `marketlum.tension.{created,updated,deleted}` from TypeORM
hooks, and `AuditTrailHandler` persists each one (its `VERBS` set accepts only those three).

- [x] **Replace — emit intent-carrying names from the event store** — remove `Tension` from `primary-entities.ts` so the TypeORM subscriber stops firing, and emit `marketlum.tension.{sensed,renamed,rescored,resolved,dropped,reopened,revived,discarded,…}` from the store instead. `AuditTrailHandler`'s verb filter widens to accept them. The bus finally carries intent, which is half the value of the conversion.
- [ ] **Map to the existing three verbs** — emit `created`/`updated`/`deleted` as today, with the domain event name inside the payload. Every existing consumer keeps working unchanged; the bus stays as uninformative as it is now.
- [ ] **Emit both** — legacy verbs plus new names. Nothing breaks, every tension mutation produces two bus events and two audit rows.

*Note:* under the recommended option, `audit_logs` and `domain_events` both record every tension
mutation. That redundancy is acceptable for one aggregate (audit is cross-cutting and covers auth
and MCP calls too), but it is worth revisiting once several aggregates are event-sourced.

**Answer:**

### Q14. The MCP `update_tension` tool

Replacing PATCH breaks it — it currently maps 1:1 onto the update endpoint.

- [x] **Keep one `update_tension` tool, fan out to commands** — the tool keeps its current input shape and the handler issues `RenameTension` / `RescoreTension` / `ReviseTensionContext` / … as needed. MCP tools are an LLM-ergonomics surface, and one coherent tool beats six micro-tools an agent has to sequence correctly. Keeps the roster at 31.
- [ ] **Split into per-command tools** — `rename_tension`, `rescore_tension`, `revise_tension`, … Mirrors the API exactly; inflates the roster and makes multi-field edits a multi-call dance.
- [ ] **Drop `update_tension`, add `sense_tension` + `transition_tension` only** — smallest MCP surface. Loses the ability for an agent to correct a tension's wording or score.

**Answer:**

### Q15. Does the history endpoint expose raw events or a rendered timeline?

- [x] **Rendered timeline, paginated** — `GET /tensions/:id/history` returns `{ version, type, occurredAt, actor: { id, name }, summary, payload }` where `summary` is a human-readable line built server-side ("Score raised from 5 to 8"). The UI stays dumb, and the shape survives event-schema changes.
- [ ] **Raw events** — return stored rows verbatim and let the UI interpret them. Simplest server side; every new event type needs a matching UI change, and the wire format becomes the storage format.
- [ ] **Both, via a query flag** — `?format=raw|timeline`. Flexible; two contracts to test and document.

**Answer:**

---

## Round 3 — Projection, rebuild, and UI

With events as the record of truth (Q1) and the `tensions` table demoted to a projection, this
round settles how that projection is maintained and rebuilt, and what the admin UI looks like now
that editing is eleven commands rather than one PATCH.

Two facts established while investigating, which constrain the answers below:

- `tensionMachine` is referenced **only** in `tensions.service.ts`. The UI decides which transition
  buttons to render with hardcoded state comparisons in `tension-detail-page.tsx`, not from the
  machine. Retiring it (Q12) touches the server only.
- The UI's write paths are `api.post('/tensions/:id/transitions')` from four buttons and
  `api.patch('/tensions/:id')` from the edit dialog — both rewritten under Q11 Option A.

### Q16. When does the projection get updated?

- [x] **Synchronously, in the same transaction as the append** — the command handler appends events and updates the `tensions` row atomically. Read-your-writes holds, every command endpoint can return the projected entity, and all existing BDD scenarios keep passing unchanged. Gives up the "projections may lag" property of distributed ES, which is worth nothing in a single-process Nest app.
- [ ] **Asynchronously, post-commit via the event bus** — the projector listens on `marketlum.tension.*` and updates the row after the fact. The textbook shape, genuinely eventually-consistent; breaks read-your-writes, so command responses can't return the entity and a large number of BDD scenarios need polling or rework.
- [ ] **Synchronous now, pluggable later** — projector interface written so it *could* run async, but wired synchronously. Keeps the door open; the abstraction is unused and untested until something opens it.

**Answer:**

### Q17. How does a rebuild work, given `exchanges.tensionId`?

A rebuild cannot truncate `tensions` — `exchanges.tensionId` references it, and the FK is
`ON DELETE SET NULL`, so a truncate would silently sever exchange↔tension links.

- [x] **Upsert-and-reconcile in place** — replay every stream, upsert each projected row, then delete rows whose stream ends in `TensionDiscarded` or which have no stream at all. The FK is never violated, exchange links survive, and the `search_vector` trigger fires naturally on each upsert. Slightly more projector logic than a truncate.
- [ ] **Drop FK → truncate → replay → recreate FK** — simplest projector code. Leaves a window where `exchanges.tensionId` points at nothing, and any failure mid-rebuild loses the exchange links permanently.
- [ ] **Rebuild into a shadow table, then swap** — zero-downtime and verifiable before cutover. The FK must be dropped and recreated around the swap anyway, so it inherits the previous option's risk with more machinery.

**Answer:**

### Q18. How is a rebuild triggered?

- [x] **A CLI command** — `pnpm tension:rebuild`, following the `audit-prune.command.ts` precedent (`packages/core/src/commands/`). Deliberate, operator-invoked, no HTTP surface to secure or accidentally hit. Add `--dry-run` to report the diff without writing.
- [ ] **An admin endpoint** — `POST /tensions/rebuild` behind `AdminGuard`. Convenient from the UI; a destructive full-table operation reachable over HTTP.
- [ ] **Automatic on boot** — a projection-version marker; mismatch triggers a rebuild at startup. Self-healing; turns every deploy into a potential full replay and makes boot time a function of event volume.

**Answer:**

### Q19. A second projection for time-in-state analytics?

`tension_state_periods` (`tensionId`, `state`, `enteredAt`, `exitedAt`) would make "average time to
resolve" and "how often do tensions get reopened" cheap SQL instead of a stream scan.

- [x] **Defer it** — the questions it answers are speculative, and at current volumes the stream can answer them on demand. It is a second projector over the same events, so adding it later costs nothing that building it now saves. Note it in the spec as the obvious next read model.
- [ ] **Build it now** — ship the analytics read model alongside the primary projection. Demonstrates that multiple projections over one stream work, which is a real part of the pattern this pilot is meant to prove.
- [ ] **Skip permanently** — derive on demand, never materialise.

**Answer:**

### Q20. What does the edit dialog do now that there is no PATCH?

The dialog currently collects all fields and submits once. Under Option A there are six mutation
commands.

- [ ] **Client diffs, issues only the commands for changed fields** — the dialog compares against the loaded tension and fires the matching commands sequentially, stopping on the first error and refetching. UX is unchanged, the API stays purely command-oriented. Trade-off: a mid-sequence failure leaves a partially-applied edit, which the refetch surfaces but does not undo.
- [ ] **Add an atomic batch endpoint** — `POST /tensions/:id/commands` taking an ordered list, applied in one transaction. Restores all-or-nothing editing; reintroduces a coarse endpoint that is arguably PATCH by another name.
- [x] **Split the UI into per-field inline editors** — each field saves itself through its own command, no dialog. Most faithful to the command model and no partial-edit problem; a substantial rewrite of the tension UI.

**Answer:**

### Q21. Where does the history timeline live?

- [x] **A section on the tension detail page** — below the existing content, paginated, showing actor, timestamp and the server-rendered summary. One page to look at, matches how the rest of the admin presents related data.
- [ ] **A dedicated route** — `/admin/tensions/:id/history`. More room for a long stream; an extra navigation step for the common case.
- [ ] **A drawer or dialog** — opened from a "History" button. Keeps the detail page uncluttered; hides the feature.

**Answer:**

### Q22. Event schema evolution policy

- [x] **`schemaVersion` column, additive-only changes, no upcasters yet** — every event row carries an int version; the rule is that payloads may gain optional fields but never rename or remove. Upcasting machinery is added the first time that rule genuinely needs breaking, not before.
- [ ] **No versioning** — with one developer and a resettable database, rewrite historical events in a migration if a shape ever changes. Cheapest, and honest about the current situation; the habit does not survive the first real deployment.
- [ ] **Full upcaster pipeline now** — registered per-type upcasters run on read. Complete and future-proof; substantial machinery serving zero current schema versions.

**Answer:**

---

## Round 4 — Data migration, permissions, tests and delivery

Final round. Everything structural is settled; this fixes how existing rows become streams, how the
new endpoints are gated, what the BDD suite looks like afterwards, and the order of work.

For the record, the dependency this introduces: `@nestjs/cqrs` (v10 line, matching NestJS 10.4.22)
added to both `packages/core/package.json` and `apps/api/package.json`, and mirrored into
`packages/create-marketlum-app/template/`.

Current UI touch points confirmed: `TensionFormDialog` is used three times — create and row-level
edit in `tensions-data-table.tsx` (lines 407, 417) and edit on `tension-detail-page.tsx` (line 309).
`tension.seeder.ts` creates its rows through `TensionsService.create()`.

### Q23. What happens to tension rows that already exist?

- [x] **Backfill a synthetic genesis stream per row** — the migration writes a `TensionSensed` at version 1 carrying the row's current field values, plus a state-establishing event (`TensionResolved` / `TensionDropped`) where the row is not `alive`. Attribution is `actorKind=system`, `occurredAt = createdAt`. Every row ends up with a valid, replayable stream and the sample data survives. The history for pre-existing tensions is honestly thin, which is unavoidable.
- [ ] **Reset — truncate and re-seed through commands** — cleanest possible starting state, every stream genuine from event one. Discards any hand-created tensions in the dev database and severs `exchanges.tensionId` links that the seeder then recreates differently.
- [ ] **No backfill — tolerate stream-less rows** — the projector treats rows without a stream as legacy and leaves them alone. Cheapest migration; breaks the "events are the record of truth" invariant on day one and makes rebuild results depend on row age.

**Answer:**

### Q24. Permissions on the new surface

- [x] **Reuse the existing resource** — all ten command endpoints require `tensions:write`, `GET /tensions/:id/history` requires `tensions:read`, all behind `AdminGuard` exactly as the controller is today. No catalog change, so no drift-guard test churn (spec 020).
- [ ] **A dedicated `tensions:history` permission** — history readable independently of the entity. Finer-grained; adds a resource to the catalog and a row to every role that should see it.
- [ ] **History under the `audit` resource** — treat the stream as audit data, gated with the audit trail. Conceptually tidy; means someone who can read a tension cannot see its own history unless they also hold `audit`.

**Answer:**

### Q25. How does the BDD suite get restructured?

Today: `create`, `delete`, `get`, `list`, `search`, `transition`, `update` (7 files). `update-tension.feature`
and `transition-tension.feature` both describe endpoints that no longer exist.

- [x] **Group by concern — 7 files kept or replaced, 4 added** — `sense-tension.feature` (was create), `amend-tension.feature` (rename/rescore/revise/lead/reassign in one file), `transition-tension.feature` (rewritten for the four lifecycle endpoints), `discard-tension.feature`, plus unchanged `get`/`list`/`search`. New: `tension-history.feature`, `tension-concurrency.feature` (409 on stale version), `tension-rebuild.feature` (projection matches after replay), `tension-actor-deletion.feature` (Q7 cascade). Estimated ~45–55 scenarios total, up from ~30.
- [ ] **One feature file per command** — eleven command files plus the read and infrastructure ones. Maximum traceability from spec to test; a lot of near-duplicate Gherkin.
- [ ] **Minimal — extend the existing files in place** — rewrite `update-tension.feature` to hit the new endpoints and add history scenarios to `get-tension.feature`. Smallest diff; the suite stops mirroring the domain vocabulary the spec just introduced.

**Answer:**

### Q26. How does the sample seeder create tensions?

- [x] **Dispatch `SenseTension` commands** — `tension.seeder.ts` goes through the command bus like any other caller, so seeded tensions have genuine streams from version 1. Slower than a bulk insert and entirely fast enough at seed volumes.
- [ ] **Write rows plus synthetic events directly** — bypass the bus for speed, mirroring the Q23 backfill shape. Faster; a second code path that can drift from the real one.
- [ ] **Write rows only** — leave the seeder as a plain insert. Simplest; produces sample data that violates the core invariant, and a rebuild would delete all of it.

**Answer:**

### Q27. The row-level edit action in the tensions table

Q20 replaced the edit dialog with per-field inline editors on the detail page.

- [x] **Remove the row-level edit dialog; the action navigates to the detail page** — one editing surface, no dialog that has to replicate six commands. The table keeps its create dialog (`SenseTension` genuinely needs all fields at once) and its delete action.
- [ ] **Keep a row-level dialog that fans out to commands** — quick edits stay quick. Reintroduces exactly the multi-command-from-one-form problem Q20 rejected, in a second place.
- [ ] **Inline editing in the table itself** — edit cells in place, each firing its command. Consistent with Q20 and the fastest for bulk work; the most UI work of the three.

**Answer:**

### Q28. The template-sync gap

`apps/web/src/app/admin/tensions/{page.tsx,[id]/page.tsx}` has **no** mirror under
`packages/create-marketlum-app/template/web/src/app/admin/` — unlike every other admin route. This
predates the spec.

- [x] **Fix it in this PR** — add the two thin re-export routes to the template, so a scaffolded app gets Tensions like everything else. Small, mechanical, and this PR is already touching the tension routes.
- [ ] **Leave it — separate fix** — keep the diff focused on event sourcing. The gap persists, and the next person to notice pays the context-rebuilding cost.

**Answer:**

### Q29. Delivery shape

- [x] **One PR, phased commits** — (1) shared: event/command types, Zod schemas, `@nestjs/cqrs`; (2) migration: `domain_events` table, backfill, `actorId` FK to `RESTRICT`; (3) event store + projector + rebuild CLI; (4) command handlers + controller; (5) bus/audit rewiring + MCP + seeder; (6) UI; with the `.feature` file for each slice written before its implementation per the project's BDD rule. Matches how `/mk-implement-spec` delivers, and the change is not independently shippable in halves.
- [ ] **Two PRs — backend, then UI + MCP** — smaller reviews. The first PR leaves `main` with a UI calling endpoints that no longer exist, so it is not independently mergeable without a compatibility shim.
- [ ] **Three PRs — infrastructure, then Tensions, then UI** — smallest units. The event-store infrastructure has no consumer on its own, so PR 1 would be untestable through the HTTP surface the project's BDD rule targets.

**Answer:**
