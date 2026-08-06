# Upgrade Notes

Breaking changes between Marketlum releases, newest first. Each section lists
what an existing scaffolded project must do after updating its `@marketlum/*`
dependencies.

## Unreleased — ActorValuesTable removed from @marketlum/ui

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
