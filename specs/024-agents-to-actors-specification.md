# 024 — Rename Agents to Actors — Specification

> Decision trail: [`024-agents-to-actors-brainstorming.md`](024-agents-to-actors-brainstorming.md) (Q1–Q12).

## 1. Overview

Rename the core `Agent` domain concept to `Actor` across every layer of Marketlum in a single PR: database schema **and stored data**, `@marketlum/shared` contracts, `@marketlum/core` backend, MCP server, `@marketlum/ui`, the web app, the `create-marketlum-app` template, seed data, and the full BDD suite. This is a **clean break** (Q2): no route redirects, no dual-emitted events, no MCP tool aliases. Historical specs 001–023 keep their original wording (Q6).

```
  DB schema ─▶ DB data ─▶ shared ─▶ core ─▶ MCP ─▶ ui ─▶ web ─▶ template ─▶ bdd ─▶ docs
  (rename     (role_      (zod,     (module, (3 tool  (~15    (routes)  (mirror)   (features, (UPGRADE.md)
   migration)  permissions  events,   routes)  names)   comps)                       step defs)
               rows)        perms)
```

**Correction vs. brainstorming Q7:** the addresses table is already named `addresses` (agent-neutral, `packages/core/src/migrations/1700000000043-AddAgentAddresses.ts` creates `CREATE TABLE "addresses"`). Only its `agentId` column and `*_addresses_agent*` index/FK names rename. The BDD directory `agent-addresses/` still renames to `actor-addresses/`.

## 2. Global naming map

Applied case-sensitively everywhere in living code and text (Q6). The codebase has no false positives for the substring "agent" (no `user-agent`, and "agreement" does not match).

| Kind | Before | After |
|---|---|---|
| TS type / class | `Agent`, `AgentsService`, `AgentsController`, `AgentsModule`, `AgentDto`… | `Actor`, `ActorsService`, `ActorsController`, `ActorsModule`, `ActorDto`… |
| TS identifiers | `agent`, `agents`, `agentId`, `fromAgentId`, `toAgentId`, `onBehalfOfAgentId`, `counterpartyAgentId`, `fromAgentAmount/Rate`, `toAgentAmount/Rate`, `functionalCurrencyId` (unchanged) | `actor`, `actors`, `actorId`, `fromActorId`, `toActorId`, `onBehalfOfActorId`, `counterpartyActorId`, `fromActorAmount/Rate`, `toActorAmount/Rate` |
| DB tables | `agents`, `agents_closure`, `agent_taxonomies` | `actors`, `actors_closure`, `actor_taxonomies` |
| DB enum type | `agent_type_enum` (values unchanged: `individual`, `organization`, `buyer`, `seller`, `broker`, `virtual`) | `actor_type_enum` |
| DB columns | `agentId` / `fromAgentId` / `toAgentId` / `onBehalfOfAgentId` / `counterpartyAgentId` / `fromAgentAmount` / `fromAgentRate` / `toAgentAmount` / `toAgentRate` on referencing tables | `actorId` / `fromActorId` / … (same pattern) |
| REST routes | `/agents`, `/agents/:id`, `/agents/:agentId/financials`, nested address routes | `/actors`, `/actors/:id`, `/actors/:actorId/financials`, same shape |
| Web routes | `/admin/agents`, `/admin/agents/map`, `/admin/agents/[id]` | `/admin/actors`, `/admin/actors/map`, `/admin/actors/[id]` |
| Permission resource | `agents` (→ `agents.read`, `agents.write`) | `actors` (→ `actors.read`, `actors.write`) |
| Domain events | `marketlum.agent.created\|updated\|deleted` | `marketlum.actor.created\|updated\|deleted` |
| MCP tools | `search_agents`, `get_agent`, `get_agent_financials` | `search_actors`, `get_actor`, `get_actor_financials` — plain rename, no "formerly agents" breadcrumbs (Q8) |
| Table-name enum | `TableName.AGENTS = 'agents'` | `TableName.ACTORS = 'actors'` |
| UI copy | "Agent", "Agents", "Sub-agents"… | "Actor", "Actors", "Sub-actors"… |

Directories and files rename accordingly (`git mv` so history follows): `packages/core/src/agents/` → `actors/`, `packages/ui/src/components/agents/` → `actors/`, `packages/bdd/features/agents/` → `actors/`, `packages/bdd/features/agent-addresses/` → `actor-addresses/`, plus every `agent*`-named file (`agent.schema.ts`, `agent-financials.controller.ts`, `use-agents.ts`, `agents-map-page.tsx`, `search-agents.tool.ts`, …).

