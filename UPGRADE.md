# Upgrade Notes

Breaking changes between Marketlum releases, newest first. Each section lists
what an existing scaffolded project must do after updating its `@marketlum/*`
dependencies.

## Unreleased — Tensions are event-sourced

Tensions moved from CRUD to event sourcing (spec 027). The `tensions` table is
now a projection of an append-only `domain_events` store. Six things change for
an existing project.

### 1. `PATCH /tensions/:id` is gone

Editing is now one endpoint per command, each appending a single event:

```
POST /tensions/:id/rename     { "name": "…" }
POST /tensions/:id/rescore    { "score": 8 }
POST /tensions/:id/revise     { "currentContext": "…", "potentialFuture": "…" }
POST /tensions/:id/lead       { "leadUserId": "…" | null }
POST /tensions/:id/reassign   { "actorId": "…" }
```

A command that changes nothing returns `200` and appends no event. Concurrent
writers now receive `409 Conflict` — reload and retry.

### 2. `POST /tensions/:id/transitions` is gone

Replace `{ "action": "resolve" }` with the dedicated endpoints:

```
POST /tensions/:id/resolve
POST /tensions/:id/drop
POST /tensions/:id/reopen
POST /tensions/:id/revive
```

### 3. Tension domain events carry intent

`marketlum.tension.created` / `.updated` / `.deleted` no longer fire. Twelve
intent-carrying verbs replace them:

```
marketlum.tension.sensed            marketlum.tension.resolved
marketlum.tension.renamed           marketlum.tension.dropped
marketlum.tension.rescored          marketlum.tension.reopened
marketlum.tension.context_revised   marketlum.tension.revived
marketlum.tension.lead_assigned     marketlum.tension.discarded
marketlum.tension.lead_unassigned
marketlum.tension.reassigned
```

Plugins subscribing to the old names must be updated.

### 4. Removed exports from `@marketlum/shared`

```ts
import { tensionMachine } from '@marketlum/shared';            // removed
import { TensionTransitionAction } from '@marketlum/shared';   // removed
import { transitionTensionSchema } from '@marketlum/shared';   // removed
```

Transition legality now lives in the aggregate guards on the server. The new
event vocabulary is exported as `TensionEventType`, `tensionEventSchema` and the
per-event payload schemas.

### 5. `tensions.actorId` is `ON DELETE RESTRICT`

Deleting an actor discards its tensions through the command path first, in the
same transaction, so every deletion is recorded. The previous database cascade
removed them silently, which a projection rebuild would have undone.

### 6. New dependency: `@nestjs/cqrs`

Add it to your API app alongside `@marketlum/core`:

```json
"@nestjs/cqrs": "^10.2.8"
```

Register `TensionRebuildCommand` in your `CliModule` providers to get
`pnpm tension:rebuild`, and add the script:

```json
"tension:rebuild": "ts-node src/cli.ts tension:rebuild"
```

Run `pnpm migration:run` to create `domain_events` and backfill a genesis stream
for existing tensions.

## v0.6.0 — Node 24 required

The framework now requires **Node.js >= 24** (`engines` in the root and
scaffolded `package.json`). Update your runtime before upgrading.

## v0.6.0 — ImageLibraryDialog exports consolidated in @marketlum/ui

The duplicated actor and archetype image-library dialogs were replaced by a
single shared component. The two old exports are gone:

```tsx
import { ActorImageLibraryDialog } from '@marketlum/ui';     // removed
import { ArchetypeImageLibraryDialog } from '@marketlum/ui'; // removed
```

Use the single export instead:

```tsx
import { ImageLibraryDialog } from '@marketlum/ui';
```

## v0.6.0 — ActorValuesTable removed from @marketlum/ui

The actor detail page's Values tab now renders the full `ValuesDataTable`
(search, filters, perspectives, export, and the Add value button) scoped via
its new optional `actorId` prop. The stripped-down `ActorValuesTable`
component is gone. If you imported it, replace:

```tsx
<ActorValuesTable actorId={actor.id} />
```

with:

```tsx
<ValuesDataTable actorId={actor.id} />
```

## Spec 024 — Agents renamed to Actors

The core `Agent` concept is now `Actor` across the whole stack. This is a
clean break: there are no compatibility aliases, redirects, or dual-emitted
events.

### 1. Run the database migrations

```bash
pnpm migration:run
```

`RenameAgentsToActors1700000000060` renames the `agents`, `agents_closure`,
and `agent_taxonomies` tables (plus the `agent_type_enum` type, every
agent-named column, index, constraint, and the search-vector trigger) and
rewrites stored `role_permissions` rows from `agents.*` to `actors.*` —
custom roles created through the admin UI keep working. If you use the rdhy
plugin, `RdhyAgentsToActors1700000000104` does the same for the plugin's
tables and `rdhy.agents.*` permission rows.

### 2. Update REST API calls

Every `/agents` route is now `/actors`:

| Before | After |
|---|---|
| `GET/POST /agents`, `/agents/:id` | `/actors`, `/actors/:id` |
| `GET /agents/:agentId/financials` | `GET /actors/:actorId/financials` |
| nested address routes under `/agents` | same shape under `/actors` |

Request/response field names follow suit (`agentId` → `actorId`,
`fromAgentId` → `fromActorId`, `toAgentId` → `toActorId`,
`onBehalfOfAgentId` → `onBehalfOfActorId`, invoice-item snapshot pairs
`fromAgentAmount/Rate` / `toAgentAmount/Rate` → `fromActorAmount/Rate` /
`toActorAmount/Rate`).

### 3. Update permission strings

Anything that creates or checks permissions programmatically must use
`actors.read` / `actors.write` (and `rdhy.actors.*` for the plugin) instead
of `agents.*`. Rows already in your database are rewritten by the migration.

### 4. Update domain-event subscriptions

`marketlum.agent.created|updated|deleted` are now
`marketlum.actor.created|updated|deleted`. Event payload types in
`@marketlum/shared` renamed accordingly (`AgentCreatedEvent` →
`ActorCreatedEvent`, …).

### 5. Update MCP client configuration

The MCP tool roster renamed three tools:

| Before | After |
|---|---|
| `search_agents` | `search_actors` |
| `get_agent` | `get_actor` |
| `get_agent_financials` | `get_actor_financials` |

Update any client allowlists, prompts, or saved tool references.

### 6. Update imports from `@marketlum/*` packages

All exported symbols containing `Agent`/`agent` renamed to `Actor`/`actor`,
including `actorSchema` and friends in `@marketlum/shared`
(`schemas/actor.schema`), the `Actor` entity and `ActorsModule` in
`@marketlum/core`, and the actor components/hooks/pages in `@marketlum/ui`
(`use-actors`, `actors-data-table`, `actor-form-dialog`, …). The web admin
route moved from `/admin/agents` to `/admin/actors`.