## 3. Database migration

One hand-written migration (Q3, Q9): `packages/core/src/migrations/1700000000061-RenameAgentsToActors.ts` (use the next free timestamp at implementation time). Rename-only operations — no index rebuilds, no FK drops (Q9). Full symmetric `down()` (Q10).

### 3.1 `up()` outline

```sql
-- 1. Tables
ALTER TABLE "agents" RENAME TO "actors";
ALTER TABLE "agents_closure" RENAME TO "actors_closure";
ALTER TABLE "agent_taxonomies" RENAME TO "actor_taxonomies";

-- 2. Enum type (values unchanged)
ALTER TYPE "agent_type_enum" RENAME TO "actor_type_enum";

-- 3. Columns on referencing tables (live schema as of migration 060)
ALTER TABLE "addresses"           RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "actor_taxonomies"    RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "accounts"            RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "channels"            RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "offerings"           RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "tensions"            RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "values"              RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "agreement_templates" RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "agreement_parties"   RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "exchange_parties"    RENAME COLUMN "agentId" TO "actorId";
ALTER TABLE "exchange_flows"      RENAME COLUMN "fromAgentId" TO "fromActorId";
ALTER TABLE "exchange_flows"      RENAME COLUMN "toAgentId"   TO "toActorId";
ALTER TABLE "orders"              RENAME COLUMN "fromAgentId" TO "fromActorId";
ALTER TABLE "orders"              RENAME COLUMN "toAgentId"   TO "toActorId";
ALTER TABLE "value_instances"     RENAME COLUMN "fromAgentId" TO "fromActorId";
ALTER TABLE "value_instances"     RENAME COLUMN "toAgentId"   TO "toActorId";
ALTER TABLE "invoices"            RENAME COLUMN "fromAgentId" TO "fromActorId";
ALTER TABLE "invoices"            RENAME COLUMN "toAgentId"   TO "toActorId";
ALTER TABLE "invoices"            RENAME COLUMN "onBehalfOfAgentId"  TO "onBehalfOfActorId";
ALTER TABLE "invoices"            RENAME COLUMN "counterpartyAgentId" TO "counterpartyActorId";
ALTER TABLE "invoice_items"       RENAME COLUMN "fromAgentAmount" TO "fromActorAmount";
ALTER TABLE "invoice_items"       RENAME COLUMN "fromAgentRate"   TO "fromActorRate";
ALTER TABLE "invoice_items"       RENAME COLUMN "toAgentAmount"   TO "toActorAmount";
ALTER TABLE "invoice_items"       RENAME COLUMN "toAgentRate"     TO "toActorRate";

-- 4. Indexes & constraints: every identifier containing agent/Agent (Q9).
--    Known set: PK_agents, PK_agents_closure, PK_agent_taxonomies,
--    IDX_agents_parent, IDX_agents_search_vector, IDX_agents_functional_currency,
--    IDX_agents_closure_ancestor/descendant, IDX_agent_taxonomies_agent/taxonomy,
--    IDX_addresses_agent, IDX_addresses_agent_primary, IDX_accounts_agentId,
--    IDX_channels_agentId, IDX_offerings_agentId, IDX_agreement_templates_agent,
--    IDX_agreement_parties_agentId, IDX_exchange_parties_agentId,
--    IDX_invoices_fromAgentId/toAgentId, IDX_orders_from_agent/to_agent,
--    IDX_value_instances_fromAgentId/toAgentId,
--    FK_* mirrors of the above (incl. FK_agents_parent, FK_agents_main_taxonomy,
--    FK_agents_image, FK_agents_functional_currency, FK_agents_closure_*,
--    FK_invoices_onBehalfOfAgent, FK_exchange_flows_fromAgent/toAgent,
--    FK_tensions_agent, FK_values_agent, FK_accounts_agent, FK_channels_agent,
--    FK_offerings_agent, FK_addresses_agent, FK_agreement_parties_agent,
--    FK_exchange_parties_agent, FK_orders_from_agent/to_agent,
--    FK_value_instances_fromAgent/toAgent, FK_agreement_templates_agent),
--    UQ_invoices_fromAgent_number, UQ_exchange_parties_exchange_agent.
--    NOTE: recurring_flows/value_streams agent identifiers were already dropped
--    (migrations 053/055) and must NOT appear here.
ALTER INDEX "IDX_agents_parent" RENAME TO "IDX_actors_parent";
-- … one RENAME per identifier, agent→actor / Agent→Actor in-name …

-- 5. Search-vector trigger + function (drop/recreate under new names)
DROP TRIGGER "agents_search_vector_trigger" ON "actors";
DROP FUNCTION "agents_search_vector_update"();
CREATE FUNCTION actors_search_vector_update() RETURNS trigger AS $$ … $$;  -- same body (name A, purpose B)
CREATE TRIGGER actors_search_vector_trigger BEFORE INSERT OR UPDATE ON "actors" …;

-- 6. Stored permission data (Q4) — covers seeded and custom HRBAC roles
UPDATE "role_permissions"
SET "permission" = regexp_replace("permission", '^agents\.', 'actors.')
WHERE "permission" LIKE 'agents.%';
```

**Authoring rule:** before finalising step 4, enumerate live identifiers against a migrated database and diff against the list above (they must match exactly — a stale name in either direction is a bug):

```sql
SELECT conname FROM pg_constraint WHERE conname ~* 'agent'
UNION ALL
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname ~* 'agent';
```

The same query must return **zero rows** after `up()` — assert this manually during the pre-merge rehearsal (Q12).

### 3.2 `down()`

Exact mirror: reverse every rename, recreate the trigger/function under `agents_*` names, and `UPDATE role_permissions … '^actors\.' → 'agents.'`.

### 3.3 Explicitly untouched

- Enum **values** of `actor_type_enum`.
- The `addresses` table name.
- Historical migrations 000–060 — not edited (Q3); TypeORM entities after the rename describe the post-061 schema, which is the same situation every prior rename migration (e.g. 002-RenameAgentDescriptionToPurpose) left behind.
- `users`, `files`, and every other table with no agent-named identifiers.

## 4. `@marketlum/shared`

- `schemas/agent.schema.ts` → `schemas/actor.schema.ts`; all exported symbols rename (`actorSchema`, `createActorSchema`, `ActorType`, …). Update `index.ts` exports and every dependent schema (`invoice`, `order`, `agreement`, `exchange`, `account`, `channel`, `offering`, `tension`, `value-instance`, `address`, `search`, `dashboard`, `financials-figures`, `agreement-template`, `mcp`) for renamed fields (`fromActorId`, snapshot pairs, etc.).
- `permissions.ts`: `'agents'` → `'actors'` in `PERMISSION_RESOURCES` (list stays alphabetically ordered: `accounts, actors, agreement-templates, …`).
- `enums/table-name.enum.ts`: `AGENTS = 'agents'` → `ACTORS = 'actors'`.
- `events/domain-event.ts`: `AgentCreatedEvent` → `ActorCreatedEvent` etc., channel strings `marketlum.actor.*` (Q5).
- Rebuild before dependent packages: `pnpm --filter @marketlum/shared build` (known gotcha).

## 5. `@marketlum/core` backend

- `src/agents/` → `src/actors/` (module, controller `@Controller('actors')`, service, DTOs, entities, `addresses/` subtree). Entity: `@Entity('actors')`, closure table auto-derives `actors_closure`, `@JoinTable` for taxonomies renamed to `actor_taxonomies`, all `@JoinColumn` names → `actorId` variants. Raw SQL in `actors.service.ts` (taxonomy filter, financials queries) updated to new table/column names.
- `src/invoices/agent-financials.controller.ts` → `actor-financials.controller.ts`, `@Controller('actors/:actorId')`.
- `src/events/primary-entities.ts`: `{ cls: Actor, snakeName: 'actor' }`.
- Every other module referencing the entity or its FK columns (invoices, orders, agreements, exchanges, ledger/accounts, channels, offerings, tensions, values, value-instances, search, dashboard, export, files) — mechanical sweep.
- `entities.ts`, `marketlum-core.module.ts`, `index.ts` registrations.
- Guards/permission checks resolve resource `actors` via route prefix — no logic change, but the HRBAC catalog drift test must pass against the renamed controller routes.

## 6. MCP server

- `src/mcp/tools/`: `search-agents.tool.ts` → `search-actors.tool.ts`, `get-agent.tool.ts` → `get-actor.tool.ts`, `get-agent-financials.tool.ts` → `get-actor-financials.tool.ts`. Tool names `search_actors`, `get_actor`, `get_actor_financials`; descriptions rewritten in actor vocabulary with **no** "formerly agents" mentions (Q8).
- `packages/shared/src/schemas/mcp.schema.ts` input/output schemas renamed accordingly.
- Tool-level drift guard and REST-equality tests updated to the new roster (still 11 tools).

## 7. `@marketlum/ui`

- `src/components/agents/` → `src/components/actors/`; every component file and export renames (`actors-data-table`, `actor-form-dialog`, `actor-tree-view`, `actor-type-badge`, `actor-financials-tab`, `sub-actors-table`, `actors-map`, …).
- `src/hooks/use-agents.ts` → `use-actors.ts`; fetch paths `/api/actors…`.
- `src/pages/admin/agents-page.tsx`, `agent-detail-page.tsx`, `agents-map-page.tsx` → actor equivalents.
- All user-visible copy: "Actors" nav item, page titles, form labels, empty states, "Sub-actors", map legend. HRBAC UI (`PermissionsProvider` / `Can`) gates on resource `actors`.

## 8. Web app + template sync

- `apps/web/src/app/admin/agents/` → `admin/actors/` (thin re-exports of the `@marketlum/ui` pages; `map/` and `[id]/` included). Nav/sidebar links → `/admin/actors`.
- **Template sync (CLAUDE.md rule):** mirror the identical route rename under `packages/create-marketlum-app/template/web/src/app/admin/agents/` → `admin/actors/`. Verify no other template file (config, module registration) references agents.
- Route drift guard must pass with the renamed routes.

## 9. Seed data

- `seed-sample.command.ts` (and any fixtures): identifiers and sample naming move to actor vocabulary. Seeded role permissions come from `PERMISSION_RESOURCES`, so `actors.read|write` flows automatically; the migration handles pre-existing rows.

## 10. BDD coverage

No scenario count change — this is a rename, not new behavior. The suite is the primary proof the rename is complete.

- `packages/bdd/features/agents/` (13 features) → `features/actors/`; `features/agent-addresses/` (6 features) → `features/actor-addresses/`. File names and all Gherkin prose move to actor vocabulary (`create-actor.feature`, `actor-hierarchy.feature`, `cascade-delete-on-actor.feature`, …).
- `apps/api/test/`: step definitions updated (feature paths, route URLs, permission strings, event channel assertions in `actor-events` steps, MCP tool names in `features/mcp/` steps).
- Cross-cutting features referencing agents in prose (invoices, orders, dashboard, search, roles, exchanges, …) swept as well (Q6).
- Drift guards double as rename guards: HRBAC catalog drift, route drift, MCP tool drift must all be green.

## 11. `UPGRADE.md` (new, repo root)

Standing breaking-changes document (Q11), first entry "spec 024":

1. Run `pnpm migration:run` (renames schema + rewrites `role_permissions` rows).
2. Sweep your app code for `/agents` REST calls → `/actors`.
3. Update custom-role tooling / API clients using `agents.read|write` permission strings.
4. Update plugin subscriptions from `marketlum.agent.*` → `marketlum.actor.*`.
5. Update MCP client configs: `search_agents` → `search_actors`, `get_agent` → `get_actor`, `get_agent_financials` → `get_actor_financials`.
6. Update imports of renamed `@marketlum/shared` / `@marketlum/ui` / `@marketlum/core` exports.

## 12. Out of scope

- Compatibility aliases of any kind — routes, events, MCP tools (Q2, Q8).
- Rewriting migrations 000–060 or historical specs 001–023 (Q3, Q6).
- Renaming `agent_type_enum` **values** or the `addresses` table (they carry no agent naming — §1 correction, §3.3).
- Any behavior change; feature work rides in later PRs.

## 13. Delivery plan (single PR, layered commits)

1. **Migration** — `RenameAgentsToActors` with `up()`/`down()` per §3.
2. **Shared** — schemas, permissions, table enum, events; rebuild.
3. **Core** — module rename, controllers, entities, raw SQL, primary-entities, MCP tools.
4. **UI** — components, hooks, pages, copy.
5. **Web + template** — route dirs in `apps/web` and the template mirror.
6. **BDD** — feature dirs/files (`git mv`), prose, step definitions.
7. **Docs** — `UPGRADE.md`, README touch-ups, memory/CLAUDE.md references if any.

**Verification (Q12):** in-conversation — `pnpm --filter` builds (`shared`, `core`, `ui`), API `tsc`, `next build`, plus targeted suites: `actors`, `actor-addresses`, `mcp`, `roles` (drift guards). Pre-merge — the maintainer runs the full `pnpm test:e2e` (912+ tests, `--runInBand` where required) and rehearses `migration:run` + the §3.1 zero-rows catalog assertion (and optionally `migration:revert`) against a copy of a live database.
